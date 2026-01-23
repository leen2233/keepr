# Active Context: Keepr

## Current Phase
**Feature Enhancement & Polish** - Core features complete, adding quality-of-life improvements and power user features

## Current Focus
Adding power user features: pin/favorite system, advanced keyboard shortcuts with key combinations, batch operations, and temporary link sharing. Settings page reorganized into tabs for better navigation.

## Recent Changes & Fixes (2026-01-23 - Session 4)

### Security Hardening Fixes
Critical security issues identified and fixed during codebase analysis:

#### Password Hashing (CRITICAL)
- **Before**: Plain SHA-256 without salt (vulnerable to rainbow table attacks)
- **After**: Django's `make_password()` and `check_password()` (PBKDF2-SHA256 with salt)
- **File**: `server/apps/items/models.py`
- **Note**: Existing shared item passwords will need to be re-set (format changed)

#### CSRF Protection (CRITICAL)
- **Before**: `csrf_exempt` decorator with manual session authentication
- **After**: Proper `SessionAuthentication` and `IsAuthenticated` permission classes
- **File**: `server/apps/items/views.py` - `FileUploadView`
- **Frontend fix**: API client now adds `csrfmiddlewaretoken` to FormData body AND `X-CSRFToken` header
- **Frontend fix**: `CreateItemPage.tsx` now uses `api` instance instead of `fetch()` directly
- **API client fix**: Removed default `Content-Type: application/json` to allow axios to set correct `multipart/form-data; boundary=...` header

#### N+1 Query Fix
- **Before**: `prefetch_related` called before filters, which could cause issues
- **After**: All filters applied first, then `prefetch_related` at the end
- **File**: `server/apps/items/views.py` - `ItemListView.get()`
- **Improvement**: Django properly caches related objects for final filtered queryset

### Other Code Quality Fixes
- Removed unused imports (`method_decorator`, `csrf_exempt`)
- Removed duplicate `from django.conf import settings`
- Added imports for `SessionAuthentication` and `IsAuthenticated`

## Recent Changes & Fixes (2026-01-23 - Session 3)

### Custom Share Paths & Password Protection
- **Custom slugs**: Users can create memorable share links like `/shared/my-vacation-photos/` instead of random UUIDs
- **Password protection**: Share links can be protected with a password - viewers must enter password to view
- **Slug reuse**: If a custom slug's share expires, the slug is automatically deleted and can be reused
- **Slug validation**: 3+ characters, alphanumeric with dashes and underscores only
- **API changes**:
  - `SharedItem` model: Added `slug` (SlugField) and `password_hash` fields
  - `CreateShareView`: Accepts `slug` and `password` parameters, validates and handles slug conflicts
  - `ViewSharedItemView`: Uses `<str:identifier>` in URL pattern to support both slugs and tokens
  - Password-protected shares return `requires_password: true` on GET, require POST with password
- **Frontend changes**:
  - Share modal: Added custom path input with preview `/shared/[custom-path]`
  - Share modal: Added password input with show/hide toggle
  - SharedItemPage: Shows password prompt for protected shares, no redirect on wrong password
  - Fixed error message display: Extracts actual API error messages instead of generic Axios errors
- **Bug fix**: API interceptor no longer redirects to login on 401 for shared item unlock attempts
- **Migration**: `0006_shareditem_slug_and_password.py` - adds slug and password_hash fields

## Recent Changes & Fixes (2026-01-23 - Session 2)

### New Features Implemented

#### Pin/Favorite System
- Added `is_pinned` boolean field to Item model (migration `0003_item_is_pinned.py`)
- Pinned items appear first in feed: `ordering = ("-is_pinned", "-created_at")`
- New `ItemPinToggleView` at `/api/items/<id>/pin/` - POST to toggle pin status
- Frontend: Pin/PinOff icons on ItemCard, FeedPage, and ItemDetailPage
- Pinned items show filled pin icon, unpinned show outline

#### Keyboard Shortcuts Enhancement
- **Removed Cmd/Ctrl+K shortcut** - replaced with type-to-search
- **Type-to-search**: When not in an input, start typing to auto-focus search bar with typed text
- **User-defined create shortcut**: Supports full key combinations (Ctrl+N, Shift+Enter, Alt+K, Cmd+N, etc.)
- Backend: Changed `create_shortcut` from max_length=1 to max_length=50 (migration `0004_alter_user_create_shortcut.py`)
- Frontend: New shortcut recorder UI with "Record" button - press any combo to capture
- Settings page shows formatted shortcuts (e.g., "Ctrl + Shift + N", "Cmd + Enter")
- Hook updated to parse and match key combinations with modifiers
- Single-letter shortcuts skip type-to-search to avoid conflicts

