# Keepr

> Elastic Personal Archive - Store anything, find everything.

A flexible, encrypted digital archive for storing notes, credentials, media, and files with powerful search and tagging capabilities.

## Features

- **Multi-Type Storage**: Text notes, login credentials, images, videos, and any file type
- **Tag-Based Organization**: Flexible tagging system with custom colors
- **Powerful Search**: Full-text search across titles and content
- **Temporary Sharing**: Create expirable, password-protected share links
- **Pin/Favorite System**: Keep important items at the top
- **Batch Operations**: Select and delete multiple items at once
- **Keyboard Shortcuts**: Customizable shortcuts for power users
- **Import/Export**: Backup and restore your data
- **Dark/Light Mode**: Minimalistic design with soul

## Quick Start (Docker)

The easiest way to run Keepr is using pre-built Docker images:

```bash
# 1. Download the environment configuration
wget https://raw.githubusercontent.com/leen2233/keepr/refs/heads/main/.env.docker.example -O .env

# 2. Edit .env with your settings (at minimum, set secure passwords)
nano .env

# 3. Download the docker-compose file
wget https://raw.githubusercontent.com/leen2233/keepr/refs/heads/main/docker-compose.prod.yml -O docker-compose.prod.yml

# 4. Start Keepr
docker compose -f docker-compose.prod.yml up -d

# 5. Access at http://localhost:8080
```

### Default Admin Credentials

If you set `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`, an admin superuser will be created automatically on first startup. Otherwise, register a new account through the web interface.

## Installation Methods

### Method 1: Pre-built Docker Images (Recommended)

No build required - just pull and run:

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Method 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/leen2233/keepr.git
cd keepr

# Copy and configure environment
cp .env.docker.example .env
nano .env

# Build and start
docker compose up --build -d
```

## Configuration

Edit `.env` to configure Keepr. Copy `.env.docker.example` as a template:

### Required Settings

```bash
# Generate a secure secret key
SECRET_KEY=your-secure-random-key-here

# Database
POSTGRES_DB=keepr
POSTGRES_USER=keepr
POSTGRES_PASSWORD=secure-password-here
```

### Optional Settings

```bash
# Data directories (default: ./data)
DATA_DIR=./data              # Media files and backups
DB_DIR=                      # Leave empty for Docker volume

# Admin user (auto-created on first start)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-admin-password
ADMIN_EMAIL=admin@localhost

# Email for user verification (optional but recommended)
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Disable public signup (for private instances)
ALLOW_SIGNUP=false
```

### Data Storage

Your data is stored in the following locations:

| Type | Default Location | Configurable Via |
|------|------------------|------------------|
| **Database** | Docker volume | `DB_DIR` |
| **Media files** | `./data/media/` | `DATA_DIR` |
| **Backups** | `./data/backups/` | `DATA_DIR` |

All data persists outside Docker containers in `./data/` by default.

## Usage

### First Time Setup

1. Open http://localhost:8080
2. Register a new account or login with admin credentials
3. Verify your email (if Gmail SMTP is configured)
4. Start adding items!

### Creating Items

1. Click **"Add New"** or press your create shortcut (default: `Alt+N`)
2. Select the type: Text, Login, Image, Video, or File
3. Enter content and add tags
4. Save

### Organizing with Tags

- Create tags from the tag selector
- Assign colors to tags for visual organization
- Filter your feed by clicking on tags

### Sharing Items

1. Open any item
2. Click the **Share** button
3. Set expiration and optional password
4. Copy the share link

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Type anywhere | Focus search |
| `Alt+N` (customizable) | New item |
| `Escape` | Clear search / Close modals |

## Development Setup

For local development without Docker:

```bash
# Backend (Django)
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver

# Frontend (React + Vite)
cd client
npm install
npm run dev
```

Access the frontend at http://localhost:5173

## Building Docker Images

To build and push your own images:

```bash
# Login to Docker Hub
docker login

# Build and tag
docker build -t YOUR_USERNAME/keepr-backend:latest -f server/Dockerfile server
docker build -t YOUR_USERNAME/keepr-frontend:latest -f client/Dockerfile client

# Push to Docker Hub
docker push YOUR_USERNAME/keepr-backend:latest
docker push YOUR_USERNAME/keepr-frontend:latest
```

## Backup and Restore

### Manual Backup

1. Go to **Settings** > **Backup** (admin only)
2. Click **"Backup Now"**
3. Backups are saved to `./data/backups/`

### Restore from Backup

1. Go to **Settings** > **Data**
2. Click **"Import Data"**
3. Select your backup ZIP file
4. For full backups, confirm the restore operation

### Automatic Backups

Admins can configure automatic backups in Settings:
- Local backups (to `./data/backups/`)
- S3-compatible storage (AWS, Wasabi, Backblaze, MinIO)
- Configurable intervals (hourly to monthly)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs -f

# Rebuild from scratch
docker compose down -v
docker compose up --build
```

### Database connection errors

```bash
# Ensure database is healthy
docker compose ps

# Restart services
docker compose restart db backend
```

### Can't access media files

Ensure `DATA_DIR` is properly set and the directory exists:

```bash
mkdir -p ./data/media ./data/backups
chmod 755 ./data
```

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Django 5, Django REST Framework, Python 3.13
- **Database**: PostgreSQL 16
- **Web Server**: nginx + gunicorn

## License

MIT License

## Support

- **Issues**: https://github.com/leen2233/keepr/issues
