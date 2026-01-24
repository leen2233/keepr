#!/bin/bash
set -e

# Run migrations
echo "Running Django migrations..."
python manage.py migrate --noinput

# Create superuser if ADMIN_USERNAME and ADMIN_PASSWORD are set
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
    echo "Creating superuser: $ADMIN_USERNAME"

    # Check if user already exists
    if python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); exit(0 if User.objects.filter(username='$ADMIN_USERNAME').exists() else 1)" 2>/dev/null; then
        echo "Superuser '$ADMIN_USERNAME' already exists. Skipping creation."
    else
        # Create superuser from environment variables
        python manage.py shell << EOF
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='$ADMIN_USERNAME').delete()
User.objects.create_superuser(
    username='$ADMIN_USERNAME',
    email='$ADMIN_EMAIL' if '$ADMIN_EMAIL' else '$ADMIN_USERNAME@localhost',
    password='$ADMIN_PASSWORD',
    email_verified=True
)
print(f"Superuser '{ '$ADMIN_USERNAME' }' created successfully.")
EOF
    fi
fi

# Create backup directory if LOCAL_BACKUP_DIR is set
if [ -n "$LOCAL_BACKUP_DIR" ]; then
    echo "Creating backup directory: $LOCAL_BACKUP_DIR"
    mkdir -p "$LOCAL_BACKUP_DIR"
fi

# Start the application
echo "Starting Keepr backend..."
exec "$@"
