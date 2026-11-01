# TukTuk24 independent migration audit

Audit date: 1 November 2026 (UTC). Destination confirmed by owner: Hostinger VPS with a separately owned Supabase-compatible backend. This report describes evidence and preparation requirements, not a completed migration.

## 1. Status and boundaries

**No application runtime, production database, users, storage files, payment settings, email service, scheduler or DNS was changed during this audit.** Only audit documentation, the migration task list and project safety preferences were saved.

The application can retain its existing design and full-stack architecture. A static upload to Hostinger is insufficient. Moving hosting does not disconnect this Lovable project's Cloud connection; independent production must use a separately configured deployment and backend.

The audit inspected the route and server-module inventories, dependency/build setup, both SQL histories, generated clients, role/authentication flow, provider integrations, media pointers, PWA files, and live database metadata. Public browser checks were performed against the current preview. External account ownership, VPS resources, provider configuration and deployed legacy Edge Functions were not verified.

## 2. Verified inventory

| Category | Evidence |
| --- | --- |
| Frontend | React 19, TanStack Start/Router, React Query, Vite 7, Tailwind 4, Radix UI |
| Route source files | 122, including 29 server-handler files and 52 admin route files; these are not counts of unique URLs |
| Server logic | 133 `createServerFn` declarations; 25 `.server.ts` modules |
| Live application tables | 70 public tables, all with RLS enabled |
| Live columns/indexes/constraints | 860 public columns, 152 public indexes, 163 public constraints including 51 foreign keys |
| Policies | 164 across public/private/storage schemas |
| Views | `public.reviews_public` |
| Roles | Enum: admin, owner, manager, staff; one owner, one admin and one manager membership observed |
| Auth accounts | 5, counted without exporting identities or password material |
| Storage | Public `media` bucket, 44 stored objects; no bucket-specific size/MIME restrictions observed |
| SQL history | 77 Supabase SQL files and 19 Drizzle SQL files, plus metadata |
| Static media | Six asset-pointer JSON files, which do not contain the image bytes |
| Installed apps | Customer/admin/guide manifests and icons; root-scoped push service worker |
| Scheduled work | Booking emails daily at 09:00 UTC; website status every five minutes |
| Automated test suite | No existing test/spec files discovered |

Live extension inventory: `plpgsql`, `pg_stat_statements`, `uuid-ossp`, `pgcrypto`, `supabase_vault`, `pg_net`, `pg_cron`, `pgmq`. Metadata visibility differs by catalog: information_schema returned zero visible grants/constraints, whereas direct PostgreSQL catalogs confirmed constraints and ACL entries. Zero visibility must not be interpreted as absence.

### Application table inventory

Content: tours, tour_options, blog_posts, faqs, destinations, business_knowledge, seo_keywords, ai_generation_log, content_translations.

Travel publishing: travel_categories, travel_tags, travel_guides, travel_guide_tags, travel_guide_faqs, travel_guide_redirects, travel_guide_related_articles, travel_guide_related_tours.

Commerce/customers: bookings, booking_events, booking_modifications, booking_payments, orders, reviews, custom_tour_components, contact_messages, leads, meetup_points, tour_meetup_points, admin_audit_log, commission_rate_history, guide_settlements, cruise_arrivals.

Identity/configuration/API: profiles, user_roles, site_settings, private_settings, site_status_checks, api_keys, api_request_logs, push_subscriptions.

Payments/promotions: payment_gateways, payment_gateway_secrets, discount_codes, discount_redemptions, promotions, promotion_events.

Messaging: conversations, conversation_messages, subscribers, email_templates, email_send_log, email_send_state, email_unsubscribe_tokens, suppressed_emails, guest_message_templates, guest_message_log.

Operations: ops_booking_activities, ops_bookings, ops_change_requests, ops_customers, ops_partners, ops_payments, ops_settings, ops_staff, ops_tours, ops_vehicles.

Research: web_intel_settings, research_jobs, research_leads, firecrawl_usage_log.

## 3. Cloud dependencies and replacement requirements

