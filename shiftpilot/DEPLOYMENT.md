# Deployment

ShiftPilot is a standard Next.js 16 application plus a Supabase project. It has no dependency on Lovable or any
proprietary builder and can run on Vercel or any Node.js 22 host.

## Environments

| Environment | Supabase project | App host | Notes |
| --- | --- | --- | --- |
| Local | `supabase start` (Docker) | `npm run dev` | `.env.local` |
| Staging / development | separate Supabase project (EU) | Vercel Preview or separate host | Own keys; never production data |
| Production | separate Supabase project (EU, e.g. Frankfurt `eu-central-1`) | Vercel Production | PITR backups enabled |

Never share keys between environments.

## 1. Create the Supabase project

1. Create a project in an **EU region**. Use a strong database password stored in a password manager.
2. **Authentication → URL configuration:** Site URL = `https://<your-domain>`; redirect URLs = `https://<your-domain>/auth/confirm`.
3. **Authentication → Providers → Email:** enable email confirmations; minimum password length 12; enable "secure
   password change". Leave sign-ups enabled — invited users create their account through the invitation page; accounts
   without an invitation have no access to any data.
4. **Authentication → Email templates** — make links point at the app's confirmation route:
   - *Confirm signup:* `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`
   - *Invite user:* `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=invite`
   - *Reset password:* `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`
   - *Change email:* `{{ .SiteURL }}/auth/confirm?next=/account&token_hash={{ .TokenHash }}&type=email_change`
5. **Authentication → SMTP:** configure a custom SMTP sender (e.g. Resend SMTP). The built-in sender is rate-limited and
   not intended for production.
6. **Database → Backups:** enable Point-in-Time Recovery for production (BACKUP_AND_RECOVERY.md).

## 2. Apply migrations

```bash
cd shiftpilot
supabase link --project-ref <project-ref>
supabase db push            # applies supabase/migrations in order
```

Migrations are forward-only. Apply them to staging first, run the test suites, then production. Migration 0014 checks
that every table has RLS enabled and aborts otherwise.

## 3. Deploy the application (Vercel)

1. Import the GitHub repository in Vercel and set **Root Directory = `shiftpilot`**. Framework preset: Next.js.
2. Set the environment variables from ENVIRONMENT.md for Production and Preview separately. Mark
   `SUPABASE_SERVICE_ROLE_KEY` as server-only (never prefix it with `NEXT_PUBLIC_`).
3. Region: choose an EU function region (e.g. `fra1`) close to the database.
4. Deploy. Pushes to the production branch deploy automatically after CI passes (configure "Ignored Build Step" or
   branch protection so that failing CI blocks production deploys).

Other hosts: `npm ci && npm run build && npm run start` behind HTTPS (the app sends HSTS). Set the same environment
variables; ensure `x-forwarded-for` / `x-forwarded-host` are set by the proxy.

## 4. Create the first agency

From a trusted machine with production credentials in the environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_APP_URL=https://<your-domain> \
NEXT_PUBLIC_APP_ENV=production \
node scripts/bootstrap-agency.mjs --name "Agency B.V." --slug agency --owner-email owner@agency.nl --owner-name "Owner Name"
```

The owner receives an invitation email, sets a password, signs in, completes **Agency settings** and invites the team.

## 5. Optional integrations

| Integration | Configure | Without it |
| --- | --- | --- |
| Resend (email) | `RESEND_API_KEY`, `EMAIL_FROM` (verified domain) | Invitation links are shown to the inviter to share manually; nothing is reported as sent |
| Sentry | `SENTRY_DSN` | Errors are logged to the host's logs only (Sentry wiring is Phase 8) |
| WhatsApp Business Cloud, Web Push, Google Maps, Exact Online, Moneybird, AFAS, Loket.nl | Phases 5–7 | Core features remain available |

## CI/CD

`.github/workflows/shiftpilot-ci.yml` runs on every change under `shiftpilot/`:

- **quality** — lint, typecheck, unit tests, production build, Playwright smoke tests (desktop and mobile).
- **database** — applies all migrations to PostgreSQL 16 and runs the RLS, concurrency and finance suites; verifies the
  generated types are current.
- **supabase** — applies the migrations to the real Supabase database stack (`supabase db start` / `db reset`).

## Release checklist

See DEVELOPMENT_STATUS.md § Production release criteria. Do not launch commercially until every item is complete,
including the legal/compliance review and an external security test.