#### Batch Delete
- New `ItemBatchDeleteView` at `/api/items/batch-delete/` - accepts list of item IDs
- Frontend: Select mode toggle button with checkboxes on each item
- Select All / Clear buttons for batch operations
- Confirmation dialog before deleting multiple items
- Deletes files from filesystem and database items with cascade

#### Temporary Link Sharing
- New `SharedItem` model for shareable links (migration `0004_shareditem.py` includes multiple migrations)
- Fields: token (UUID), expires_at, max_access_count, access_count, created_at
- `is_valid()` method checks expiration and access limits
- Endpoints:
  - `POST /api/items/<id>/share/` - Create share link with expiration settings
  - `GET /api/items/<id>/shares/` - List all shares for an item
  - `DELETE /api/shares/<id>/` - Delete a share link
  - `GET /api/shared/<token>/` - Public endpoint to view shared item (no auth required)
- Share URL uses `FRONTEND_URL` setting (not backend URL)
- Frontend: Share button on ItemDetailPage, modal with expiration options (1h to 1 week)
- New `SharedItemPage` at `/shared/:token` - public view for shared items
- Login passwords on shared items: show/hide toggle + copy button

#### Create Page Auto-Focus
- Auto-focus content field when navigating to create new item page
- Text items → content textarea
- Login items → username field
- File items → file upload button

#### Settings Page Reorganization
- Split into tabs: General, Security, Data, Backup (staff only)
- General tab: Keyboard shortcuts configuration
- Security tab: Change password
- Data tab: Export/Import data
- Backup tab: Backup configuration (staff/superuser)
- Clean tab navigation with icons

### Backend Changes
- User model: `create_shortcut` field now accepts full key combinations (e.g., "ctrl+shift+n")
- `UpdateSettingsView`: Validation updated to accept key combinations (1-50 chars)
- `ItemPinToggleView`: Toggle endpoint for pin/unpin
- `ItemBatchDeleteView`: Batch delete endpoint with file cleanup
- `SharedItem` model: Token-based sharing with expiration and access limits
- `CreateShareView`: Generate share links with configurable expiration
- `ViewSharedItemView`: Public endpoint for shared items (no auth required)
- `ListSharesView`: List all shares for an item
- `DeleteShareView`: Delete share links

### Frontend Changes
- `use-keyboard-shortcuts.ts`: Complete rewrite for key combination support
  - `parseShortcut()`: Parse "ctrl+shift+n" into components
  - `formatShortcut()`: Format for display ("Ctrl + Shift + N")
  - `shortcutMatches()`: Match keyboard events to shortcuts
- `use-items.ts`: Added hooks for pin toggle, batch delete, shares
- `types.ts`: Added `SharedItem` interface, updated `Item` with `is_pinned`
- `SettingsPage.tsx`: Complete rewrite with tabbed interface and shortcut recorder
- `CreateItemPage.tsx`: Added auto-focus for content fields
- `SharedItemPage.tsx`: New page for viewing shared items
- `App.tsx`: Added route for `/shared/:token` (public, no auth)

### Migrations
- `0003_item_is_pinned.py`: Add is_pinned field to Item
- `0004_shareditem.py`: Create SharedItem model
- `0004_alter_user_create_shortcut.py`: Expand create_shortcut field (users app)

## Recent Changes & Fixes (2026-01-23 - Session 1)

### Permission Management
- Backup settings (S3, local, scheduling) now restricted to staff/superuser only
- Non-staff users see "Admin Access Required" message in Settings
- Added `is_staff` and `is_superuser` fields to User type and API responses (MeView, LoginView)

### Signup Control
- Added `ALLOW_SIGNUP` environment variable (defaults to `true`)
- When disabled, registration returns `SIGNUP_DISABLED` error with "This is a private server. Registration is disabled."
- Signup link remains visible but shows amber warning banner when clicked

### User Data Export
- New `ExportDataView` at `/api/export/data/` - all authenticated users can use
- Exports user's own data as downloadable ZIP (not stored on server)
- Export includes: items.json (with tags), tags.json, metadata.json, and user's media files
- Added "Export My Data" section to Settings page (visible to all users)

### Admin Full Backup
- Staff/superuser backups now include ALL users' items and media files
- Non-staff backups only include own data (personal backup)
- Different naming: `backup_full_backup_*.zip` vs `backup_{user_id}_*.zip`
- Different S3 paths: `keepr_backups/full_backups/` vs `keepr_backups/{user_id}/`
- Log messages indicate "Full backup" vs "Personal backup"

### Password Change Feature
- New `ChangePasswordView` at `/api/auth/change-password/`
- Requires: current password, new password (min 8 chars), confirm password
- Frontend validation for matching passwords and minimum length
- Uses `update_session_auth_hash` to keep user logged in after change
- Added "Change Password" section to Settings page with KeyRound icon

