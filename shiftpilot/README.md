# ShiftPilot

Staffing agency management platform: clients, workers (employees **and** freelancers), shifts, attendance, timesheets,
invoicing and compliance, with four portals on one backend.

| Portal | Route | Users |
| --- | --- | --- |
| Admin HQ | `/admin` | Agency staff (role-based permissions) |
| Client portal | `/client` | Client managers (per-client, per-location capabilities) |
| Worker portal | `/worker` | Agency employees and freelancers (mobile-first PWA) |
| Recruitment | `/recruitment` | Public careers site + recruiter tools (Phase 2) |

> **Status:** Phase 1 (foundation) is complete and tested. See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for what is
> built, what is pending and the exact next task. ShiftPilot is **not yet ready for commercial release**.

## Repository layout

This application lives in `shiftpilot/` and is fully independent of the other application in the repository root
(a tour-booking site, which is not modified by ShiftPilot work). Deploy it with the project root set to `shiftpilot/`.

```
shiftpilot/
├── src/
│   ├── app/                 Next.js App Router (routes per portal)
│   │   ├── (auth)/          login, password recovery
│   │   ├── (portals)/       admin, client, worker, portal chooser, account
│   │   ├── auth/            email-link confirmation, sign-out
│   │   └── invite/[token]   invitation acceptance
│   ├── components/          design system (ui/), layout shell, forms
│   ├── lib/
│   │   ├── auth/            session DAL, permissions, portal resolution
│   │   ├── supabase/        server/browser/admin clients, proxy session refresh
│   │   ├── security/        CSP, rate limiting, origin checks
│   │   ├── integrations/    provider adapters (email)
│   │   ├── validation/      Zod schemas
│   │   └── database.types.ts  generated from the schema
│   └── proxy.ts             session refresh, CSP nonce, route protection
├── supabase/
│   ├── migrations/          SQL migrations (schema, RLS, triggers, functions)
│   └── test-support/        Supabase shim for running tests on plain PostgreSQL
├── tests/
│   ├── db/                  RLS, scheduling-concurrency and finance tests
│   └── e2e/                 Playwright tests
└── scripts/                 db reset, type generation, agency bootstrap
```

## Quick start (local development)

Prerequisites: Node.js 22, the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker.

```bash
cd shiftpilot
npm ci
supabase start                       # local Postgres, Auth, Storage, Studio
cp .env.example .env.local           # fill in the anon + service-role keys printed by `supabase start`
supabase db reset                    # applies supabase/migrations
node scripts/bootstrap-agency.mjs --name "Demo Agency" --slug demo \
  --owner-email you@example.nl --owner-name "Your Name" --password 'choose-a-long-password'
npm run dev                          # http://localhost:3000
```

There is no sample data: the bootstrap script creates an empty agency with its default configuration (industries and
document types) and your owner account. Invite colleagues from **Admin HQ → Team & access**.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run lint` / `typecheck` | ESLint, TypeScript strict |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Recreate a test database, apply all migrations, run RLS/integrity tests |
| `npm run test:e2e` | Playwright smoke tests (desktop + mobile) |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the migrated schema |

## Documentation

[ARCHITECTURE](ARCHITECTURE.md) · [DATABASE](DATABASE.md) · [API](API.md) · [SECURITY](SECURITY.md) · [GDPR](GDPR.md) ·
[COMPLIANCE](COMPLIANCE.md) · [DEPLOYMENT](DEPLOYMENT.md) · [TESTING](TESTING.md) · [ENVIRONMENT](ENVIRONMENT.md) ·
[OPERATIONS](OPERATIONS.md) · [BACKUP_AND_RECOVERY](BACKUP_AND_RECOVERY.md) · [DEVELOPMENT_STATUS](DEVELOPMENT_STATUS.md)
