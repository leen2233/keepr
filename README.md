# Keepr

> A flexible personal archive for storing anything - notes, credentials, media, files - with powerful search and tagging capabilities.

![Keepr](https://img.shields.io/badge/status-beta-orange)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Multi-Type Storage**
  - Text notes with Markdown support
  - Login credentials (username, password, URL)
  - Images (PNG, JPG, GIF, etc.)
  - Videos (MP4, MOV, M4V) with streaming
  - Any file type

- **Organization & Discovery**
  - Flexible tag system with custom colors
  - Combined search, tag, and type filters
  - Full-text search across titles, filenames, and content
  - Feed view grouped by date

- **Authentication**
  - Email or username login
  - Email verification via SMTP

- **Clean Design**
  - Minimalistic black & white aesthetic
  - Dark/light theme support
  - Responsive layout

## Tech Stack

**Backend**
- Django 5.0+ with Django REST Framework
- PostgreSQL
- Session-based authentication

**Frontend**
- React 18 with TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- React Router
- Lucide React (icons)
- React Markdown (content rendering)

## Project Structure

```
keepr/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── store/
│   │   └── styles/
│   └── ...
└── server/          # Django backend
    ├── apps/
    │   ├── core/
    │   ├── items/
    │   └── users/
    └── ...
```

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 20+
- PostgreSQL 16+

### Backend Setup

```bash
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your settings (database, email, etc.)

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with API URL

# Run development server
npm run dev
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/keepr
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Email (for verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True

# File upload limits
MAX_TEXT_SIZE=102400
MAX_IMAGE_SIZE=10485760
MAX_VIDEO_SIZE=104857600
MAX_FILE_SIZE=20971520
MEDIA_ROOT=media/
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000/api
```

## API Endpoints

### Authentication
- `POST /auth/register/` - Register new user
- `POST /auth/login/` - Login
- `POST /auth/logout/` - Logout
- `GET /auth/me/` - Get current user
- `POST /auth/verify/<token>/` - Verify email

### Items
- `GET /items/` - List items (supports `?tag=`, `?type=`, `?q=` params)
- `POST /items/` - Create text/login item
- `GET /items/<id>/` - Get item details
- `PUT /items/<id>/` - Update item
- `DELETE /items/<id>/` - Delete item
- `POST /files/upload/` - Upload file (image/video/file)

### Tags
- `GET /tags/` - List tags
- `POST /tags/` - Create tag
- `PUT /tags/<id>/` - Update tag
- `DELETE /tags/<id>/` - Delete tag

## License

MIT License - see LICENSE file for details.
