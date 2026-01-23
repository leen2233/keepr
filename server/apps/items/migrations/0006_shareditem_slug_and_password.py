# Generated migration for custom share paths and password protection

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("items", "0005_alter_item_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="shareditem",
            name="slug",
            field=models.SlugField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="shareditem",
            name="password_hash",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddIndex(
            model_name="shareditem",
            index=models.Index(fields=["slug"], name="items_shared_slug_idx"),
        ),
    ]