| Dependency | Confirmed implementation | Independent replacement / preservation |
| --- | --- | --- |
| Build/runtime | `vite.config.ts` imports Lovable Vite configuration and MCP plugin; current output defaults to Cloudflare | Standard Vite + TanStack Start + Nitro Node-server configuration in a separately packaged deployment; preserve custom server entry/error behavior |
| Database | Browser/server Supabase clients, PostgREST, RLS and SQL RPCs throughout application | Separately owned Supabase is lowest-change path; PostgreSQL alone does not provide Auth, PostgREST, Storage or RPC API |
| Browser authentication | Supabase password auth with Lovable editor preview-storage broker | Independent client with normal browser session storage; retain hosted-preview behavior in the original project |
| Server authentication | Bearer middleware validates claims and caller-scoped reads; role checks in `src/lib/roles.ts` | Preserve token verification and role checks, including direct RPC/API denial tests |
| Assets | Six `/__l5e/assets-v1/...` pointers and social-image URL; database media also uses current storage origins | Obtain actual image bytes, preserve object paths, serve independently and map old origins in source/data |
| Stripe | `src/lib/payments.server.ts` calls Lovable connector gateway, not Stripe directly | Direct Stripe adapter using owner's account and webhook signing secrets; preserve sessions, IDs, metadata, idempotency and ledger |
| Mollie/PayPal | Direct provider APIs with encrypted database overrides | Retain provider accounts/modes and re-enter credentials securely; verify capture, refund, deposit, balance and tip handling |
| AI tools | Blog writer, tour builder and research extraction use Lovable gateway | Direct provider adapter with compatible structured responses; preserve feature behavior and output limits; account authorization required |
| Firecrawl | Lovable connector gateway, local monthly accounting | Owner's direct connector credentials and provider-side free-only restriction; never enable paid usage; validate concurrency-safe budget enforcement |
| App email | Lovable email SDK, queue worker, suppression webhooks | Independent verified sender + delivery adapter; preserve retries, idempotency, TTL, suppression, unsubscribe and delivery history |
| Auth email | Lovable webhook verification/templates and managed auth hook | Independent backend SMTP or supported auth hook; preserve all auth actions/templates and confirm delivery before enabling |
| Queue infrastructure | PGMQ queues, pg_net, pg_cron, Vault secret and wake/dispatch routines | Provision target equivalents; recreate operational secrets rather than copying managed Vault encryption material |
| Push | VAPID keys, stored subscriptions and root-scoped worker | Preserve compatible keypair or deliberately re-enrol devices; same production origin reduces disruption |
| Guide sessions | PIN hashing, token links, 12-hour HMAC passes | Preserve PIN hashes/salts, link tokens, lock state; provision session secret or deliberately invalidate passes |
| MCP/OAuth | Lovable MCP SDK, OAuth issuer, consent/discovery routes and tool implementations | Retain all interfaces; investigate whether SDK is standalone or replace with independent MCP implementation; issuer changes need client reauthorization |
| Scheduling | Cron routes and hardcoded Lovable production targets | Parameterized target jobs initially disabled; activate only one worker/scheduler set after approval |
| Platform analytics | Existing website GA/GTM plus Lovable editor traffic reporting | Preserve GA/GTM; Lovable editor analytics/scan dashboards are platform services, not independently hosted app screens |

### Email DNS evidence

`notify.tuktuk24lisbon.com` is verified and delegated to `ns3.lovable.cloud` and `ns4.lovable.cloud`. Keep it untouched during preparation. An independent sender can use a different subdomain in parallel. Reusing `notify` later requires a separately approved email cutover; disabling the service does not remove its DNS delegation. Propagation may take up to 72 hours.

The hosted email check reported 31 sent emails in seven days and five earlier dead-lettered failures. No messages were sent or retried by this audit. Preserve queue history; do not automatically resend historical failures at the destination.

## 4. Hosting and routing strategy

Use the confirmed Hostinger VPS with a full-stack Node/Nitro server, HTTPS reverse proxy, process supervision and restricted firewall. Node version must satisfy the exact installed package engine requirements; verify that before producing the deployment image.

`src/server.ts` is a Fetch-style framework entry, not an executable HTTP listener. A Node deployment needs an adapter-generated entry such as `.output/server/index.mjs`; actual output must be verified. `package.json` currently lacks a production start script and explicit Node engine.

Do not deploy the current `vercel.json` catch-all rewrite as a Hostinger template. Do not add an SPA fallback that rewrites APIs to `/`. Nginx must preserve original paths and proxy dynamic requests to Node, while static files are served from the generated public output. TanStack routing stays intact.

Preserve public catalogue/content routes, admin routes, guest `/trip` and `/tip` links, guide token routes, booking management/balance/invoice pages, locale rewrites `/pt` and `/es`, sitemap, robots rules, email/unsubscribe paths, OAuth discovery/consent, MCP and every existing API contract.

### External API contracts

Preserve methods, response envelopes, authorization scopes, API key hashes, CORS, rate limits, logging and trailing-slash behavior:

- GET `/api/v1/tours/`, `/api/v1/tours/:id`, `/api/v1/tours/slug/:slug`
- GET `/api/v1/availability`, `/api/v1/ai/tours`, `/api/v1/ai/business`
- POST `/api/v1/leads`
- GET/POST `/api/v1/booking-requests`
- POST `/api/v1/customers/`; GET `/api/v1/customers/:id`
- POST `/api/v1/conversations/`; GET `/api/v1/conversations/:id`
- POST `/api/v1/conversations/:id/messages`
- GET/POST `/api/v1/webhooks/whatsapp`
- Payment callbacks under `/api/public/payments/*`; cron routes under `/api/public/cron/*`

