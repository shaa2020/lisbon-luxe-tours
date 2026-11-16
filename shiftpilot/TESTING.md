# Testing

## Suites

| Suite | Command | Runs against | Count (last local run) |
| --- | --- | --- | --- |
| Unit | `npm test` | Node (Vitest) | 36 tests, 8 files — passing |
| Database (RLS, scheduling, finance) | `npm run test:db` | PostgreSQL 16 + Supabase shim, all migrations applied from scratch | 56 tests, 3 files — passing |
| E2E smoke | `npm run test:e2e` | Production build (`next start`) in Chromium, desktop + Pixel 7 | 38 tests (19 × 2 viewports) — passing |
| Static checks | `npm run lint`, `npm run typecheck` | ESLint, TypeScript strict | passing |
| Production build | `npm run build` | Next.js 16 (Turbopack) | passing |

Last local run: 2026-11-16. CI runs all of the above on every change (DEPLOYMENT.md § CI/CD) and additionally applies
the migrations to the real Supabase database stack.

## How the database tests work

`scripts/db-reset.sh` drops and recreates `shiftpilot_test`, applies `supabase/test-support/supabase_shim.sql`
(roles `anon` / `authenticated` / `service_role`, `auth.uid()`, `auth.jwt()`, minimal `auth.users` and `storage`
schemas — the same surface Supabase provides) and then every migration in order.

Tests build fixtures as the superuser (two agencies, staff with different roles, a custom role, three clients with
full and location-restricted users, employee and freelancer workers), then impersonate users exactly as PostgREST does:
`SET LOCAL ROLE authenticated` plus `request.jwt.claims`. Each impersonated block runs in a transaction that is rolled
back. Concurrency tests use separate connections that commit.

Local PostgreSQL without Docker:

```bash
initdb -D .local/pgdata -U postgres --auth=trust
pg_ctl -D .local/pgdata -o "-p 54329 -k /tmp" -l .local/pg.log start
npm run test:db
```

## Required security scenarios — coverage

| Scenario (specification §22) | Test |
| --- | --- |
| Client A cannot access Client B | `security.test.ts` › client isolation |
| Worker A cannot access Worker B | `security.test.ts` › worker isolation |
| Client cannot access internal wage rates | `security.test.ts` › client users cannot read workers, wage rates… |
| Worker cannot access another worker's documents | `security.test.ts` › Worker A cannot access Worker B's records or documents |
| Unauthorised user cannot approve timesheets | `finance.test.ts` › unauthorised users cannot approve timesheets |
| Unauthorised user cannot issue invoices | `finance.test.ts` › a user without invoices.issue cannot issue invoices |
| Duplicate shift acceptance is rejected | `scheduling.test.ts` › duplicate shift acceptance is rejected |
| Conflicting assignments are rejected | `scheduling.test.ts` › conflicting (overlapping) assignments; rescheduling into a conflict |
| Financial records cannot be altered without an audit trail | `finance.test.ts` › issued invoices immutable, payments append-only, changes audited; `security.test.ts` › audit log cannot be altered |

Additional coverage: agency tenant isolation (read/write/move/cross-tenant FK), anonymous access, privilege-escalation
guards (workers, client memberships, owner role), sensitive-document visibility, invitations (email match, single use,
owner-only owner invites), pathway separation, state machines, real concurrent acceptance of the last slot (exactly one
succeeds), headcount, engagement restrictions, invoice totals and VAT rounding, gapless numbering, payment-derived
status, rate immutability and non-overlap, approved-timesheet immutability, server-authoritative attendance time and
idempotency, freelancer purchase-invoice guards, rate limiting.

Unit tests: permission catalogue equals the database seed, navigation contains no dead links, portal resolution,
open-redirect protection, CSP builder, time-zone/DST handling, Dutch IBAN/KvK/VAT validation, auth validation, email
adapter (never reports delivery without a provider id; HTML escaping).

E2E smoke: landing and privacy pages, 404, signed-out redirects for every portal with a safe `next` parameter,
expired recovery and invalid invitation handling, sign-out CSRF rejection, form validation and ARIA error wiring,
nonce-based CSP with a fresh nonce per request, absence of CSP violations, security headers, PWA manifest, no
horizontal overflow on mobile.

## Not yet covered (honest status)

- **Signed-in browser flows** (login → portal, invitation acceptance, settings save) need a running Supabase Auth
  server. GitHub release downloads of the Auth/PostgREST binaries are blocked in the current build sandbox, so these
  could not be executed here. They are planned as the `e2e-supabase` CI job (Supabase CLI + Docker) together with the
  full 22-step workflow test in Phase 4. The underlying database behaviour (invitation acceptance, RLS) is covered by
  the database suite.
- PWA install/offline tests (Phase 7), financial calculation engine tests beyond invoice arithmetic (Phase 5).
