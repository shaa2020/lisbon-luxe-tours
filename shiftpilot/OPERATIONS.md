# Operations runbook

## Routine tasks

| Task | How |
| --- | --- |
| Create a new agency (tenant) | `scripts/bootstrap-agency.mjs` (DEPLOYMENT.md §4) |
| Invite staff | Admin HQ → Team & access (requires `users.manage`) |
| Change a staff member's roles | Team & access → remove role (×) and invite/assign again. Owner changes require an owner; the last owner cannot be removed |
| Review changes | Admin HQ → Audit log (requires `audit.read`) |
| Rotate secrets | ENVIRONMENT.md § Rotating secrets |
| Apply a migration | Staging first: `supabase db push`, run tests; then production during a quiet period |
| Purge old rate-limit buckets | Schedule `select public.purge_rate_limits();` daily (Supabase cron / pg_cron) |

## Monitoring (current state)

- Hosting provider logs (Vercel → Logs) capture server errors. Error pages show a reference digest that matches the log entry.
- Supabase dashboard: database health, auth logs, API logs.
- Sentry integration is planned for Phase 8 (`SENTRY_DSN` reserved).

Recommended alerts once monitoring is wired: 5xx rate, auth failures spike, database CPU/connections, failed
notification deliveries (`notification_deliveries.status in ('failed','dead')`), stuck jobs
(`automation_jobs.status = 'running' and locked_at < now() - interval '15 minutes'`).

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Invalid public environment configuration" | Missing `NEXT_PUBLIC_*` variable | Set it in the host and redeploy |
| Email links land on "link invalid or expired" | Email template not using the app's `/auth/confirm` URL, or redirect URL not allow-listed | DEPLOYMENT.md §1 steps 2 and 4 |
| Invitation page always says "unavailable" | `SUPABASE_SERVICE_ROLE_KEY` not set on the server | Set it (server-only) and redeploy |
| Invitation created but "awaiting configuration" | Resend not configured | Set `RESEND_API_KEY` and `EMAIL_FROM`, or share the shown link manually |
| A user sees "You don't have access to this page" | Their role lacks the permission | Grant a role that includes it (Roles & permissions shows the matrix) |
| Signed-in user lands on "not linked to an agency" | Account exists without an accepted invitation | Send an invitation to that email address |
| `Invalid shift transition` / `fully staffed` / `overlaps` errors | Database business rules working as designed | Correct the action; these protect data integrity |
| "Approved timesheets cannot be modified" | Immutability rule | Submit an attendance correction |

## Incident handling

1. Assess impact and severity; for any suspected personal-data breach follow GDPR.md § Breach response.
2. Contain: revoke compromised keys (Supabase API keys, Resend), sign users out (Supabase Auth → Users), disable
   affected integrations (`integration_accounts.status = 'disabled'`).
3. Recover from backups if data was damaged (BACKUP_AND_RECOVERY.md).
4. Record the incident in `incidents` and write a post-mortem.
