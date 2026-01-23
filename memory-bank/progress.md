# Progress: Keepr

## Current Status
**Feature Enhancement & Polish** - Adding power user features: pin/favorite, advanced keyboard shortcuts, batch operations, and temporary link sharing

## Completed
- [x] Memory Bank initialized with all core files
- [x] Project requirements defined
- [x] System architecture designed
- [x] Data model conceptualized
- [x] Technology stack selected
- [x] API structure planned
- [x] Security considerations documented
- [x] Monorepo structure created (server/ + client/)
- [x] Django backend project setup with DRF
- [x] Django models (User, Item, Tag, ItemTag, EmailVerificationToken, SharedItem)
- [x] Authentication views (Register, Login, Logout, Me, Verify, UpdateSettings)
- [x] Items views (CRUD, Search, FileUpload, FileServe, PinToggle, BatchDelete)
- [x] Share views (CreateShare, ListShares, DeleteShare, ViewSharedItem)
- [x] Tags views (CRUD)
- [x] Custom exception handler
- [x] React + Vite + Tailwind frontend setup
- [x] Zustand state management (auth, filters, theme, modal)
- [x] React Query for data fetching
- [x] API client with axios
- [x] All UI components (Layout, ItemCard, TagBadge, SearchBar, ItemTypeFilter, TagFilter)
- [x] All pages (Login, Feed, CreateItem, ItemDetail, Search, VerifyEmail, SharedItem, Settings)
- [x] Dark + Light theme support (cobalt.tools aesthetic)
- [x] Tag filtering system
- [x] Item type filtering
- [x] Search functionality
- [x] File upload handling (images, videos, files)
- [x] Video streaming with range headers
- [x] Markdown rendering for text notes
- [x] **UI redesigned to cobalt.tools aesthetic (minimal, black/white/gray)**
- [x] **Dark mode with black background**
- [x] **Visible borders (border-black/20, border-black/30)**
- [x] **Removed description field from items**

## New Features Added (2026-01-23 - Session 3)

### Custom Share Paths & Password Protection
- [x] `slug` field added to SharedItem model (custom share paths)
- [x] `password_hash` field added to SharedItem model (password protection)
- [x] `has_password` property and `check_password()`/`set_password()` methods
- [x] CreateShareView accepts `slug` and `password` parameters
- [x] Slug validation: 3+ chars, alphanumeric with dashes and underscores
- [x] Expired slugs automatically deleted for reuse
- [x] ViewSharedItemView supports both slug and token identifiers
- [x] Password-protected shares require POST with password to unlock
- [x] Share modal UI: custom path input with preview
- [x] Share modal UI: password input with show/hide toggle
- [x] SharedItemPage shows password prompt (no redirect on wrong password)
- [x] API interceptor excludes shared item requests from 401 redirect
- [x] Error message display fixed to show actual API messages
- [x] Migration: `0006_shareditem_slug_and_password.py`

### Migration Needed
- [ ] Run `python manage.py migrate` to apply `0006_shareditem_slug_and_password.py`

## New Features Added (2026-01-23 - Session 2)

### Pin/Favorite System
- [x] Added `is_pinned` boolean field to Item model
- [x] Pinned items ordered first (`-is_pinned`, `-created_at`)
- [x] Pin toggle API endpoint (`/api/items/<id>/pin/`)
- [x] Frontend: Pin/PinOff icons on ItemCard, FeedPage, ItemDetailPage
- [x] Keyboard shortcuts hook for pin toggle

### Keyboard Shortcuts Enhancement
- [x] Type-to-search: auto-focus search when typing anywhere (not in input)
- [x] User-defined create shortcut with full key combination support
- [x] Backend: `create_shortcut` field expanded to 50 chars
- [x] Frontend: Shortcut recorder UI with "Record" button
- [x] Format shortcuts for display (Ctrl + Shift + N, Cmd + Enter)
- [x] Parse and match keyboard events with modifiers

