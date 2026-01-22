from django.contrib import admin
from .models import Item, Tag, ItemTag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "color")
    list_filter = ("user",)
    search_fields = ("name",)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("title", "file_name", "type", "user", "created_at")
    list_filter = ("type", "created_at")
    search_fields = ("title", "description", "file_name")
    date_hierarchy = "created_at"


@admin.register(ItemTag)
class ItemTagAdmin(admin.ModelAdmin):
    list_display = ("item", "tag")
    list_filter = ("tag",)
