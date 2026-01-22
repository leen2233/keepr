from django.urls import path
from .views import (
    BackupSettingsView,
    BackupLogsView,
    ManualBackupView,
    TestS3ConnectionView,
    ExportDataView,
)

urlpatterns = [
    path("backup/settings/", BackupSettingsView.as_view(), name="backup-settings"),
    path("backup/logs/", BackupLogsView.as_view(), name="backup-logs"),
    path("backup/manual/", ManualBackupView.as_view(), name="manual-backup"),
    path("backup/test-s3/", TestS3ConnectionView.as_view(), name="test-s3"),
    path("export/data/", ExportDataView.as_view(), name="export-data"),
]
