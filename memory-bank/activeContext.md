# Active Context: Keepr

## Current Phase
**UI/UX Refinement & Bug Fixes** - Design complete, testing in progress, fixing issues

## Current Focus
Testing the application and fixing bugs as they arise. The UI has been redesigned to match cobalt.tools aesthetic - clean, minimal, with excellent light/dark mode support.

## Recent Changes & Fixes (2026-01-23)

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
- DRF built-in session auth
- Custom file upload validators
- django-cors-headers
- EmailVerificationToken model for proper verification flow
- **Important**: FileUploadView uses manual session authentication (bypasses DRF CSRF)

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
3. **CSRF for file uploads**: Manual session authentication bypasses DRF CSRF
4. **FormData array handling**: Use `key` without `[]` suffix, backend uses `getlist()`

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
- **CSRF exemption**: Use `@method_decorator(csrf_exempt, name='dispatch')` + manual auth check
- **Backup**: S3 backups use boto3, ZIP format with database dump + items JSON + media files
- **Toggle switches**: Always use `overflow-hidden` on container, calculate `translate-x` based on width (ON: `calc(2.75rem-1.25rem-0.125rem)`, OFF: `translate-x-0.5`)
- **Item-Tag relationship**: Access via `item.item_tags.all()`, then `item_tag.tag` (not `item.tags`)
- **Permission checks**: Use `request.user.is_staff or request.user.is_superuser` for admin-only features
- **Session preservation**: Use `update_session_auth_hash(request, request.user)` after password change
- **API interceptor guard**: Check `!window.location.pathname.startsWith("/login")` before redirecting on 401
