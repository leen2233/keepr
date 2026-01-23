import os
import uuid
import json
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.http import FileResponse, HttpResponse
from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from .models import Item, ItemType, Tag, ItemTag, SharedItem

User = get_user_model()


class ItemListView(APIView):
    def get(self, request: Request) -> Response:
        items = Item.objects.filter(user=request.user).select_related("user").prefetch_related("item_tags__tag")

        tag_ids = request.query_params.getlist("tag")
        if tag_ids:
            items = items.filter(item_tags__tag_id__in=tag_ids).distinct()

        item_type = request.query_params.get("type")
        if item_type:
            items = items.filter(type=item_type)

        search_query = request.query_params.get("q", "").strip()
        if search_query:
            items = items.filter(
                Q(title__icontains=search_query) |
                Q(file_name__icontains=search_query) |
                Q(content__icontains=search_query)
            )

        items_data = []
        for item in items:
            tags = [it.tag for it in item.item_tags.all()]
            item_data = {
                "id": str(item.id),
                "type": item.type,
                "title": item.title,
                "file_name": item.file_name,
                "file_size": item.file_size,
                "file_mimetype": item.file_mimetype,
                "is_pinned": item.is_pinned,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat(),
                "tags": [{"id": str(t.id), "name": t.name, "color": t.color} for t in tags],
            }
            # Include content for text and login items
            if item.content and item.type in (ItemType.TEXT, ItemType.LOGIN):
                if item.type == ItemType.LOGIN:
                    item_data["content"] = json.loads(item.content)
                else:
                    item_data["content"] = item.content
            items_data.append(item_data)

        return Response({"data": {"items": items_data}})

    def post(self, request: Request) -> Response:
        item_type = request.data.get("type")

        if item_type not in ItemType.values:
            return Response(
                {"error": {"code": "INVALID_TYPE", "message": f"Invalid item type. Must be one of: {', '.join(ItemType.values)}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        title = request.data.get("title", "").strip() or None
        content = request.data.get("content", "")

        if item_type == ItemType.TEXT:
            if len(content.encode("utf-8")) > settings.MAX_TEXT_SIZE:
                return Response(
                    {"error": {"code": "CONTENT_TOO_LARGE", "message": f"Text content exceeds {settings.MAX_TEXT_SIZE} bytes"}},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

        item = Item.objects.create(
            user=request.user,
            type=item_type,
            title=title,
            content=content if item_type in (ItemType.TEXT, ItemType.LOGIN) else None,
        )

        tag_ids = request.data.getlist("tag_ids")
        if tag_ids:
            for tag_id in tag_ids:
                try:
                    tag = Tag.objects.get(id=tag_id, user=request.user)
                    ItemTag.objects.create(item=item, tag=tag)
                except Tag.DoesNotExist:
                    pass

        return Response(
            {
                "data": {
                    "item": {
                        "id": str(item.id),
                        "type": item.type,
                        "title": item.title,
                        "created_at": item.created_at.isoformat(),
                    }
                }
            },
            status=status.HTTP_201_CREATED,
        )


class ItemDetailView(APIView):
    def get_object(self, pk: uuid.UUID, user):
        try:
            return Item.objects.get(pk=pk, user=user)
        except Item.DoesNotExist:
            return None

    def get(self, request: Request, pk: uuid.UUID) -> Response:
        item = self.get_object(pk, request.user)
        if not item:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        tags = [it.tag for it in item.item_tags.all()]

        data = {
            "id": str(item.id),
            "type": item.type,
            "title": item.title,
            "is_pinned": item.is_pinned,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "tags": [{"id": str(t.id), "name": t.name, "color": t.color} for t in tags],
        }

        if item.content:
            if item.type == ItemType.LOGIN:
                data["content"] = json.loads(item.content)
            else:
                data["content"] = item.content

        if item.file_path:
            data["file"] = {
                "name": item.file_name,
                "size": item.file_size,
                "mimetype": item.file_mimetype,
                "url": f"/api/files/{item.id}/serve/",
            }

        return Response({"data": {"item": data}})

    def put(self, request: Request, pk: uuid.UUID) -> Response:
        item = self.get_object(pk, request.user)
        if not item:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        title = request.data.get("title", "").strip() or None
        content = request.data.get("content", "")
        tag_ids = request.data.getlist("tag_ids")

        item.title = title

        if content:
            if item.type == ItemType.LOGIN:
                item.content = json.dumps(content)
            else:
                item.content = content

        # Update tags
        if tag_ids is not None:
            # Remove all existing tags
            ItemTag.objects.filter(item=item).delete()
            # Add new tags
            for tag_id in tag_ids:
                try:
                    tag = Tag.objects.get(id=tag_id, user=request.user)
                    ItemTag.objects.create(item=item, tag=tag)
                except Tag.DoesNotExist:
                    pass

        item.save()

        return Response({"data": {"message": "Item updated successfully"}})

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        item = self.get_object(pk, request.user)
        if not item:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if item.file_path:
            full_path = os.path.join(settings.MEDIA_ROOT, item.file_path)
            if os.path.exists(full_path):
                os.remove(full_path)

        item.delete()

        return Response({"data": {"message": "Item deleted successfully"}})


class ItemSearchView(APIView):
    def get(self, request: Request) -> Response:
        query = request.query_params.get("q", "").strip()

        if not query:
            return Response({"data": {"items": []}})

        items = Item.objects.filter(
            user=request.user
        ).filter(
            Q(title__icontains=query) |
            Q(file_name__icontains=query) |
            Q(content__icontains=query)
        ).distinct()

        items_data = []
        for item in items:
            tags = [it.tag for it in item.item_tags.all()]
            item_data = {
                "id": str(item.id),
                "type": item.type,
                "title": item.title,
                "file_name": item.file_name,
                "is_pinned": item.is_pinned,
                "created_at": item.created_at.isoformat(),
                "tags": [{"id": str(t.id), "name": t.name, "color": t.color} for t in tags],
            }
            # Include content for text and login items
            if item.content and item.type in (ItemType.TEXT, ItemType.LOGIN):
                if item.type == ItemType.LOGIN:
                    item_data["content"] = json.loads(item.content)
                else:
                    item_data["content"] = item.content
            items_data.append(item_data)

        return Response({"data": {"items": items_data, "query": query}})


class TagListView(APIView):
    def get(self, request: Request) -> Response:
        tags = Tag.objects.filter(user=request.user)
        tags_data = [{"id": str(t.id), "name": t.name, "color": t.color} for t in tags]
        return Response({"data": {"tags": tags_data}})

    def post(self, request: Request) -> Response:
        name = request.data.get("name", "").strip()
        color = request.data.get("color", "").strip()

        if not name:
            return Response(
                {"error": {"code": "MISSING_NAME", "message": "Tag name is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not color:
            color = "#6366f1"

        if not color.startswith("#") or len(color) != 7:
            return Response(
                {"error": {"code": "INVALID_COLOR", "message": "Color must be a valid hex color (e.g. #ff5733)"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if Tag.objects.filter(user=request.user, name__iexact=name).exists():
            return Response(
                {"error": {"code": "TAG_EXISTS", "message": "A tag with this name already exists"}},
                status=status.HTTP_409_CONFLICT,
            )

        tag = Tag.objects.create(user=request.user, name=name, color=color)

        return Response(
            {"data": {"tag": {"id": str(tag.id), "name": tag.name, "color": tag.color}}},
            status=status.HTTP_201_CREATED,
        )


class TagDetailView(APIView):
    def get_object(self, pk: uuid.UUID, user):
        try:
            return Tag.objects.get(pk=pk, user=user)
        except Tag.DoesNotExist:
            return None

    def put(self, request: Request, pk: uuid.UUID) -> Response:
        tag = self.get_object(pk, request.user)
        if not tag:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Tag not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        name = request.data.get("name", "").strip()
        color = request.data.get("color", "").strip()

        if name:
            tag.name = name
        if color:
            tag.color = color

        tag.save()

        return Response({"data": {"message": "Tag updated successfully"}})

    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        tag = self.get_object(pk, request.user)
        if not tag:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Tag not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        tag.delete()

        return Response({"data": {"message": "Tag deleted successfully"}})


@method_decorator(csrf_exempt, name='dispatch')
class FileUploadView(APIView):
    authentication_classes = []  # Bypass DRF's SessionAuthentication CSRF enforcement
    permission_classes = []  # Bypass DRF's default permission check

    def post(self, request: Request) -> Response:
        # Manually check authentication using Django session
        user_id = request.session.get('_auth_user_id')
        if not user_id:
            return Response(
                {"error": {"code": "NOT_AUTHENTICATED", "message": "Authentication required"}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_AUTHENTICATED", "message": "Invalid user"}},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        file: UploadedFile | None = request.FILES.get("file")

        if not file:
            return Response(
                {"error": {"code": "NO_FILE", "message": "No file provided"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item_type = request.data.get("type")
        title = request.data.get("title", "").strip() or None

        mimetype = file.content_type or "application/octet-stream"
        filename = file.name
        file_size = file.size

        if item_type == ItemType.IMAGE:
            if file_size > settings.MAX_IMAGE_SIZE:
                return Response(
                    {"error": {"code": "FILE_TOO_LARGE", "message": f"Image exceeds {settings.MAX_IMAGE_SIZE} bytes"}},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
        elif item_type == ItemType.VIDEO:
            if file_size > settings.MAX_VIDEO_SIZE:
                return Response(
                    {"error": {"code": "FILE_TOO_LARGE", "message": f"Video exceeds {settings.MAX_VIDEO_SIZE} bytes"}},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
        else:
            if file_size > settings.MAX_FILE_SIZE:
                return Response(
                    {"error": {"code": "FILE_TOO_LARGE", "message": f"File exceeds {settings.MAX_FILE_SIZE} bytes"}},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )

        user_dir = str(user.id)
        upload_dir = os.path.join(settings.MEDIA_ROOT, user_dir)
        os.makedirs(upload_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4()}-{filename}"
        file_path = os.path.join(user_dir, unique_filename)
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)

        with open(full_path, "wb+") as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        item = Item.objects.create(
            user=user,
            type=item_type,
            title=title,
            file_path=file_path,
            file_name=filename,
            file_size=file_size,
            file_mimetype=mimetype,
        )

        tag_ids = request.data.getlist("tag_ids")
        if tag_ids:
            for tag_id in tag_ids:
                try:
                    tag = Tag.objects.get(id=tag_id, user=user)
                    ItemTag.objects.create(item=item, tag=tag)
                except Tag.DoesNotExist:
                    pass

        return Response(
            {
                "data": {
                    "item": {
                        "id": str(item.id),
                        "type": item.type,
                        "title": item.title,
                        "file_name": item.file_name,
                        "file_size": item.file_size,
                        "created_at": item.created_at.isoformat(),
                    }
                }
            },
            status=status.HTTP_201_CREATED,
        )


class FileServeView(APIView):
    def get(self, request: Request, pk: uuid.UUID) -> FileResponse | HttpResponse:
        try:
            item = Item.objects.get(pk=pk, user=request.user)
        except Item.DoesNotExist:
            return HttpResponse(
                json.dumps({"error": {"code": "NOT_FOUND", "message": "Item not found"}}),
                status=404,
                content_type="application/json",
            )

        if not item.file_path:
            return HttpResponse(
                json.dumps({"error": {"code": "NO_FILE", "message": "This item has no associated file"}}),
                status=404,
                content_type="application/json",
            )

        full_path = os.path.join(settings.MEDIA_ROOT, item.file_path)

        if not os.path.exists(full_path):
            return HttpResponse(
                json.dumps({"error": {"code": "FILE_NOT_FOUND", "message": "File not found on disk"}}),
                status=404,
                content_type="application/json",
            )

        if item.type == ItemType.VIDEO:
            range_header = request.META.get("HTTP_RANGE", "")

            if range_header:
                file_size = os.path.getsize(full_path)
                ranges = range_header.replace("bytes=", "").split("-")
                start = int(ranges[0]) if ranges[0] else 0
                end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else file_size - 1

                response = FileResponse(
                    open(full_path, "rb"),
                    content_type=item.file_mimetype,
                    status=206,
                )
                response["Content-Range"] = f"bytes {start}-{end}/{file_size}"
                response["Content-Length"] = str(end - start + 1)
                response["Accept-Ranges"] = "bytes"
            else:
                response = FileResponse(open(full_path, "rb"), content_type=item.file_mimetype)
        else:
            response = FileResponse(open(full_path, "rb"), content_type=item.file_mimetype)

        response["Content-Disposition"] = f'inline; filename="{item.file_name}"'
        return response


class ItemPinToggleView(APIView):
    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            item = Item.objects.get(pk=pk, user=request.user)
        except Item.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        item.is_pinned = not item.is_pinned
        item.save()

        return Response(
            {"data": {"item": {"id": str(item.id), "is_pinned": item.is_pinned}}}
        )


class ItemBatchDeleteView(APIView):
    def post(self, request: Request) -> Response:
        item_ids = request.data.get("item_ids", [])

        if not item_ids:
            return Response(
                {"error": {"code": "NO_ITEMS", "message": "No items provided for deletion"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filter to only items owned by the user
        items = Item.objects.filter(id__in=item_ids, user=request.user)

        # Delete files from filesystem
        for item in items:
            if item.file_path:
                full_path = os.path.join(settings.MEDIA_ROOT, item.file_path)
                if os.path.exists(full_path):
                    os.remove(full_path)

        # Delete items (cascade will handle ItemTag deletion)
        count = items.count()
        items.delete()

        return Response(
            {"data": {"message": f"Successfully deleted {count} item(s)", "count": count}}
        )


class CreateShareView(APIView):
    def post(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            item = Item.objects.get(pk=pk, user=request.user)
        except Item.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Get expiration settings from request
        expires_in_hours = request.data.get("expires_in_hours", 24)
        max_access_count = request.data.get("max_access_count")

        # Validate expires_in_hours (1 hour to 30 days)
        if not isinstance(expires_in_hours, int) or expires_in_hours < 1 or expires_in_hours > 720:
            return Response(
                {"error": {"code": "INVALID_EXPIRATION", "message": "Expiration must be between 1 and 720 hours (30 days)"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate max_access_count
        if max_access_count is not None:
            if not isinstance(max_access_count, int) or max_access_count < 1:
                return Response(
                    {"error": {"code": "INVALID_MAX_ACCESS", "message": "Max access count must be a positive integer"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Calculate expiration date
        expires_at = timezone.now() + timedelta(hours=expires_in_hours)

        # Create share link
        share = SharedItem.objects.create(
            item=item,
            expires_at=expires_at,
            max_access_count=max_access_count,
        )

        # Generate share URL using frontend URL
        share_url = f"{settings.FRONTEND_URL.rstrip('/')}/shared/{share.token}/"

        return Response(
            {
                "data": {
                    "share": {
                        "id": str(share.id),
                        "token": str(share.token),
                        "share_url": share_url,
                        "expires_at": share.expires_at.isoformat(),
                        "max_access_count": share.max_access_count,
                        "access_count": share.access_count,
                    }
                }
            },
            status=status.HTTP_201_CREATED,
        )


class ViewSharedItemView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request: Request, token: uuid.UUID) -> Response:
        try:
            share = SharedItem.objects.get(token=token)
        except SharedItem.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Share link not found or has expired"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if share is valid
        if not share.is_valid():
            return Response(
                {"error": {"code": "EXPIRED", "message": "This share link has expired or reached its access limit"}},
                status=status.HTTP_410_GONE,
            )

        # Increment access count
        share.access_count += 1
        share.save()

        # Get item data
        item = share.item
        tags = [it.tag for it in item.item_tags.all()]

        data = {
            "id": str(item.id),
            "type": item.type,
            "title": item.title,
            "created_at": item.created_at.isoformat(),
            "tags": [{"id": str(t.id), "name": t.name, "color": t.color} for t in tags],
        }

        if item.content:
            if item.type == ItemType.LOGIN:
                data["content"] = json.loads(item.content)
            else:
                data["content"] = item.content

        if item.file_path:
            data["file"] = {
                "name": item.file_name,
                "size": item.file_size,
                "mimetype": item.file_mimetype,
                "url": f"/api/files/{item.id}/serve/",
            }

        return Response({"data": {"item": data}})


class ListSharesView(APIView):
    def get(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            item = Item.objects.get(pk=pk, user=request.user)
        except Item.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Item not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        shares = SharedItem.objects.filter(item=item).order_by("-created_at")

        shares_data = []
        for share in shares:
            share_url = f"{settings.FRONTEND_URL.rstrip('/')}/shared/{share.token}/"
            shares_data.append({
                "id": str(share.id),
                "token": str(share.token),
                "share_url": share_url,
                "expires_at": share.expires_at.isoformat() if share.expires_at else None,
                "max_access_count": share.max_access_count,
                "access_count": share.access_count,
                "is_valid": share.is_valid(),
                "created_at": share.created_at.isoformat(),
            })

        return Response({"data": {"shares": shares_data}})


class DeleteShareView(APIView):
    def delete(self, request: Request, pk: uuid.UUID) -> Response:
        try:
            share = SharedItem.objects.get(pk=pk, item__user=request.user)
        except SharedItem.DoesNotExist:
            return Response(
                {"error": {"code": "NOT_FOUND", "message": "Share not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )

        share.delete()

        return Response({"data": {"message": "Share deleted successfully"}})
