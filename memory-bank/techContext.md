# Tech Context: Keepr

## Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18+ |
| TypeScript | Type Safety | 5+ |
| Vite | Build Tool | 5+ |
| Tailwind CSS | Styling | 3+ |
| React Router | Navigation | 6+ |
| Axios/Zod | API Client + Validation | latest |

**Design System**: Custom minimalistic design, no component library initially

### Backend
| Technology | Purpose | Version |
|------------|---------|---------|
| Python | Runtime | 3.11+ |
| Django | Web Framework | 5.0+ |
| Django REST Framework | API Layer | 3.14+ |
| PostgreSQL | Database | 16+ |
| Django ORM | ORM | Built-in |

### Email
- Django Email backend for sending
- Gmail SMTP (user-provided credentials)

### File Storage
- Text content stored in PostgreSQL database
- Binary files (images, videos, documents) stored on filesystem
- File paths stored in database
- Future: Migrate to S3-compatible storage for easier scaling

## Development Setup

### Prerequisites
```bash
python >= 3.11
postgres >= 16
node >= 20  # For frontend only
```

### Repository Structure
```
keepr/
├── client/              # Frontend (Vite + React)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities, API client
│   │   └── styles/      # Global styles, Tailwind config
│   └── package.json
│
├── server/              # Backend (Django)
│   ├── config/          # Django settings, urls, wsgi, asgi
│   ├── apps/
│   │   ├── users/       # Users app (auth, profiles)
│   │   ├── items/       # Items app (CRUD, tags)
│   │   └── core/        # Core utilities, middleware
│   ├── media/           # File storage (images, videos, files)
│   ├── manage.py
│   ├── requirements.txt
│   └── requirements-dev.txt
│
├── memory-bank/         # This documentation
└── CLAUDE.md            # Project instructions
```

### Environment Variables
```bash
# server/.env
DATABASE_URL=postgresql://...
SECRET_KEY=...  # Django secret key
GMAIL_EMAIL=...
GMAIL_APP_PASSWORD=...
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# client/.env
VITE_API_URL=http://localhost:8000/api
```

## Build & Run

### Development
```bash
# Server (Django)
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver

# Client (Vite + React)
cd client
npm install
npm run dev
```

### Production
```bash
# Server (Django)
cd server
gunicorn config.wsgi:application  # or uvicorn for async

# Client
cd client
npm run build
# Serve static files with nginx or similar
```

## Dependencies to Select

### Backend Libraries (DECIDED)
- **Auth**: Django REST Framework's built-in session auth
- **CORS**: django-cors-headers
- **File validation**: Custom validators
- **Search**: PostgreSQL full-text search via Django ORM

### Frontend State Management (DECIDED)
React Context + hooks (simple, built-in)

## Tooling

### Code Quality
- **Backend**: Black, Ruff, isort, mypy
- **Frontend**: ESLint + Prettier
- **Pre-commit**: Husky for frontend, pre-commit hooks for backend

### Database
- Django migrations for schema changes
- Django Admin for data inspection (dev only)

### Email Testing
- Mailtrap or Ethereal Email for development
- Gmail SMTP for production

## Deployment Considerations

### Initial (MVP)
- Single VPS (DigitalOcean, Hetzner)
- Docker Compose for easy deployment
- PostgreSQL container
- Nginx reverse proxy + Gunicorn/Uvicorn

### Future
- Separate database server
- CDN for static assets
- Object storage for files (S3, Backblaze) with django-storages
- Load balancer for multiple app servers

## Constraints & Trade-offs

1. **No mobile apps initially** - Responsive web only
2. **Single-tenant** - No multi-user org features
3. **Email-only verification** - No SMS, no authenticator apps yet
4. **File size limits** - Text: 100KB, Images: 10MB, Videos: 100MB, Other: 20MB
5. **No file content search** - Searching inside PDFs/docs deferred
6. **Session-based auth** - DRF built-in, not JWT tokens
