# Installable Admin App (admin panel only)

Goal: you, your manager and staff can install just the admin panel on a phone, tablet or desktop — it opens full-screen straight into the dashboard, with its own icon, no browser bar, and no public website chrome.

## What you get

1. **Separate admin app identity.** A dedicated install profile named "TukTuk24 Admin" with its own icon, scoped to `/admin` and starting at `/admin`. Installing it never installs the public website, and the public site keeps its own existing profile.
2. **Install button inside the admin panel.** A small "Install app" button in the admin top bar appears when the browser supports installing. Tapping it triggers the native install prompt; it hides itself once installed. On iPhone/iPad (which has no prompt API) it opens a short "Share → Add to Home Screen" instruction sheet instead.
3. **App-like behaviour once installed.** Full-screen standalone window, brand colours in the status bar, portrait-friendly layout (the admin UI is already responsive), and app shortcuts on long-press: Bookings, Today's Ops, Messages.
4. **Login persistence.** The installed app keeps the signed-in session like the browser does, so staff open it and land on the dashboard. Role rules still apply — Manager and Staff see only what their role allows.
5. **Shareable install link.** A simple `/admin/login` link you can send to staff; opening it in Chrome/Safari and using the install button adds the app to their home screen.

Not included unless you want it: offline mode / background sync (bookings would need cached data and conflict handling) and push notifications for new bookings. Both are bigger pieces — say the word and I'll plan them separately.

## Technical notes

- New `public/admin.webmanifest`: `name` "TukTuk24 Admin", `short_name` "TT24 Admin", `start_url` `/admin?source=pwa`, `scope` `/admin`, `display: standalone`, brand `theme_color`, plus `shortcuts` to `/admin/bookings`, `/admin/ops/today`, `/admin/messages`.
- New admin icons (192/512 maskable) generated into `public/`, distinct from the public-site icons.
- `src/routes/__root.tsx` currently hard-links `/manifest.webmanifest` and an admin-flavoured `apple-mobile-web-app-title`. The manifest link plus Apple meta move to be path-aware: admin routes get `admin.webmanifest` and the admin title; public routes keep the site manifest and a site title.
- New `src/components/admin/InstallAppButton.tsx`: listens for `beforeinstallprompt`, stores the deferred event, renders the button in `AdminShell`'s top bar (and in the mobile menu), calls `prompt()` on click, hides on `appinstalled` or when `display-mode: standalone` matches. iOS branch renders a dialog with Share-sheet steps.
- Installability requires a service worker in Chrome. Add a minimal `public/admin-sw.js` (network-first, no offline caching of API data) registered only from admin routes, so installs are offered without changing data freshness anywhere.
