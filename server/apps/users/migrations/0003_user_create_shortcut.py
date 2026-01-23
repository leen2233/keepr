# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_emailverificationtoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="create_shortcut",
            field=models.CharField(blank=True, default="n", help_text="Single letter shortcut for creating new items", max_length=1, null=True),
        ),
    ]
