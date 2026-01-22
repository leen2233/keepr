import uuid
from django.conf import settings
from django.db import models
from django.contrib.postgres.search import SearchVectorField


class ItemType(models.TextChoices):
    TEXT = "text", "Text"
    LOGIN = "login", "Login"
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    FILE = "file", "File"


class Tag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tags")
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7)  # hex color, e.g. "#ff5733"

    class Meta:
        db_table = "tags"
        unique_together = ("user", "name")
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class Item(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="items")
    type = models.CharField(max_length=10, choices=ItemType.choices)

    title = models.CharField(max_length=500, blank=True, null=True)

    # For text and login items
    content = models.TextField(blank=True, null=True)

    # For files (images, videos, files)
    file_path = models.CharField(max_length=1000, blank=True)
    file_name = models.CharField(max_length=500, blank=True)
    file_size = models.BigIntegerField(blank=True, null=True)  # in bytes
    file_mimetype = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Full-text search vector
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        db_table = "items"
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "type"]),
        ]

    def __str__(self) -> str:
        return self.title or self.file_name or f"{self.type} item"


class ItemTag(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="item_tags")
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE, related_name="item_tags")

    class Meta:
        db_table = "item_tags"
        unique_together = ("item", "tag")

    def __str__(self) -> str:
        return f"{self.item} - {self.tag}"
