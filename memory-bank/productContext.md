# Product Context: Keepr

## Why Keepr Exists

### The Problem
Digital information is fragmented:
- Passwords go in LastPass/1Password
- Notes go in Notion/Apple Notes
- Files go in Google Drive/Dropbox
- Images go in Google Photos
- Nothing ties it all together

Users are forced to remember **where** they stored something, not just **what** they stored.

### The Solution
One elastic archive for everything. Store it, tag it, find it. Simple.

## How It Works

### Core User Journey

**1. Quick Capture**
```
User clicks "Add New" → Selects type → Enters content → Adds description (optional) → Adds tags → Saves
```
- Minimal form upfront (title optional, description optional)
- Type selection is just for rendering (not rigid schemas)
- Tags can be assigned during creation (optional but encouraged)
- Description helps with searchability for file/media items

**2. Discover & Find**
```
Feed View (all items) → Search bar always visible → Tag filters on side
```
- Default: chronological feed
- Search: instant, filters as you type
- Tag filtering: click to add/remove filters

**3. View & Edit**
```
Click item → View details → Edit → Save changes
```
- Clean, focused view
- Edit in place

### Content Types & Rendering

| Type | Stored As | Displayed As |
|------|-----------|--------------|
| Plain Text | String in database | Markdown-rendered block |
| Login Info | JSON (username, password, url) in database | Credential card with reveal password |
| Image | File on filesystem | Preview thumbnail + lightbox |
| Video | File on filesystem | Video player (streamed via API) |
| File | File on filesystem | Download button + metadata |

## User Experience Goals

### Visual Principles
1. **Whitespace is luxury** - let content breathe
2. **Typography carries personality** - distinct font choices
3. **Subtle motion** - micro-interactions that feel good
4. **Dark mode first** - optically friendly default

### Interaction Principles
1. **Keyboard-first** - power users should never touch mouse
2. **Instant feedback** - no spinners, optimistic updates
3. **Progressive disclosure** - show simple, reveal complexity when needed

### Emotional Response
Users should feel:
- **Relief** - "Finally, I can just put it somewhere"
- **Control** - "I decide what's private"
- **Confidence** - "I'll find this when I need it"
