# Development status

_Last updated: 2026-11-16 · Branch: `claude/shiftpilot-production-dev-7enlb1`_

**Overall: Phase 1 (Foundation) complete and tested. Not ready for commercial release.**

## Completed

### Phase 1 — Foundation ✅
- Repository inspection. The repository root contains an unrelated, live tour-booking application with its own
  production database. ShiftPilot is built as an independent application in `shiftpilot/` and does not modify it.
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, Radix UI, Zod, Supabase SSR.
- Design system: light/dark tokens (spec palette), button, inputs, select, label, card, badge, alert, table, dialog,
  sheet, dropdown, skeleton, empty state, page header, stat card, form field with ARIA wiring, toasts, theme toggle;
  responsive portal shell with permission-filtered sidebar and mobile navigation.
- **Database architecture — complete schema for all domains** (15 migrations, 108 tables, 2 views): tenancy, RBAC,
  CRM, clients, workers, industries/positions/requirements, documents (versioned), employment and freelancer
  pathways, recruitment, invitations, scheduling with state machines, attendance, timesheets, finance, communication
  queues, compliance/GDPR, integrations, storage buckets, rate limiting.
- RLS on every table (enforced at migration time), tenant isolation via composite FKs, privilege-escalation guards,
  append-only/immutable financial and audit records, double-booking exclusion constraint, headcount locking.
- Roles and permissions: 45 permissions, 7 system roles, custom roles per agency; TS catalogue verified against the DB.
- Authentication: sign-in, sign-out (CSRF-checked), password recovery, email-link confirmation (token-hash and PKCE),
  invitation-based account creation and acceptance, account/security page, sign-in activity log.
- Server-side authorisation DAL (`requireStaff` / `requireClient` / `requireWorker`), portal chooser.
- Admin HQ: dashboard with live, permission-aware metrics (hidden — not zero — when not permitted); agency settings
  (company, invoicing defaults, Waadi/Wtta status, attendance/location policy); team & access (invite staff, revoke
  invitations, remove roles); roles & permissions matrix; audit log with paging.
- Client portal and worker portal shells with live overview data.
- Security: nonce-based CSP, security headers, shared rate limiting, open-redirect protection, email adapter that
  never reports unsent mail as sent.
- Environments: `.env.example`, Supabase CLI config, separate dev/staging/production guidance, CI pipeline.
- Documentation: README, ARCHITECTURE, DATABASE, API, SECURITY, GDPR, COMPLIANCE, DEPLOYMENT, TESTING, ENVIRONMENT,
  OPERATIONS, BACKUP_AND_RECOVERY.

## In progress
- None.

## Pending (by phase)

| Phase | Scope |
| --- | --- |
| 2 — Admin HQ modules | CRM pipeline UI; client management (create/edit/archive, locations, contacts, contracts, client-user invitations); worker management (profiles, skills, certificates, availability, documents, worker invitations); industry/position/requirement configuration UI; recruitment (public careers site, application intake with rate limiting, pipeline, interviews, onboarding tasks) |
| 3 — Scheduling | Request review, shift creation (recurring, duplication, multi-position), calendar (FullCalendar), eligibility/matching engine with explanations, invitations, confirmations, cancellations, replacements, rate snapshot creation |
| 4 — Client & worker portals | Client requests, assigned staff, timesheet approval/dispute; worker offers, schedule, check-in/out (`record_attendance` with idempotency and offline device time), timesheet generation, notifications; **full 22-step E2E workflow test on the Supabase stack** |
| 5 — Financial engine | Rate cards UI, rate resolution (weekend/night/holiday/overtime), invoice generation and issuing, PDF, email delivery, credit notes, payments, payroll export, freelancer purchase-invoice workflow, financial reports (estimated contribution margin) |
| 6 — Compliance & documents | Document upload/download via signed URLs, verification workflow, expiry reminders, compliance reviews UI, DSR and retention jobs |
| 7 — PWA & automation | Service worker, offline screens, web push, WhatsApp templates, notification queue worker, AI operations assistant (permission-bounded) |
| 8 — Production preparation | Sentry, MFA for staff, malware scanning, performance review, external penetration test, backup rehearsal, launch checklist |

## Known defects / limitations
- Signed-in browser flows have not been executed end-to-end here: the build sandbox cannot download the Supabase Auth
  binaries (GitHub release downloads are blocked by its network policy). Database-level behaviour is fully tested; a
  CI job with the Supabase CLI is planned (Phase 4).
- The CI job that applies migrations to the real Supabase stack is defined but has not run yet (it runs on GitHub
  Actions after push).
- Rate limiting fails open when `SUPABASE_SERVICE_ROLE_KEY` is absent (Supabase Auth limits still apply).
- Removing a role surfaces database errors through the generic error page (to be replaced by inline feedback in Phase 2).
- Privacy notice and compliance texts require legal review.

## Tests
| Suite | Result |
| --- | --- |
| Unit (Vitest) | 36 / 36 passed |
| Database: RLS, scheduling concurrency, finance (PostgreSQL 16) | 56 / 56 passed |
| E2E smoke (Playwright, desktop + mobile) | 38 / 38 passed |
| Lint, typecheck, production build | passed |
| Failed | none |

## Deployment status
- Not deployed. No Supabase project or hosting has been provisioned for ShiftPilot yet.
- Awaiting configuration: Supabase project (EU), Vercel project (root `shiftpilot/`), `SUPABASE_SERVICE_ROLE_KEY`,
  Resend (`RESEND_API_KEY`, `EMAIL_FROM`), Sentry, custom SMTP for Supabase Auth.

## Production release criteria
| Criterion | Status |
| --- | --- |
| All four portals work | ⏳ shells only (Phases 2–4) |
| Authentication works | ✅ implemented; ⏳ end-to-end verification on Supabase |
| Role permissions work | ✅ tested (DB) |
| Tenant isolation tested | ✅ |
| Client requests, shift allocation, worker acceptance | ⏳ DB layer ✅, UI pending |
| Attendance, timesheets | ⏳ DB layer ✅, UI pending |
| Financial calculations verified, invoices work | ⏳ |
| Employee and freelancer pathways separate | ✅ DB-enforced |
| Core PWA features | ⏳ manifest only |
| Critical security tests pass | ✅ (DB scenarios) |
| Backups configured, monitoring configured, production secrets | ⏳ |
| Legal and compliance review | ⏳ required |
| Deployment documentation complete | ✅ |

## Next exact task
**Phase 2, step 1 — Client management module:** `/admin/clients` list (TanStack Table, search, status filter),
create/edit form (KvK, VAT, billing, payment terms, industry), archive action (`clients.archive`), client detail with
locations and contacts CRUD, and client-user invitations (reuse the staff invitation flow with `kind = 'client'` and
capability checkboxes). Add DB tests for location-scoped invitations and E2E smoke for the new routes; add the nav item
only when the page exists.
