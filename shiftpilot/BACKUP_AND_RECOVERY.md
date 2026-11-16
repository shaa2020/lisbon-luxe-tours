# Backup and recovery

## What must be protected

| Asset | Location | Backup method |
| --- | --- | --- |
| Database (all business data, audit log) | Supabase PostgreSQL | Supabase daily backups + **Point-in-Time Recovery** (production) + independent logical dumps |
| Documents (contracts, certificates, invoices, payslips) | Supabase Storage (`documents`, `avatars`) | Scheduled copy to a second EU storage account |
| Configuration | Git (code, migrations), hosting env vars | Git history; env vars documented in a password manager |
| Secrets | Hosting provider, password manager | Password manager with two administrators |

## Targets (proposed — confirm with the business)

- **RPO** (maximum data loss): 5 minutes with PITR enabled; 24 hours without.
- **RTO** (time to restore service): 4 hours.

## Setup

1. Supabase production project: enable **PITR** (Database → Backups). Requires a paid plan — check current pricing.
2. Independent logical backup, at least daily, to EU object storage you control:

   ```bash
   pg_dump "$PROD_DB_URL" --format=custom --no-owner --no-privileges \
     --schema=public --schema=auth --schema=storage \
     --file="shiftpilot-$(date -u +%Y%m%dT%H%MZ).dump"
   ```

   Encrypt dumps at rest (e.g. `age` or server-side encryption), keep 35 daily and 12 monthly copies, and restrict
   access to two named administrators. Dumps contain personal data — treat them as production data (GDPR.md).
3. Storage: copy bucket objects daily with the Supabase S3-compatible API (`aws s3 sync` / `rclone`) to the same backup
   storage.

## Restore procedures

**Point-in-time restore (preferred):** Supabase dashboard → Backups → PITR → choose a timestamp just before the
incident. This restores the whole project; coordinate downtime and communicate to users.

**Logical restore into a new project (disaster recovery):**

```bash
# 1. Create a new Supabase project (EU) and apply migrations
supabase link --project-ref <new-ref> && supabase db push
# 2. Restore data only (schema already created by migrations)
pg_restore --data-only --disable-triggers --no-owner -d "$NEW_DB_URL" shiftpilot-<timestamp>.dump
# 3. Restore storage objects, update app env vars to the new project, redeploy
```

`--disable-triggers` is required because append-only and immutability triggers otherwise reject the bulk load; run it
as the database owner and re-run `npm run test:db`-equivalent smoke checks afterwards.

**Single-record recovery:** use `audit_logs.old_data` to identify the prior state; restore through a reviewed
migration or an administrative SQL script that itself is audited. Never edit append-only financial records — issue a
credit note or correction instead.

## Testing backups

Perform a restore rehearsal into a staging project **every quarter** and after major schema changes: restore, run the
database test suite against it, sign in with a test account, and record the measured RTO.