### Login Improvements
- Backend already supported username OR email login (query logic checks both)
- Updated frontend label from "Email" to "Email or Username"
- Changed input type from `email` to `text` for username compatibility
- LoginView now returns `is_staff` and `is_superuser` in response

### Bug Fixes
- **Export fix**: Changed `item.tags.all()` to `item.item_tags.all()` (correct relationship)
- **Export fix**: Removed `created_at` from tag export (Tag model doesn't have this field)
- **Login redirect fix**: API interceptor now checks if already on `/login` before redirecting on 401
- **Password logout fix**: Added `update_session_auth_hash` to preserve session after password change

### Import from Backup Feature
- New `ImportDataView` at `/api/import/data/` - supports personal and full imports
- **Personal import** (all users): Restores items, tags, and media from exported ZIP
- **Full import** (staff/superuser only): Restores complete database from admin backup
- File path matching handles subfolder structure (searches by filename suffix)
- Pre-import automatic backup creates `pre_import_restore_{timestamp}.zip` in `LOCAL_BACKUP_DIR`
- Double confirmation modal with clear warnings for full import
- Success message shows counts: database restored, files, items, tags, users
- Warning banner: "You have been logged out. Please log in again."

### Environment Variables Added
- `ALLOW_SIGNUP` - Enable/disable user registration (default: `true`)

## Recent Changes & Fixes (2026-01-22)

### Button Styling Fixes
- Fixed CSS to include base `.btn` styles in `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- All buttons now have proper padding, rounded corners, and consistent styling

### Tag Creation UX Improvement
- Added "Save tag" button to create new tags immediately (inline with form)
- Added "Cancel" button for tag creation
- Saved tags automatically become selectable
- Enter key support for quick tag saving

### Password Field Enhancements
- Added **Eye/EyeOff icons** to toggle password visibility
- Added **Copy icon** to copy password to clipboard
- Applied to both ItemDetailPage and FeedPage (login items)
- Password display in bordered input box with monospace font

### Feed Page Interactions
- Removed Link wrapper from entire card (text now selectable/copiable)
- Added arrow button (→) in top-right for navigation to item details
- Multiple password items can have independent visibility toggles

### Tag Filtering Backend Fix
- Fixed backend to use `getlist("tag_ids")` instead of `get("tag_ids")` for receiving multiple tag IDs
- Fixed frontend to send `tag_ids` without `[]` suffix (both FormData and regular requests)

### File Upload CSRF/Authentication Fix
- Added `@method_decorator(csrf_exempt, name='dispatch')` to FileUploadView
- Set `authentication_classes = []` and `permission_classes = []` to bypass DRF's built-in CSRF enforcement
- Added manual session-based authentication check using `request.session.get('_auth_user_id')`
- File upload now works correctly for authenticated users

### Backup Feature Implementation
- Full S3 backup integration with user-configurable settings
- **Local backup option** - saves to server directory (configured via LOCAL_BACKUP_DIR in .env)
- Automatic backup scheduling (hourly, 6-hourly, 12-hourly, daily, weekly, monthly)
- Manual backup trigger via Settings page
- Backup logs with success/failure/skipped status tracking
- "Only backup if new items added" option to save storage/bandwidth
- S3 connection testing before enabling backups (tests with current form values, saves manually)
- **Local backup keeps last 6 backups per user, deletes oldest automatically**
- **S3 secret key security** - never returned in API, shows as `********`, only enter new value to change
- Backup format: ZIP containing database dump and user media files

### Toggle Switch Fix
- Fixed toggle switches on Settings page (backup_on_new_item, local_backup_enabled, s3_enabled toggles)
- Added `overflow-hidden` to prevent circle from overflowing container border
- Corrected `translate-x` calculation: ON state uses `translate-x-5` (20px), OFF state uses `translate-x-1` (4px)
- Circle background: ON state uses `bg-neutral-900`, OFF state uses `bg-white`
- Circle now properly positions left (OFF) and right (ON) without overflow

## Recent Decisions

### UI Design Evolution (2026-01-21)
**FINAL DESIGN: cobalt.tools-inspired minimalist aesthetic**

1. **Light Mode**: Gray-100 background with white cards, black text
2. **Dark Mode**: Pure black background with black cards, white text (inverted)
3. **Primary Buttons**: Black/white with inverted colors per theme
4. **Borders**: More visible (border-black/20 for cards, border-black/30 for inputs)
5. **Icons**: Lucide-react icons throughout (replaced emojis)
6. **No gradients**: Flat, clean design
7. **Rounded corners**: Consistent rounded-lg (8px) or rounded-xl (12px)

**Design Rejected**: Colorful gradients with emojis (user explicitly rejected)

### Description Field Removal (2026-01-21)
- Removed `description` field from Item model
- Removed all description handling from views and serializers
- Items now only have: title (optional), content (type-specific), tags

### Architecture Choices (Confirmed)
1. **Hybrid storage**: Text/content in PostgreSQL, binary files on filesystem
2. **No encryption (MVP)**: Simplicity over maximum privacy
3. **Tag-based organization**: No folders, flexible tag system with custom colors
4. **Search strategy**: Full-text search on database content, filename search for files
5. **Auth flow**: Email/username + password with email verification
6. **Video streaming**: Stream via API with range headers
7. **Themes**: Dark + Light mode (cobalt.tools aesthetic)

### Backend Framework (CONFIRMED)
Django REST Framework with:
- DRF built-in session auth (`SessionAuthentication`, `IsAuthenticated`)
- Django's built-in password hashing (`make_password`, `check_password`)
- Custom file upload validators
- django-cors-headers
- EmailVerificationToken model for proper verification flow
- **CSRF**: All views use proper DRF authentication classes (no more `csrf_exempt`)

### Frontend (CONFIRMED)
- React + Vite + Tailwind CSS
- Zustand for state management
- React Query for data fetching
- Lucide-react icons
- Dark + Light themes with black background in dark mode
- Markdown support for text notes

## Next Steps

### Immediate (Testing Phase)
1. **End-to-end testing**: Test all user flows with working file upload
2. **Bug fixes**: Address any remaining issues found during testing
3. **Verify tag filtering works**: Create new items with tags and test filtering

### Short-term (Deployment Prep)
1. **Database setup**: Run PostgreSQL and migrations
2. **Environment configuration**: Set up .env files
3. **Docker Compose setup**: For easy local development
4. **README documentation**: Setup and usage instructions

## Active Considerations

### Design Questions Resolved
1. **Typography**: System fonts for clean look (Tailwind defaults)
2. **Color scheme**: Black/white/gray only (cobalt.tools inspired)
3. **Icons**: Lucide-react throughout
4. **Borders**: border-black/20 (visible but subtle)

### Technical Questions Resolved
1. **CORS configuration**: django-cors-headers configured
2. **Chunked upload**: Deferred (not implemented for MVP)
3. **CSRF for file uploads**: Use `SessionAuthentication` and `IsAuthenticated` - no more `csrf_exempt`
4. **FormData array handling**: Use `key` without `[]` suffix, backend uses `getlist()`
5. **Password hashing**: Use Django's `make_password()` and `check_password()` (PBKDF2-SHA256)
6. **N+1 queries**: Apply filters first, then `prefetch_related` at the end

## Design Preferences (CURRENT)
- **cobalt.tools aesthetic**: Minimal, clean, high contrast
- **Light mode**: Gray-100 background, white cards, black text
- **Dark mode**: Black background, black cards, white text
- **Borders**: Visible (border-black/20, border-black/30)
- **Buttons**: Inverted between themes
- **Icons**: Lucide-react only
- **No animations**: Subtle transitions only
- **Tag colors**: From preset palette (only color in UI besides B&W)

## Code Preferences
- TypeScript strict mode
- Functional components, hooks
- No class components
- Explicit types over `any`
- Small, focused functions
- Clear separation of concerns

## Important Patterns
- API-first design: define contracts before implementing
- Error boundaries: handle failures gracefully
- Dark mode via `.dark` class on html/body
- Zustand for global state (auth, filters, theme)
- React Query for server state
- **FormData handling**: Use `key` without `[]`, backend uses `getlist("key")`
- **FormData booleans**: Backend must check string values `"true"`, `"1"`, `"yes"` (not boolean `True`)
- **CSRF protection**: Use `SessionAuthentication` and `IsAuthenticated` for all views (including file uploads)
- **CSRF in frontend**: API client automatically adds `X-CSRFToken` header AND `csrfmiddlewaretoken` to FormData
- **Backup**: S3 backups use boto3, ZIP format with database dump + items JSON + media files
- **Toggle switches**: Always use `overflow-hidden` on container, calculate `translate-x` based on width (ON: `calc(2.75rem-1.25rem-0.125rem)`, OFF: `translate-x-0.5`)
- **Item-Tag relationship**: Access via `item.item_tags.all()`, then `item_tag.tag` (not `item.tags`)
- **Permission checks**: Use `request.user.is_staff or request.user.is_superuser` for admin-only features
- **Session preservation**: Use `update_session_auth_hash(request, request.user)` after password change
- **API interceptor guard**: Check `!window.location.pathname.startsWith("/login")` before redirecting on 401
- **Modal state machine**: Use enum state (`"none" | "warning" | "confirm"`) instead of multiple booleans
- **File path matching in ZIP**: Use `path.startswith("media/") and path.endswith(filename)` to handle subfolders
- **Django connection cleanup**: Use `connections.close_all()` before external database operations (pg_dump/psql)
- **Pre-import backup**: Create in temp, then `shutil.move()` to `LOCAL_BACKUP_DIR` for safety
