# System Patterns: Keepr

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Web)                            │
│                    React + Tailwind CSS                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS/REST API
┌──────────────────────────────▼──────────────────────────────────┐
│                   Django + DRF Application                       │
│                     (Python 3.11+)                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
┌───────────────▼──────────┐    ┌────────────▼─────────────┐
│   PostgreSQL Database    │    │   Filesystem Storage     │
│   - Users                │    │   - Images               │
│   - Items (text content) │    │   - Videos               │
│   - Tags                 │    │   - Files                │
│   - BackupSettings       │    │   - (served via API)     │
│   - BackupLogs           │    │                          │
└──────────────────────────┘    └───────────┬───────────────┘
                                            │
                                 ┌──────────▼──────────────┐
                                 │   S3 Storage (optional) │
                                 │   - Automated backups   │
                                 │   - User-configurable   │
                                 └─────────────────────────┘
```

## Data Model

### Core Entities

**Users**
```javascript
{
  id: uuid
  email: string (unique)
  username: string (unique)
  password_hash: string
  email_verified: boolean
  created_at: timestamp
}
```

**Items**
```javascript
{
  id: uuid
  user_id: uuid (FK)
  type: enum (text, login, image, video, file)
  title: string (optional)
  content: text  // Plain text or JSON (for login info), NULL for files
  file_path: string (for media/files - reference to filesystem)
  file_name: string (for media/files)
  file_size: integer (bytes, for media/files)
  file_mimetype: string (for media/files)
  created_at: timestamp
  updated_at: timestamp
}
```

**Tags**
```javascript
{
  id: uuid
  user_id: uuid (FK)
  name: string
  color: string (hex, required)  // User picks from preset colors
}
```

**Item_Tags** (junction)
```javascript
{
  item_id: uuid (FK)
  tag_id: uuid (FK)
}
```

**BackupSettings**
```javascript
{
  id: uuid
  user_id: uuid (FK, OneToOne)
  interval_hours: integer (default: 24)
  backup_on_new_item: boolean (default: true)
  local_backup_enabled: boolean (default: false)
  s3_enabled: boolean (default: false)
  s3_bucket_name: string
  s3_access_key: string
  s3_secret_key: string (never returned in API responses)
  s3_region: string (default: "us-east-1")
  s3_endpoint: string (optional, for S3-compatible services)
  last_backup_at: timestamp
  last_item_count: integer (default: 0)
  created_at: timestamp
  updated_at: timestamp
}
```

**BackupLogs**
```javascript
{
  id: uuid
  user_id: uuid (FK)
  status: enum (success, failed, skipped)
  message: text
  items_backed_up: integer (default: 0)
  files_backed_up: integer (default: 0)
  created_at: timestamp
}
```

## Key Technical Decisions

### 1. Content Storage Strategy
**Decision**: Hybrid storage - database for text, filesystem for binaries
- Text items → stored as `text` in database `content` column
- Login info → stored as JSON in database `content` column
- Images/Videos/Files → stored on filesystem, path reference in database

**Rationale**: Best of both worlds - searchable text in database, efficient binary storage on filesystem

### 2. Search Implementation
**Decision**: PostgreSQL full-text search for text content only
- Text items: search across title and content
- Login items: search across title and JSON fields
- File items: search across title and filename (not content)
- Tag filtering via SQL
- File content search: future enhancement (optional)

**Note**: Searching inside file contents (PDFs, docs) is deferred. Can add later with external indexing service.

### 3. File Size Limits
**Decision**: Medium limits for flexibility
- Text items: 100KB
- Images: 10MB
- Videos: 100MB
- Other files: 20MB

Note: Description field was removed per user request. Items only have title (optional), content, and tags.

### 4. Authentication Flow
```
Register → Send verification email → User clicks link → Verify → Login
Login → Email/username + password → Session token → Access
```

### 5. UI Design (cobalt.tools aesthetic)
**Decision**: Minimal, black/white/gray design
- Light mode: gray-100 background, white cards, black text
- Dark mode: black background, black cards, white text
- Icons: Lucide-react throughout
- Borders: border-black/20 for cards, border-black/30 for inputs
- No gradients or flashy colors
- Tags only colored elements in UI

## API Design Patterns

### RESTful Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/verify/:token
POST   /api/auth/change-password

GET    /api/items
POST   /api/items
GET    /api/items/:id
PUT    /api/items/:id
DELETE /api/items/:id

GET    /api/items/search?q=...
GET    /api/tags
POST   /api/tags
DELETE /api/tags/:id

GET    /api/backup/settings
PUT    /api/backup/settings
GET    /api/backup/logs
POST   /api/backup/manual
POST   /api/backup/test-s3

POST   /api/export/data       # All users - export personal data
POST   /api/import/data       # All users - personal import; staff only - full import
```

### Response Format
```javascript
// Success
{ data: {...}, meta: {...} }

// Error
{ error: { code: "ERR_CODE", message: "..." } }
```

## Security Considerations

1. **Password hashing**: bcrypt/argon2
2. **Session management**: HTTP-only cookies with signed tokens
3. **File upload validation**: Type checking, size limits
4. **Rate limiting**: On auth endpoints
5. **CSRF protection**: Token validation on state-changing operations
6. **SQL injection**: Parameterized queries only
