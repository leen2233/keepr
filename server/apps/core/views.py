import os
import glob
import subprocess
import shutil
import tempfile
import zipfile
from datetime import datetime
from django.conf import settings
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
import boto3
from botocore.exceptions import ClientError

from .models import BackupSettings, BackupLog
from apps.items.models import Item


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
        settings_obj, _ = BackupSettings.objects.get_or_create(user=request.user)
        serializer = BackupSettingsSerializer(settings_obj)
        return Response({"data": {"settings": serializer.data}})

    def put(self, request: Request) -> Response:
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
        logs = request.user.backup_logs.all()[:20]
        serializer = BackupLogSerializer(logs, many=True)
        return Response({"data": {"logs": serializer.data}})


class ManualBackupView(APIView):
    def post(self, request: Request) -> Response:
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

        # Check if backup is needed
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
                items_count = Item.objects.filter(user=user).count()

                # Backup uploaded files
                media_root = settings.MEDIA_ROOT
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
                    local_backup_path = os.path.join(local_backup_dir, f"backup_{user.id}_{timestamp}.zip")
                    shutil.copy2(backup_path, local_backup_path)
                    backup_locations.append("local")
                    # Clean up old local backups (keep last 6)
                    self._cleanup_old_local_backups(local_backup_dir, user.id)

            # S3 backup
            if settings_obj.s3_enabled:
                s3_key = f"keepr_backups/{user.id}/backup_{timestamp}.zip"
                self._upload_to_s3(settings_obj, backup_path, s3_key)
                backup_locations.append("S3")

            # Update settings
            settings_obj.last_backup_at = timezone.now()
            settings_obj.last_item_count = item_count
            settings_obj.save()

            # Create log with location info
            location_str = " and ".join(backup_locations)
            BackupLog.objects.create(
                user=user,
                status="success",
                message=f"Backup completed successfully ({location_str})",
                items_backed_up=items_count,
                files_backed_up=files_count,
            )

            return {
                "status": "success",
                "message": f"Backup completed successfully ({location_str})",
                "items_backed_up": items_count,
                "files_backed_up": files_count,
                "backup_locations": backup_locations,
            }

        finally:
            # Clean up temp file
            if os.path.exists(backup_path):
                os.remove(backup_path)

    def _cleanup_old_local_backups(self, backup_dir, user_id, keep_count=6):
        """Keep only the last N backups, delete oldest ones."""
        pattern = os.path.join(backup_dir, f"backup_{user_id}_*.zip")
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
