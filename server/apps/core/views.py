import os
import glob
import subprocess
import shutil
import tempfile
import zipfile
import json
import uuid
from datetime import datetime
from django.conf import settings
from django.db import models, transaction, connections, connection
from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
import boto3
from botocore.exceptions import ClientError

from .models import BackupSettings, BackupLog
from apps.items.models import Item, Tag, ItemTag
from django.contrib.auth import get_user_model

User = get_user_model()


class HealthCheckView(APIView):
    """
    Health check endpoint - no authentication required.
    Returns 200 OK if the service is healthy.
    """
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request) -> Response:
        # Check database connection
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as e:
            return Response(
                {"status": "unhealthy", "database": "unavailable", "error": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            "status": "healthy",
            "service": "keepr-backend",
            "database": "connected",
            "version": "1.0.0"
        })


class BackupSettingsSerializer(serializers.ModelSerializer):
    # Never return the secret key in API responses
    s3_secret_key = serializers.SerializerMethodField()

    def get_s3_secret_key(self, obj):
        return "********" if obj.s3_secret_key else ""

    class Meta:
        model = BackupSettings
        fields = [
            "interval_hours",
            "backup_on_new_item",
            "local_backup_enabled",
            "s3_enabled",
            "s3_bucket_name",
            "s3_access_key",
            "s3_secret_key",
            "s3_region",
            "s3_endpoint",
            "last_backup_at",
            "last_item_count",
        ]


class BackupLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupLog
        fields = ["status", "message", "items_backed_up", "files_backed_up", "created_at"]


class BackupSettingsView(APIView):
    def get(self, request: Request) -> Response:
        # Only staff can view backup settings
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Backup settings are managed by administrators only."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        settings_obj, _ = BackupSettings.objects.get_or_create(user=request.user)
        serializer = BackupSettingsSerializer(settings_obj)
        return Response({"data": {"settings": serializer.data}})

    def put(self, request: Request) -> Response:
        # Only staff can modify backup settings
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Backup settings are managed by administrators only."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        settings_obj, _ = BackupSettings.objects.get_or_create(user=request.user)

        data = request.data
        settings_obj.interval_hours = data.get("interval_hours", settings_obj.interval_hours)
        settings_obj.backup_on_new_item = data.get("backup_on_new_item", settings_obj.backup_on_new_item)
        settings_obj.local_backup_enabled = data.get("local_backup_enabled", settings_obj.local_backup_enabled)
        settings_obj.s3_enabled = data.get("s3_enabled", settings_obj.s3_enabled)
        settings_obj.s3_bucket_name = data.get("s3_bucket_name", "")
        settings_obj.s3_access_key = data.get("s3_access_key", "")

        # Only update secret key if a new value is provided (not the masked placeholder)
        secret_key = data.get("s3_secret_key", "")
        if secret_key and secret_key != "********":
            settings_obj.s3_secret_key = secret_key

        settings_obj.s3_region = data.get("s3_region", "us-east-1")
        settings_obj.s3_endpoint = data.get("s3_endpoint", "")

        settings_obj.save()
        serializer = BackupSettingsSerializer(settings_obj)
        return Response({"data": {"settings": serializer.data}})


class BackupLogsView(APIView):
    def get(self, request: Request) -> Response:
        # Only staff can view backup logs
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Backup logs are managed by administrators only."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        logs = request.user.backup_logs.all()[:20]
        serializer = BackupLogSerializer(logs, many=True)
        return Response({"data": {"logs": serializer.data}})


