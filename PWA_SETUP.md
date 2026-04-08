# PWA & Backend Runtime Configuration Guide

## What's New

Your PrepPath app now has:

1. **Full PWA Support** — Install as a native app on PC, Android, and iOS.
2. **Runtime Backend Configuration** — Change backend URL without redeploying.
3. **Offline Support** — App works offline using service worker caching.
4. **Background Sync** — Data syncs when connection returns.

---

## How to Use

### 1. Install the App

**On Desktop (Chrome/Edge/Firefox):**

- Open the app in your browser
- Click the ⚙ settings button (bottom-right corner)
- Check "Show app install prompt"
- Click "Save"
- Look for "Install app" in the browser address bar or menu
- Click it to install

**On Android:**

- Open app in Chrome browser
- Tap the 3-dot menu → "Install app" or "Add to home screen"
- Confirm

**On iPhone (iOS):**

- Open app in Safari
- Tap Share button → "Add to Home Screen"
- Confirm

### 2. Change Backend URL

Without redeploying:

1. Click the ⚙ button (bottom-right)
2. In "Backend URL" field, change the URL:
   - Local: `http://localhost:3001`
   - Render: `https://preppath-api.onrender.com`
   - Railway: `https://preppath-api.up.railway.app`
3. Click "Save"
4. Reload the page
5. App will now use the new backend

### 3. Offline Support

- App automatically caches all pages and assets
- When offline, cached data is used
- Click "Sync Now" when connection returns to push any offline changes

### 4. Check Service Worker Status

**In Chrome DevTools:**

1. Press `F12` → Application tab
2. Service Workers (left sidebar)
3. You'll see the registered service worker and cache storage

---

## Technical Details

- **Manifest:** `manifest.json` — defines app metadata, icons, shortcuts
- **Service Worker:** `sw.js` — handles caching and offline support
- **PWA UI:** `pwa-ui.js` — settings panel for runtime configuration
- **Storage:** Backend URL stored in `localStorage` under key `pp3_settings`

---

## Deployment Notes

When deploying to production:

1. **Frontend:** Deploy to GitHub Pages as before
   - PWA will work from any URL
   - Settings panel lets users configure backend remotely

2. **Backend:** Deploy to Render/Railway
   - Get the public URL (e.g., `https://preppath-api.onrender.com`)
   - Users configure this in the app settings
   - No need to rebuild/redeploy frontend when backend changes

3. **CORS:** Ensure backend `.env` includes your domain:
   ```
   ALLOWED_ORIGINS=http://localhost:3000,https://YOUR-DOMAIN.com,https://YOUR-USERNAME.github.io
   ```

---

## Offline-First Architecture

```
User types input
     ↓
Saved to localStorage (instant)
     ↓
Service Worker active? → Cached for offline
     ↓
Try sync to backend (async, in background)
     ↓
If backend unreachable → Show status in UI
     ↓
When connection returns → Sync button pushes pending changes
```

This means your app works flawlessly even on unreliable connections or completely offline.

---

## Testing Offline Mode

1. Start with backend running
2. Create some data (tasks, journal entries)
3. In DevTools → Network tab, set throttling to "Offline"
4. Try adding more data — it saves to localStorage
5. Refresh page — data persists from cache
6. Go back online and click "Sync Now"
