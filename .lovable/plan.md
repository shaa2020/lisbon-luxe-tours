# Faster homepage + staff roles (Owner / Manager / Staff)

Two things: make the first visit to the homepage feel instant, and give every admin page and button proper role-based access.

## Part 1 — Speed up the homepage first load

What happens today: the homepage renders no real content on the server. The browser first downloads the app, then asks the backend for site settings, tours, journal posts and reviews, and only after that does the hero image start downloading. That is why you see a blank/skeleton stage before anything appears.

Changes:

1. Server-render the above-the-fold content. The home route gets a loader that pre-fetches site settings and published tours on the server, so the hero, headline, nav and first tour cards arrive already filled in with the HTML.
2. Preload the hero image. The hero URL is emitted as a `preload` link in the route head with high priority, so it downloads in parallel with the page instead of after it.
3. Load below-the-fold sections lazily. Reviews, testimonials, journal cards and the booking modal are only fetched/mounted when they are near the viewport, instead of competing with the hero on first paint.
4. Cache site settings longer and share one request. Right now several components each subscribe to settings with a 60s stale time; this becomes a single query with a longer stale time plus SSR hydration, so no refetch storm on load.
5. Image delivery: hero and card images get width/height attributes (no layout shift), `fetchpriority=high` on the hero, `loading=lazy` + `decoding=async` everywhere else, and bundled fallback assets are compressed.

No visual redesign — the homepage looks the same, it just appears sooner.

## Part 2 — Role-based access control

Three roles:

- **Owner** — full access, including Settings, Payments, Discounts, Emails, Team.
- **Manager** — Bookings, Orders, Tours, Journal, Guide, Reviews, FAQs, Messages, Ops, Marketing/banner. No Settings, Payments/Gateways, Discounts, Team.
- **Staff** — Bookings and Ops day-to-day only: view bookings, update status, send booking emails/WhatsApp. Cannot delete bookings, refund, edit tours/content or see revenue.

### Team page

New **Admin → Team** page (Owner only): list current members with role, invite a new member by email, change a member's role, revoke access. Existing admin accounts are migrated to Owner so nothing locks you out.

### Where the rules apply

- **Routes** — each admin route declares the permission it needs; users without it are redirected to the dashboard with a clear "no access" notice, and the sidebar/bottom tabs hide sections they cannot open.
- **Buttons** — destructive and financial actions (delete, refund, change price, edit settings, send payment request) are hidden or disabled per role, with a tooltip explaining why.
- **Server side** — every admin server function re-checks the caller's role. Hiding a button is not security; the backend refuses the action too, so a Staff account cannot delete a booking even by calling the endpoint directly.
- **Revenue** — the dashboard KPI strip and Orders page are Owner/Manager only; Staff sees bookings without money figures.

## Technical notes

- Database: extend the `app_role` enum with `owner`, `manager`, `staff` (keeping `admin` as an alias for owner during migration), add a `profiles` table for member name/email display, and keep roles in the existing `user_roles` table. A `has_min_role(uid, role)` security-definer function backs both RLS policies and server checks.
- Auth context (`src/lib/auth.tsx`) gains `role`, `hasRole`, `can(permission)`; a single permission map (`src/lib/permissions.ts`) is the one source of truth used by the sidebar, route guards and buttons.
- Admin server functions swap their inline "is admin" lookups for a shared `requireRole('manager' | 'owner')` middleware.
- Homepage SSR uses a route loader with `ensureQueryData` on the existing public site-settings and tours server functions; no new endpoints.