class ManualBackupView(APIView):
    def post(self, request: Request) -> Response:
        # Only staff can trigger manual backup
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Manual backup is managed by administrators only."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        settings_obj, _ = BackupSettings.objects.get_or_create(user=request.user)

        # Check if at least one backup option is enabled
        if not settings_obj.local_backup_enabled and not settings_obj.s3_enabled:
            return Response(
                {"error": {"code": "BACKUP_NOT_CONFIGURED", "message": "No backup option is enabled. Enable local or S3 backup."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if local backup is enabled but LOCAL_BACKUP_DIR is not configured
        if settings_obj.local_backup_enabled:
            local_backup_dir = getattr(settings, "LOCAL_BACKUP_DIR", None)
            if not local_backup_dir:
                return Response(
                    {"error": {"code": "LOCAL_BACKUP_NOT_CONFIGURED", "message": "Local backup is enabled but LOCAL_BACKUP_DIR is not configured on the server."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            result = self._perform_backup(request.user, settings_obj)
            return Response({"data": result})
        except Exception as e:
            BackupLog.objects.create(
                user=request.user,
                status="failed",
                message=str(e),
            )
            return Response(
                {"error": {"code": "BACKUP_FAILED", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _perform_backup(self, user, settings_obj):
        from apps.items.models import Item
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Determine if this is a full (admin) backup or single-user backup
        is_full_backup = user.is_staff or user.is_superuser

        # Check if backup is needed
        if is_full_backup:
            item_count = Item.objects.count()
        else:
            item_count = Item.objects.filter(user=user).count()

        if settings_obj.backup_on_new_item and item_count <= settings_obj.last_item_count:
            BackupLog.objects.create(
                user=user,
                status="skipped",
                message="No new items since last backup",
                items_backed_up=item_count,
            )
            return {"status": "skipped", "message": "No new items to backup"}

        # Create temporary backup file
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            backup_path = tmp_file.name

        try:
            with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                # Backup database
                db_backend = settings.DATABASES["default"]["ENGINE"]
                items_count = 0
                files_count = 0

                if "postgresql" in db_backend:
                    # PostgreSQL dump
                    db_config = settings.DATABASES["default"]
                    dump_cmd = [
                        "pg_dump",
                        f"--host={db_config['HOST']}",
                        f"--port={db_config['PORT']}",
                        f"--username={db_config['USER']}",
                        db_config["NAME"],
                    ]
                    env = os.environ.copy()
                    env["PGPASSWORD"] = db_config["PASSWORD"]

                    result = subprocess.run(
                        dump_cmd, env=env, capture_output=True, text=True, check=True
                    )
                    zipf.writestr("database.sql", result.stdout)
                else:
                    # SQLite - copy the db file
                    db_path = settings.DATABASES["default"]["NAME"]
                    if os.path.exists(db_path):
                        zipf.write(db_path, "database.sqlite3")

                # Get item count for logging
                items_count = item_count

                # Backup uploaded files
                media_root = settings.MEDIA_ROOT

                if is_full_backup:
                    # Admin backup: backup all users' media files
                    if os.path.exists(media_root):
                        for root, dirs, files in os.walk(media_root):
                            for file in files:
                                file_path = os.path.join(root, file)
                                arcname = os.path.join("media", os.path.relpath(file_path, media_root))
                                zipf.write(file_path, arcname)
                                files_count += 1
                else:
                    # Regular user backup: only backup own files
                    user_media_dir = os.path.join(media_root, str(user.id))
                    if os.path.exists(user_media_dir):
                        for root, dirs, files in os.walk(user_media_dir):
                            for file in files:
                                file_path = os.path.join(root, file)
                                arcname = os.path.join("media", str(user.id), os.path.relpath(file_path, user_media_dir))
                                zipf.write(file_path, arcname)
                                files_count += 1

            # Perform backups
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_locations = []

            # Local backup
            if settings_obj.local_backup_enabled:
                local_backup_dir = getattr(settings, "LOCAL_BACKUP_DIR", None)
                if local_backup_dir:
                    os.makedirs(local_backup_dir, exist_ok=True)
                    backup_prefix = "full_backup" if is_full_backup else str(user.id)
                    local_backup_path = os.path.join(local_backup_dir, f"backup_{backup_prefix}_{timestamp}.zip")
                    shutil.copy2(backup_path, local_backup_path)
                    backup_locations.append("local")
                    # Clean up old local backups (keep last 6)
                    self._cleanup_old_local_backups(local_backup_dir, backup_prefix)

            # S3 backup
            if settings_obj.s3_enabled:
                s3_prefix = "full_backups" if is_full_backup else str(user.id)
                s3_key = f"keepr_backups/{s3_prefix}/backup_{timestamp}.zip"
                self._upload_to_s3(settings_obj, backup_path, s3_key)
                backup_locations.append("S3")

            # Update settings
            settings_obj.last_backup_at = timezone.now()
            settings_obj.last_item_count = item_count
            settings_obj.save()

            # Create log with location info
            location_str = " and ".join(backup_locations)
            backup_type = "Full" if is_full_backup else "Personal"
            BackupLog.objects.create(
                user=user,
                status="success",
                message=f"{backup_type} backup completed successfully ({location_str})",
                items_backed_up=items_count,
                files_backed_up=files_count,
            )

            return {
                "status": "success",
                "message": f"{backup_type} backup completed successfully ({location_str})",
                "items_backed_up": items_count,
                "files_backed_up": files_count,
                "backup_locations": backup_locations,
                "backup_type": "full" if is_full_backup else "personal",
            }

        finally:
            # Clean up temp file
            if os.path.exists(backup_path):
                os.remove(backup_path)

    def _cleanup_old_local_backups(self, backup_dir, backup_prefix, keep_count=6):
        """Keep only the last N backups, delete oldest ones."""
        pattern = os.path.join(backup_dir, f"backup_{backup_prefix}_*.zip")
        backup_files = glob.glob(pattern) if glob else []

        if len(backup_files) <= keep_count:
            return

        # Sort by modification time (oldest first)
        backup_files.sort(key=lambda x: os.path.getmtime(x))

        # Delete oldest files
        files_to_delete = backup_files[:-keep_count]
        for file_path in files_to_delete:
            try:
                os.remove(file_path)
            except OSError:
                pass

    def _upload_to_s3(self, settings_obj, file_path, s3_key):
        s3_client = boto3.client(
            "s3",
            region_name=settings_obj.s3_region,
            endpoint_url=settings_obj.s3_endpoint or None,
            aws_access_key_id=settings_obj.s3_access_key,
            aws_secret_access_key=settings_obj.s3_secret_key,
        )

        try:
            s3_client.upload_file(file_path, settings_obj.s3_bucket_name, s3_key)
        except ClientError as e:
            raise Exception(f"S3 upload failed: {e}")


class TestS3ConnectionView(APIView):
    def post(self, request: Request) -> Response:
        # Only staff can test S3 connection
        if not request.user.is_staff:
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "S3 connection testing is managed by administrators only."}},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Use provided credentials from request body, or fall back to saved settings
        bucket_name = request.data.get("s3_bucket_name")
        access_key = request.data.get("s3_access_key")
        secret_key = request.data.get("s3_secret_key")
        region = request.data.get("s3_region")
        endpoint = request.data.get("s3_endpoint")

        # Fall back to saved settings if not provided
        if not bucket_name or not access_key or not secret_key:
            settings_obj, _ = BackupSettings.objects.get_or_create(user=request.user)
            bucket_name = bucket_name or settings_obj.s3_bucket_name
            access_key = access_key or settings_obj.s3_access_key
            secret_key = secret_key or settings_obj.s3_secret_key
            region = region or settings_obj.s3_region
            endpoint = endpoint or settings_obj.s3_endpoint

        if not bucket_name or not access_key or not secret_key:
            return Response(
                {"error": {"code": "INCOMPLETE_S3_SETTINGS", "message": "S3 settings are incomplete"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            s3_client = boto3.client(
                "s3",
                region_name=region or "us-east-1",
                endpoint_url=endpoint or None,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
            )

            # Test connection by checking bucket exists
            s3_client.head_bucket(Bucket=bucket_name)

            return Response({"data": {"message": "S3 connection successful"}})
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code == "404":
                return Response(
                    {"error": {"code": "BUCKET_NOT_FOUND", "message": "S3 bucket not found"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"error": {"code": "S3_CONNECTION_FAILED", "message": str(e)}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": {"code": "S3_CONNECTION_FAILED", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExportDataView(APIView):
    """
    Export user's own data as a downloadable ZIP file.
    Includes user's items, tags, and associated media files.
    """

    def post(self, request: Request) -> HttpResponse:
        user = request.user

        # Create temporary file for the ZIP
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            zip_path = tmp_file.name

        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
                # Export user's items as JSON
                items = Item.objects.filter(user=user)
                items_data = []
                for item in items:
                    # Get tags through ItemTag relationship
                    item_tags = [
                        {"id": str(item_tag.tag.id), "name": item_tag.tag.name, "color": item_tag.tag.color}
                        for item_tag in item.item_tags.all()
                    ]
                    item_data = {
                        "id": str(item.id),
                        "type": item.type,
                        "title": item.title or "",
                        "content": item.content or "",
                        "file_name": item.file_name or "",
                        "file_size": item.file_size or 0,
                        "file_mimetype": item.file_mimetype or "",
                        "created_at": item.created_at.isoformat(),
                        "updated_at": item.updated_at.isoformat(),
                        "tags": item_tags,
                    }
                    items_data.append(item_data)

                zipf.writestr("items.json", json.dumps(items_data, indent=2))

                # Export user's tags as JSON
                tags = Tag.objects.filter(user=user)
                tags_data = [
                    {
                        "id": str(tag.id),
                        "name": tag.name,
                        "color": tag.color,
                    }
                    for tag in tags
                ]
                zipf.writestr("tags.json", json.dumps(tags_data, indent=2))

                # Export user's media files
                media_root = settings.MEDIA_ROOT
                user_media_dir = os.path.join(media_root, str(user.id))

                if os.path.exists(user_media_dir):
                    for root, dirs, files in os.walk(user_media_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.join("media", os.path.relpath(file_path, media_root))
                            zipf.write(file_path, arcname)

                # Export user metadata
                user_metadata = {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "exported_at": timezone.now().isoformat(),
                    "items_count": items.count(),
                    "tags_count": tags.count(),
                }
                zipf.writestr("metadata.json", json.dumps(user_metadata, indent=2))

            # Read the ZIP file and return as downloadable response
            with open(zip_path, "rb") as f:
                zip_data = f.read()

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            response = HttpResponse(
                zip_data,
                content_type="application/zip",
                headers={
                    "Content-Disposition": f'attachment; filename="keepr_export_{user.username}_{timestamp}.zip"'
                },
            )
            return response

        except Exception as e:
            return Response(
                {"error": {"code": "EXPORT_FAILED", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            # Clean up temp file
            if os.path.exists(zip_path):
                os.remove(zip_path)


class ImportDataView(APIView):
    """
    Import user's data from a previously exported ZIP file.
    Regular users can only import their own personal data.
    Staff/superuser can import full backups (all users' data).
    """

    def post(self, request: Request) -> Response:
        user = request.user
        # FormData sends strings, so we need to convert properly
        full_import_val = request.data.get("full_import", "false")
        is_full_import = str(full_import_val).lower() in ("true", "1", "yes")

        # Check for explicit confirmation for full import
        if is_full_import:
            confirmed = request.data.get("confirmed", "false")
            if str(confirmed).lower() not in ("true", "1", "yes"):
                return Response({
                    "error": {
                        "code": "CONFIRMATION_REQUIRED",
                        "message": "Full backup import is a dangerous operation. All current data will be replaced with the backup data. You will need to log in again after import. Please confirm by sending confirmed=true."
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        # Only staff/superuser can perform full imports
        if is_full_import and not (user.is_staff or user.is_superuser):
            return Response(
                {"error": {"code": "PERMISSION_DENIED", "message": "Full backup import is only available to administrators."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if file was uploaded
        if "file" not in request.FILES:
            return Response(
                {"error": {"code": "NO_FILE", "message": "No backup file provided."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES["file"]

        # Validate file is a ZIP
        if not uploaded_file.name.endswith(".zip"):
            return Response(
                {"error": {"code": "INVALID_FILE", "message": "Backup file must be a ZIP archive."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create temp file to process the ZIP
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
            for chunk in uploaded_file.chunks():
                tmp_file.write(chunk)
            zip_path = tmp_file.name

        try:
            with zipfile.ZipFile(zip_path, "r") as zipf:
                # Check for required files
                file_list = zipf.namelist()

                # Validate ZIP structure based on import type
                if is_full_import:
                    # Full backup should have database dump
                    has_db = "database.sql" in file_list or "database.sqlite3" in file_list
                    if not has_db:
                        return Response(
                            {"error": {"code": "INVALID_BACKUP", "message": "Full backup must contain database dump."}},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return self._import_full_backup(zipf, file_list, user)
                else:
                    # Personal import should have items.json
                    if "items.json" not in file_list:
                        return Response(
                            {"error": {"code": "INVALID_BACKUP", "message": "Personal backup must contain items.json."}},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return self._import_personal_data(zipf, file_list, user)

        except zipfile.BadZipFile:
            return Response(
                {"error": {"code": "INVALID_ZIP", "message": "The uploaded file is not a valid ZIP archive."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": {"code": "IMPORT_FAILED", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        finally:
            # Clean up temp file
            if os.path.exists(zip_path):
                os.remove(zip_path)

    def _import_personal_data(self, zipf: zipfile.ZipFile, file_list: list[str], user: User) -> Response:
        """Import user's personal data from exported ZIP."""
        import_summary = {"items_imported": 0, "tags_imported": 0, "files_imported": 0, "errors": []}

        try:
            with transaction.atomic():
                # Read and import tags first (items reference tags)
                if "tags.json" in file_list:
                    tags_json = zipf.read("tags.json").decode("utf-8")
                    tags_data = json.loads(tags_json)

                    # Create a mapping of old tag IDs to new tag IDs
                    tag_id_map = {}

                    for tag_data in tags_data:
                        # Check if tag with same name already exists for this user
                        existing_tag = Tag.objects.filter(user=user, name=tag_data["name"]).first()
                        if existing_tag:
                            tag_id_map[tag_data["id"]] = str(existing_tag.id)
                        else:
                            # Create new tag
                            new_tag = Tag.objects.create(
                                user=user,
                                name=tag_data["name"],
                                color=tag_data["color"],
                            )
                            tag_id_map[tag_data["id"]] = str(new_tag.id)
                            import_summary["tags_imported"] += 1

                # Read and import items
                items_json = zipf.read("items.json").decode("utf-8")
                items_data = json.loads(items_json)

                for item_data in items_data:
                    try:
                        # Create new item
                        new_item = Item.objects.create(
                            user=user,
                            type=item_data["type"],
                            title=item_data.get("title", ""),
                            content=item_data.get("content", ""),
                            file_name=item_data.get("file_name", ""),
                            file_size=item_data.get("file_size"),
                            file_mimetype=item_data.get("file_mimetype", ""),
                            # Preserve original timestamps if available
                            created_at=item_data.get("created_at", timezone.now()),
                            updated_at=item_data.get("updated_at", timezone.now()),
                        )

                        # Handle file if present
                        if item_data.get("file_name") and new_item.file_name:
                            # Find the file in the ZIP - could be in a subfolder
                            # Export structure: media/{user_id}/subfolder/filename
                            # We need to find any path that ends with the filename
                            filename = item_data["file_name"]
                            matching_path = None
                            for path in file_list:
                                if path.startswith(f"media/") and path.endswith(filename):
                                    matching_path = path
                                    break

                            if matching_path:
                                # Extract file to media directory
                                user_media_dir = os.path.join(settings.MEDIA_ROOT, str(user.id))
                                os.makedirs(user_media_dir, exist_ok=True)

                                file_path = os.path.join(user_media_dir, filename)
                                with open(file_path, "wb") as f:
                                    f.write(zipf.read(matching_path))

                                new_item.file_path = file_path
                                new_item.save()
                                import_summary["files_imported"] += 1

                        # Import tags
                        if "tags" in item_data and item_data["tags"]:
                            for tag_ref in item_data["tags"]:
                                old_tag_id = tag_ref["id"]
                                if old_tag_id in tag_id_map:
                                    new_tag_id = tag_id_map[old_tag_id]
                                    try:
                                        tag = Tag.objects.get(id=new_tag_id, user=user)
                                        ItemTag.objects.create(item=new_item, tag=tag)
                                    except Tag.DoesNotExist:
                                        pass  # Skip if tag doesn't exist

                        import_summary["items_imported"] += 1

                    except Exception as e:
                        import_summary["errors"].append(f"Failed to import item {item_data.get('id', 'unknown')}: {str(e)}")

            return Response({
                "data": {
                    "message": "Data imported successfully",
                    "summary": import_summary,
                }
            })

        except Exception as e:
            raise Exception(f"Failed to import personal data: {str(e)}")

    def _import_full_backup(self, zipf: zipfile.ZipFile, file_list: list[str], user: User) -> Response:
        """Import full backup from admin backup ZIP - restores database dump and media files."""
        import_summary = {"files_imported": 0, "database_restored": False, "errors": [], "pre_import_backup": None}

        # First, create a backup of current data before proceeding
        try:
            # Create backup in temp first
            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp_file:
                temp_backup_path = tmp_file.name

            with zipfile.ZipFile(temp_backup_path, "w", zipfile.ZIP_DEFLATED) as zipf_backup:
                # Backup database
                db_backend = settings.DATABASES["default"]["ENGINE"]

                if "postgresql" in db_backend:
                    db_config = settings.DATABASES["default"]
                    dump_cmd = [
                        "pg_dump",
                        f"--host={db_config['HOST']}",
                        f"--port={db_config['PORT']}",
                        f"--username={db_config['USER']}",
                        db_config["NAME"],
                    ]
                    env = os.environ.copy()
                    env["PGPASSWORD"] = db_config["PASSWORD"]

                    result = subprocess.run(dump_cmd, env=env, capture_output=True, text=True, check=True)
                    zipf_backup.writestr("database.sql", result.stdout)
                else:
                    db_path = settings.DATABASES["default"]["NAME"]
                    if os.path.exists(db_path):
                        zipf_backup.write(db_path, "database.sqlite3")

                # Backup media files
                media_root = settings.MEDIA_ROOT
                if os.path.exists(media_root):
                    for root, dirs, files in os.walk(media_root):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.join("media", os.path.relpath(file_path, media_root))
                            zipf_backup.write(file_path, arcname)

            # Move to local backup directory if configured
            local_backup_dir = getattr(settings, "LOCAL_BACKUP_DIR", None)
            if local_backup_dir:
                os.makedirs(local_backup_dir, exist_ok=True)
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                final_backup_path = os.path.join(local_backup_dir, f"pre_import_restore_{timestamp}.zip")
                shutil.move(temp_backup_path, final_backup_path)
                import_summary["pre_import_backup"] = final_backup_path
            else:
                # Keep in temp if no backup dir configured
                import_summary["pre_import_backup"] = temp_backup_path

        except Exception as e:
            # If backup fails, warn but don't stop the import
            import_summary["errors"].append(f"Pre-import backup failed (continuing anyway): {str(e)}")

        try:
            # First, extract media files
            media_root = settings.MEDIA_ROOT
            os.makedirs(media_root, exist_ok=True)

            for file_path in file_list:
                if file_path.startswith("media/"):
                    # Extract to media directory
                    full_path = os.path.join(media_root, os.path.relpath(file_path, "media/"))
                    dir_path = os.path.dirname(full_path)
                    os.makedirs(dir_path, exist_ok=True)

                    with open(full_path, "wb") as f:
                        f.write(zipf.read(file_path))
                    import_summary["files_imported"] += 1

            # Restore database from dump
            db_backend = settings.DATABASES["default"]["ENGINE"]

            if "postgresql" in db_backend and "database.sql" in file_list:
                # PostgreSQL restore
                db_config = settings.DATABASES["default"]

                # Extract SQL to temp file
                with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as tmp_sql:
                    tmp_sql.write(zipf.read("database.sql").decode("utf-8"))
                    sql_path = tmp_sql.name

                try:
                    # Close Django connections before database operations
                    connections.close_all()

                    # First, terminate all connections to the database
                    terminate_cmd = [
                        "psql",
                        f"--host={db_config['HOST']}",
                        f"--port={db_config['PORT']}",
                        f"--username={db_config['USER']}",
                        "postgres",
                        "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_config['NAME']}' AND pid <> pg_backend_pid();",
                    ]
                    env = os.environ.copy()
                    env["PGPASSWORD"] = db_config["PASSWORD"]

                    subprocess.run(terminate_cmd, env=env, capture_output=True, check=False)

                    # Drop and recreate database
                    drop_cmd = [
                        "psql",
                        f"--host={db_config['HOST']}",
                        f"--port={db_config['PORT']}",
                        f"--username={db_config['USER']}",
                        "postgres",
                        "-c", f"DROP DATABASE IF EXISTS {db_config['NAME']};",
                        "-c", f"CREATE DATABASE {db_config['NAME']};",
                    ]

                    # Drop and recreate
                    subprocess.run(drop_cmd, env=env, capture_output=True, check=True)

                    # Restore the database
                    restore_cmd = [
                        "psql",
                        f"--host={db_config['HOST']}",
                        f"--port={db_config['PORT']}",
                        f"--username={db_config['USER']}",
                        db_config["NAME"],
                    ]

                    with open(sql_path, "r") as sql_file:
                        result = subprocess.run(
                            restore_cmd, env=env, stdin=sql_file, capture_output=True, text=True
                        )

                    if result.returncode != 0:
                        raise Exception(f"Database restore failed: {result.stderr}")

                    import_summary["database_restored"] = True

                finally:
                    if os.path.exists(sql_path):
                        os.remove(sql_path)

            elif "database.sqlite3" in file_list:
                # SQLite restore
                db_path = settings.DATABASES["default"]["NAME"]
                db_dir = os.path.dirname(db_path)
                os.makedirs(db_dir, exist_ok=True)

                # Remove existing database
                if os.path.exists(db_path):
                    os.remove(db_path)

                # Extract and restore
                with open(db_path, "wb") as f:
                    f.write(zipf.read("database.sqlite3"))

                import_summary["database_restored"] = True
            else:
                return Response(
                    {"error": {"code": "INVALID_BACKUP", "message": "Full backup must contain database.sql or database.sqlite3"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Count restored items
            items_count = Item.objects.count()
            tags_count = Tag.objects.count()
            users_count = User.objects.count()

            return Response({
                "data": {
                    "message": f"Full backup restored successfully. Database and {import_summary['files_imported']} media files imported.",
                    "summary": {
                        **import_summary,
                        "items_count": items_count,
                        "tags_count": tags_count,
                        "users_count": users_count,
                    },
                }
            })

        except subprocess.CalledProcessError as e:
            return Response(
                {"error": {"code": "DB_RESTORE_FAILED", "message": f"Database restore failed: {e.stderr if hasattr(e, 'stderr') else str(e)}"}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            raise Exception(f"Failed to import full backup: {str(e)}")

    def _get_or_create_user(self, old_user_id: str):
        """
        Get existing user by ID or create a placeholder user.
        In production, you might want to handle this differently.
        """
        try:
            return User.objects.get(id=old_user_id)
        except User.DoesNotExist:
            # Create a placeholder user with the old ID
            # In production, you might want to notify admin about this
            return User.objects.create(
                id=uuid.UUID(old_user_id) if len(old_user_id.replace("-", "")) == 32 else uuid.uuid4(),
                username=f"imported_user_{old_user_id[:8]}",
                email=f"imported_{old_user_id[:8]}@placeholder.local",
                email_verified=False,
            )