### Batch Delete
- [x] Batch delete API endpoint (`/api/items/batch-delete/`)
- [x] Select mode toggle with checkboxes on items
- [x] Select All / Clear buttons
- [x] Confirmation dialog before batch delete

### Temporary Link Sharing
- [x] SharedItem model with token, expiration, access limits
- [x] Create share link endpoint with configurable expiration
- [x] List shares endpoint for item management
- [x] Delete share endpoint
- [x] Public view endpoint (no auth required)
- [x] Share button on ItemDetailPage with modal
- [x] New SharedItemPage for viewing shared items
- [x] Password visibility on shared items

### Create Page Auto-Focus
- [x] Auto-focus content field on mount
- [x] Different focus target per item type

### Settings Page Reorganization
- [x] Tabbed interface (General, Security, Data, Backup)
- [x] Keyboard shortcuts configuration in General tab
- [x] Shortcut recorder with live preview

## Bug Fixes Completed (2026-01-23 - Session 2)

### Permission & Export Features
- [x] Permission management: Backup settings only accessible to staff/superuser
- [x] Signup toggle: `ALLOW_SIGNUP` environment variable to control user registration
- [x] User data export: All users can export their own data (items, tags, media) as ZIP
- [x] Admin full backup: Staff backup now includes ALL users' data (not just own)
- [x] Password change: Users can change password from Settings page
- [x] Login UX: Updated label to "Email or Username", input type to "text"
- [x] Fixed password change logout issue with `update_session_auth_hash`
- [x] Fixed login page redirect on invalid credentials (API interceptor check)

## Bug Fixes Completed (2026-01-22)

### Button Styling
- [x] Fixed `.btn-primary`, `.btn-secondary`, `.btn-ghost` to include base `.btn` styles
- [x] All buttons now have proper padding and rounded corners

### Tag Creation UX
- [x] Added "Save tag" and "Cancel" buttons for new tag creation
- [x] Tags become immediately selectable after saving
- [x] Enter key support for quick tag creation

### Password Field UX
- [x] Added show/hide password toggle (Eye/EyeOff icons)
- [x] Added copy to clipboard button (Copy icon)
- [x] Applied to both ItemDetailPage and FeedPage
- [x] Passwords displayed in bordered input with monospace font

### Feed Page UX
- [x] Text content now selectable/copiable (removed Link wrapper)
- [x] Arrow button (→) for navigation to item details
- [x] Multiple password items can toggle visibility independently

### Tag Filtering Backend
- [x] Fixed backend to use `getlist("tag_ids")` for multiple tag IDs
- [x] Fixed frontend FormData to send `tag_ids` without `[]` suffix
- [x] Tag filtering now works correctly

### File Upload CSRF/Authentication
- [x] Added `@method_decorator(csrf_exempt)` to FileUploadView
- [x] Bypassed DRF's SessionAuthentication CSRF enforcement
- [x] Added manual session-based authentication check
- [x] File upload now works for authenticated users

## What's Left to Build

### Phase 1: Foundation
- [x] Project scaffolding (monorepo setup)
- [x] Database schema + migrations
- [x] Authentication system
- [x] Basic item CRUD (text only)

### Phase 2: Content Types
- [x] File upload handling (to filesystem)
- [x] Image storage + serving
- [x] Video storage + streaming (with range headers)
- [x] Login info type (username, password, URL)

### Phase 3: Organization
- [x] Tag system (create, assign, manage) with custom colors
- [x] Tag filtering in feed
- [x] Search implementation
  - [x] Text search (full-text)
  - [x] Filename search

