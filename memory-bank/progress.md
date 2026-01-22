# Progress: Keepr

## Current Status
**Testing & Bug Fixing Phase** - All core features implemented, UI redesigned to cobalt.tools aesthetic, actively testing and fixing issues

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
- [x] Django models (User, Item, Tag, ItemTag, EmailVerificationToken)
- [x] Authentication views (Register, Login, Logout, Me, Verify)
- [x] Items views (CRUD, Search, FileUpload, FileServe)
- [x] Tags views (CRUD)
- [x] Custom exception handler
- [x] React + Vite + Tailwind frontend setup
- [x] Zustand state management (auth, filters, theme, modal)
- [x] React Query for data fetching
- [x] API client with axios
- [x] All UI components (Layout, ItemCard, TagBadge, SearchBar, ItemTypeFilter, TagFilter)
- [x] All pages (Login, Feed, CreateItem, ItemDetail, Search, VerifyEmail)
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
4. **Backup strategy**: Must backup both database and uploads directory
5. **CSRF exemption**: FileUploadView bypasses CSRF - ensure this is acceptable for production
