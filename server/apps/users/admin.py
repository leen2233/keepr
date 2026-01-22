from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "email_verified", "date_joined")
    list_filter = ("email_verified", "is_staff", "is_superuser")
    search_fields = ("username", "email")
    ordering = ("-date_joined",)

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Email Verification", {"fields": ("email_verified",)}),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (None, {"fields": ("email",)}),
    )
