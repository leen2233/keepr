import os
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BackupSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="backup_settings")

    # Backup schedule
    interval_hours = models.PositiveIntegerField(default=24, help_text="Backup interval in hours")
    backup_on_new_item = models.BooleanField(default=True, help_text="Only backup if new items added")

    # Local Backup Settings
    local_backup_enabled = models.BooleanField(default=False, help_text="Enable local backup to filesystem")

    # S3 Settings
    s3_enabled = models.BooleanField(default=False)
    s3_bucket_name = models.CharField(max_length=255, blank=True)
    s3_access_key = models.CharField(max_length=255, blank=True)
    s3_secret_key = models.CharField(max_length=255, blank=True)
    s3_region = models.CharField(max_length=100, default="us-east-1")
    s3_endpoint = models.CharField(max_length=255, blank=True, help_text="Custom S3 endpoint (optional)")

    # Backup state
    last_backup_at = models.DateTimeField(null=True, blank=True)
    last_item_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Backup Settings"
        verbose_name_plural = "Backup Settings"


class BackupLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="backup_logs")
    status = models.CharField(max_length=20, choices=[("success", "Success"), ("failed", "Failed"), ("skipped", "Skipped")])
    message = models.TextField(blank=True)
    items_backed_up = models.PositiveIntegerField(default=0)
    files_backed_up = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Backup Log"
        verbose_name_plural = "Backup Logs"