### Phase 4: Polish
- [x] Email verification flow (with EmailVerificationToken model)
- [x] Markdown rendering for text notes
- [x] Dark + Light theme support (cobalt.tools aesthetic)
- [x] UI/UX refinement (minimalistic black/white/gray design)
- [x] Error handling (custom exception handler)
- [x] Loading states
- [x] Empty states
- [x] Lucide-react icons throughout
- [x] More visible borders
- [x] Button styling fixes
- [x] Tag creation UX improvements
- [x] Password visibility/copy functionality
- [x] Feed text selection
- [x] Tag filtering fixes
- [x] File upload CSRF fixes
- [x] Backup feature (S3 integration, scheduled/manual backups, backup logs)
- [x] Local backup option (server filesystem, keeps last 6 backups)
- [x] Secret key security (never returned in API, only enter new value to change)
- [x] Toggle switch positioning fix (overflow-hidden, correct translate calculation)
- [x] Permission management (backup settings staff-only)
- [x] Signup toggle (ALLOW_SIGNUP env variable)
- [x] User data export (personal data download)
- [x] Admin full backup (all users' data)
- [x] Password change feature
- [x] Login with username OR email
- [x] Import from backup (personal data restore for all users)
- [x] Full backup import (staff/superuser only, restores complete database)
- [x] Pre-import automatic backup (creates safety backup before full restore)
- [x] Double confirmation modal for dangerous full import operations

### Phase 5: Launch Prep
- [ ] Run migrations and create database
- [ ] Test all features end-to-end
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deployment setup (Docker Compose)
- [ ] Documentation (README)

## Next Steps
1. **Set up environment**: Create `.env` files with proper configuration
2. **Database setup**: Run PostgreSQL and migrations
3. **Install dependencies**:
   - Backend: `cd server && pip install -r requirements-dev.txt`
   - Frontend: `cd client && npm install`
4. **Run servers**:
   - Backend: `cd server && python manage.py runserver`
   - Frontend: `cd client && npm run dev`
5. **Test the application**: Create account, test all features

## Known Issues
None currently - all reported issues have been resolved

## Evolution of Decisions

### 2026-01-23 (Permission Management & User Features)
**Permission Management:**
- Backup settings (S3/local, scheduling) now restricted to staff/superuser only
- Non-staff users see "Admin Access Required" message in Settings
- Added `is_staff` and `is_superuser` to User type and API responses

**Signup Control:**
- Added `ALLOW_SIGNUP` environment variable (defaults to `true`)
- When disabled, registration returns `SIGNUP_DISABLED` error with "This is a private server" message
- Signup link remains visible but shows error when clicked

**User Data Export:**
- New `ExportDataView` at `/api/export/data/`
- All users can export their own data as downloadable ZIP
- Export includes: items.json, tags.json, metadata.json, and user's media files
- Direct download via browser (no server storage)

**Admin Full Backup:**
- Staff/superuser backups now include ALL users' data
- Personal backups (non-staff) only include own data
- Backup naming: `backup_full_backup_*.zip` vs `backup_{user_id}_*.zip`
- S3 path: `keepr_backups/full_backups/` vs `keepr_backups/{user_id}/`

**Password Change:**
- New `ChangePasswordView` at `/api/auth/change-password/`
- Requires current password, new password (min 8 chars), confirm password
- Uses `update_session_auth_hash` to keep user logged in after change
- Added "Change Password" section to Settings page

**Login Improvements:**
- Login already supported username OR email (backend query logic)
- Updated frontend label to "Email or Username"
- Changed input type from `email` to `text` for username compatibility
- Added `is_staff` and `is_superuser` to LoginView response

**Bug Fixes:**
- Fixed ExportDataView to use `item.item_tags.all()` instead of `item.tags.all()`
- Removed `created_at` from tag export (Tag model doesn't have this field)
- Fixed login page redirect on 401 errors (API interceptor now checks current path)
- Fixed password change logout issue with `update_session_auth_hash`

**Key Patterns:**
- Item-Tag relationship: Access via `item.item_tags.all()`, then `item_tag.tag`
- Permission check: `request.user.is_staff or request.user.is_superuser`
- Session preservation: Use `update_session_auth_hash(request, request.user)` after password change
- API interceptor guard: Check `!window.location.pathname.startsWith("/login")` before redirect

### 2026-01-23 (Import from Backup Feature)
**Import Data Feature Implemented:**
- New `ImportDataView` at `/api/import/data/`
- Two import modes: personal data import (all users) and full backup import (staff/superuser only)
- Personal import: Restores user's own items, tags, and media from exported ZIP
- Full import: Restores complete database from admin backup (SQL dump + media files)

**Personal Import (All Users):**
- Imports from ZIP files created by "Export My Data" feature
- Handles items.json, tags.json, and media files
- File path matching: Searches ZIP for files by filename (handles subfolder structure)
- Tag deduplication: Uses existing tags if same name exists, creates new ones otherwise
- Preserves original timestamps for items

**Full Backup Import (Staff/Superuser Only):**
- Requires double confirmation with warning modals
- First modal: Explains all risks (data loss, logged out, backup created)
- Second modal: Final confirmation before proceeding
- Pre-import safety: Automatically creates backup of current data to `LOCAL_BACKUP_DIR` as `pre_import_restore_{timestamp}.zip`
- Database restore: Drops and recreates database, then restores from SQL dump
- Connection cleanup: Uses `connections.close_all()` before database operations
- PostgreSQL: Terminates all connections before dropping database, restores using `psql`
- SQLite: Replaces database file directly

**Safety Measures:**
- Backend requires `confirmed=true` parameter for full import
- Frontend uses `importStep` state for clean modal flow ("none" → "warning" → "confirm")
- Auto-backup created before any destructive operations
- Success message shows: database restored status, file count, item count, tag count, user count
- Warning banner: "You have been logged out. Please log in again."

**Frontend Implementation:**
- Import section added to Settings page (both staff and non-staff views)
- Staff users see "Full Backup Import" toggle switch
- File input accepts `.zip` files only
- Mutation accepts `file`, `fullImport`, and `confirmed` parameters
- FormData handling: `full_import` and `confirmed` sent as strings ("true"/"false")

**Bug Fixes During Implementation:**
- Fixed FormData boolean handling: Backend checks for string values "true", "1", "yes"
- Fixed file extraction: Search ZIP by filename suffix instead of exact path (handles subfolders)
- Fixed SSL connection error: Close Django connections before terminating database connections
- Fixed button double-click: Clean state machine with `importStep` enum instead of multiple booleans

**Key Patterns:**
- FormData sends strings, not booleans: `str(value).lower() in ("true", "1", "yes")`
- File path matching: `path.startswith("media/") and path.endswith(filename)`
- Pre-import backup: Create in temp, then `shutil.move()` to final location
- Django connection cleanup: `connections.close_all()` before external database operations
- Modal state management: Use enum state instead of multiple boolean flags

### 2026-01-22 (Local Backup & Security Improvements)
**Local Backup Feature:**
- Added local backup option to save backups to server filesystem
- Configurable via `LOCAL_BACKUP_DIR` in server .env
- Automatically keeps last 6 backups per user, deletes oldest
- Backup format: ZIP with database dump and user media files
- Can be used alongside S3 backup (both or either)

**Security Improvements:**
- S3 secret key is never returned in API responses (shows as `********`)
- Users can only enter NEW secret key value to change it
- Existing secret key cannot be viewed

### 2026-01-22 (Backup Feature & Toggle Fixes)
**Backup Feature Implemented:**
- Complete S3 backup integration with user-configurable settings
- Automatic backup scheduling (hourly to monthly intervals)
- Manual backup trigger on-demand
- Backup logs with success/failure/skipped status tracking
- "Only backup if new items added" option to save storage/bandwidth
- S3 connection testing before enabling backups
- Settings page UI for configuration (schedule, S3 credentials, intervals)

**Toggle Switch Fixes:**
- Fixed toggle switches positioning on Settings page
- Added `overflow-hidden` to prevent circle from overflowing container
- Corrected `translate-x` calculation using `calc(2.75rem-1.25rem-0.125rem)` for ON state
- OFF state stays at `translate-x-0.5` (left side)

**Key Patterns Established:**
- Backup format: ZIP file containing database dump (SQL/SQLite), items JSON, and user media files
- S3 key pattern: `keepr_backups/{user_id}/backup_{timestamp}.zip`
- Toggle switches: Always use `overflow-hidden` on container, calculate translate based on width

### 2026-01-22 (Bug Fixes & UX Improvements)
**Critical Fixes Applied:**
- Fixed button styling CSS (base styles not being applied)
- Improved tag creation flow with inline save/cancel buttons
- Added password visibility toggle and copy functionality
- Made feed text selectable (removed Link wrapper, added arrow button)
- Fixed tag filtering backend (`getlist()` vs `get()`)
- Fixed file upload CSRF error with manual session authentication

**Key Patterns Established:**
- FormData arrays: Send as `key` without `[]`, use `getlist("key")` in backend
- CSRF exemption: Use `@method_decorator(csrf_exempt, name='dispatch')` on class
- Manual auth: Check `request.session.get('_auth_user_id')` when bypassing DRF auth
- Password UX: Toggle visibility + copy button for usability

### 2026-01-21 (Late Evening - UI Finalization)
**UI Design Complete:**
- **FIRST ATTEMPT (REJECTED)**: Colorful gradients with emojis, glassmorphism
- **SECOND ATTEMPT (REJECTED)**: Black/gray/white minimal, but user wanted "unique and fun"
- **FINAL DESIGN (APPROVED)**: cobalt.tools aesthetic
  - Light mode: gray-100 background, white cards, black text
  - Dark mode: black background, black cards, white text
  - Lucide-react icons (replaced emojis)
  - No gradients or flashy colors
  - Visible borders (border-black/20, border-black/30)

**Description Field Removed:**
- User explicitly requested removal of description field
- Updated backend model, views, serializers
- Updated frontend types and components

### 2026-01-21 (Implementation Complete)
**Full Implementation:**
- Created complete Django backend with all apps (users, items, core)
- Created complete React frontend with all pages and components
- Implemented all core features: auth, CRUD, search, tags, file uploads
- Added dark/light theme with persistent storage
- Implemented video streaming with HTTP range headers
- Added Markdown rendering for text notes

### 2025-01-21 (Evening - Final Decisions)
**Tech Stack Finalized:**
- Backend: Django 5.0+ + DRF, session-based auth
- Frontend: React + Vite + Tailwind, Zustand, React Query, lucide-react icons
- Auth: Email/username login, Gmail SMTP verification
- Search: PostgreSQL full-text, title+content for text, filename for files
- File size limits: Text 100KB, Images 10MB, Videos 100MB, Other 20MB
- Tags: Custom colors from preset palette, assignable during upload
- Login items: username, password, URL
- Videos: Streamed via API with range headers
- Large files: Chunked upload >50MB with progress (deferred)
- Images: Serve original (no thumbnail generation)

### 2025-01-21 (Evening)
- **Backend changed**: Switched from Node.js to Django REST Framework
- **Rationale**: Django's built-in ORM, admin, auth, and DRF's serializers reduce boilerplate

### 2025-01-21 (Afternoon - Final)
- **Hybrid storage confirmed**: Text/content in database, binary files on filesystem
- **No encryption (MVP)**: Simplicity over maximum privacy

## Blockers
None currently

## Risks
1. **File content search**: Searching inside PDFs/docs requires external service (deferred)
2. **Email delivery**: Gmail SMTP has limits; may need dedicated service for scale
3. **Filesystem management**: Need proper cleanup when items are deleted (implemented)
4. **CSRF exemption**: FileUploadView bypasses CSRF - ensure this is acceptable for production
5. **Backup dependencies**: Requires boto3 library and proper S3 credentials management
