# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_user_create_shortcut"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="create_shortcut",
            field=models.CharField(blank=True, default="n", help_text="Keyboard shortcut for creating new items (e.g., 'n', 'ctrl+n', 'shift+enter')", max_length=50, null=True),
        ),
    ]