## 5. Database restore findings

**The source migrations are not a certified clean-restore package.** `drizzle/schema.ts` is empty by design and inspected Drizzle snapshots contain no table baseline. The two histories lack a demonstrated unified replay order.

Specific restore blockers:

1. Email wake/dispatch routines are referenced in SQL history but their definitions were not found there; they exist in the live catalog and were provisioned out of band.
2. Policies depend on both `private.has_role` and `authz.has_min_role`. Audit queries confirmed the latter in the separate `authz` schema. Their compatibility semantics and schema/function grants must survive migration.
3. Enum additions and dependent uses require appropriate transaction ordering.
4. Queues, Vault, cron, auth and storage internals require target provisioning, not just application DDL.
5. Historical migrations contain password/bootstrap mutations, secret-mode changes/deletions, token backfills and data seeds. They must not be replayed indiscriminately over restored production data.
6. A historical auth-bootstrap migration contains embedded credentials. Do not publish an unreviewed source archive or replay that block. Redact it in the independent delivery without altering production history; assess credential rotation separately with approval.

Live routines observed include booking references, timestamps, review validation/sanitization, travel-guide redirects, role ranking/helpers and email queue RPC/wake/dispatch functions. There are 43 non-internal triggers in the inspected public/auth/pgmq scope. A complete export—not reconstructed table definitions—is the authoritative preservation artifact.

### Official production export: owner action required

Open **More → Database → Manage → Settings → Export data**, choose the Database export, start it and download the export. It includes database structure/data and user password hashes. It excludes storage bytes, secrets, provider settings and Edge Function source. Limits: database up to 15 GB, export file up to 5 GB, one export per 24 hours; backend must be running.

No full database dump was run or generated by the agent. Do not write a paging script to rebuild Auth users. Transfer the official export through a restricted channel and restore it into a disposable target first. Storage files must be downloaded separately from **More → Storage**; the agent must not create service-role bulk-copy code for managed storage. Target import tooling can accept those downloaded files.

Daily database backups do not cover storage, and backup timestamps were not inspected. No backup/restore guarantees are made here.

## 6. Identity, encrypted secrets and existing links

Preserve Auth UUIDs and password hashes through the supported export/restore process, profiles, role memberships, guide links, guest links, unsubscribe tokens, API key hashes and payment provider IDs. A new backend issuer can require users and integration clients to sign in again even when account IDs/passwords survive.

Admin role bootstrap in `src/lib/auth.tsx` attempts browser-side first-owner insertion, but current role management requires an existing owner. Do not rely on that bootstrap at the destination. Restore existing roles and verify with a trusted administrative account.

Encrypted payment credentials need the matching `GATEWAY_SECRET_ENC_KEY`; ciphertext alone cannot restore usable credentials. Existing managed private secret values are not available for handover. Re-enter provider credentials securely on the independent installation, re-encrypt with an independently owned key and verify before activation. Similarly provision guide-session, cron and VAPID credentials with explicit continuity/re-enrolment decisions. Never include secrets, password hashes, token rows or ciphertext data in a public source package.

## 7. Configuration inventory (names only)

Separate browser build-time configuration from server runtime secrets. Blank documentation entries are not usable credentials.

Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

Backend: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; schema-tooling may also need `SUPABASE_DB_URL` at the independently owned destination.

Sessions/push/scheduling: `GUIDE_SESSION_SECRET`, `GATEWAY_SECRET_ENC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.

API/security: `BOOKING_API_KEY`, `API_ALLOWED_ORIGINS`, `API_RATE_LIMIT_PER_MINUTE`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`.

Providers: Stripe live/sandbox keys and webhook secrets; Mollie API/live/test keys; PayPal live/sandbox client IDs and secrets; `GOOGLE_PLACES_API_KEY`; independently owned AI, email and Firecrawl credentials.

Current Lovable-only settings to replace, not hand over: `LOVABLE_API_KEY`, `LOVABLE_SEND_URL`, connector-managed credentials and the Vault operational secret reference. Existing Stripe variable names describe connector credentials and cannot be blindly reused as direct Stripe keys.

## 8. Validation performed and outstanding

### Actually checked

- Read-only live catalog: table/RLS/schema counts, constraints/indexes, policies, functions, views, enums, role membership counts, account count, bucket/object count and active cron schedules.
- Hosted email domain/queue health and Auth Site URL/redirect configuration.
- Preview browser navigation: `/`, `/tours`, `/admin/login`, `/pt`, `/es` returned HTTP 200.
- Homepage/localized pages each contained 33 loaded image elements with zero completed broken images; tours contained 15 with zero completed broken images. This does not establish coverage of lazy/offscreen or stored media.
- Login page resolved to `/admin/login?redirect=%2Fadmin`; no login was attempted.
- Reviewed hosted security results: current database and MCP scans returned no findings. Connector scan incomplete/outdated; dependency scan outdated. No recent deep-scan result was returned. Run a deep review from Security before claiming broad security coverage.

### Not checked or completed

- Production Node build, independent artifact startup or VPS deployment.
- Authenticated admin/guide/customer flows, target RLS and CRUD, upload/delete permissions.
- Actual payment captures/refunds/webhook replay, email delivery/retry/suppression/auth messages, push receipt, AI or Firecrawl provider calls.
- Complete mobile/desktop visual comparison, all dynamic routes, storage payload checksums, target restore or counts.
- Existing legacy Edge Function deployment inventory: no `supabase/functions` source directory exists in this checkout. Do not claim there are none deployed.

No live booking, email, payment, cron or storage mutation was used for testing. No independent environment exists yet, so target end-to-end verification is blocked.

## 9. Safe transfer, cutover and rollback

1. Keep the current site/domain/backend active. Prepare an isolated VPS staging hostname, independently owned backend and email sender; outbound schedulers disabled.
2. Obtain official database export and separate storage download. Restore a rehearsal copy; compare complete schema/data counts and sampled references without exposing customer data.
3. Preserve both SQL histories as reviewed reference, but use the authoritative export as the restore basis. Separate optional non-sensitive seeds and target activation scripts from restoration.
4. Configure independently owned provider credentials, email/Auth callbacks, MCP issuer/client authorization and VAPID/session strategy. Use sandbox payments and designated test recipients.
5. Validate all feature families and denial paths. Block cutover until critical checks pass.
6. For final data synchronization, obtain separate approval for a short write-control window or a proven one-way replication strategy. A single old export while new bookings continue is not safe. DNS alone does not give zero downtime or consistency.
7. Lower DNS TTL in advance only when approved. Pre-provision SSL, prepare old/new routing, preserve URLs and verify provider webhook targeting. Enable exactly one scheduler/worker set.
8. Switch DNS only with explicit approval. Keep old infrastructure available during propagation; define one authoritative writer and forward traffic accordingly.
9. If the new site accepts writes, rollback requires reconciling those writes, payment events and queue state before reverting DNS. Do not restore an old backup over newer production data. If no new writes occurred, revert routing/DNS and re-enable only the original workers.

**No zero-downtime promise:** minimizing interruption requires a tested traffic handoff and data synchronization plan. The exact final approach depends on the export format and access at the independent destination.

## 10. Handover checklist

- [x] Read-only audit and dependency inventory.
- [x] Confirmed Hostinger VPS target.
- [x] Recorded production-preservation requirements.
- [x] Documented missing restore artifacts and source replay hazards.
- [x] Recorded what was and was not tested.
- [ ] Approve staged preparation plan before runtime refactoring.
- [ ] Create independent source/configuration/deployment package with sanitized migration history and locked dependencies.
- [ ] Obtain official database export and separate storage download from owner.
- [ ] Provision owner's independent backend, VPS access, GitHub repository and provider accounts through secure authorization.
- [ ] Complete independent adapters for email/AI/Stripe/Firecrawl/MCP and independently served assets.
- [ ] Restore/validate disposable target, then produce final SQL/import/deployment package matched to export.
- [ ] Complete real staging feature tests, migration rehearsal and rollback rehearsal.
- [ ] Approve and perform final transfer, DNS/provider cutover and monitoring.

Generated audit file: `docs/independent-migration-audit.md` (also supplied as a downloadable Markdown report). No production-ready source archive, SQL export, deployed VPS, or tested migration package is claimed at this stage.

## References

Project evidence: `package.json`, `vite.config.ts`, `wrangler.jsonc`, `src/server.ts`, `src/start.ts`, `src/router.tsx`, `src/integrations/supabase/*`, `src/lib/auth.tsx`, `src/lib/roles.ts`, `src/lib/permissions.ts`, `src/lib/payments.server.ts`, `src/lib/gateway-secrets.server.ts`, `src/lib/firecrawl.server.ts`, `src/lib/guide-dispatch.functions.ts`, `src/lib/mcp/*`, `src/routes/api/*`, `src/routes/lovable/email/*`, both migration directories and `src/assets/*.asset.json`.

Official hosting references: https://tanstack.com/start/latest/docs/framework/react/guide/hosting ; https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/ ; https://docs.hostinger.com/node.js/overview-1 .