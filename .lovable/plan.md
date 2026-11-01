# Independent Hostinger migration

## Objective and audit result

Keep TukTuk24's existing design, users, data, URLs and every feature while preparing independent production on the owner's **Hostinger VPS** and separately owned Supabase-compatible backend.

The read-only audit is complete and documented in the accompanying report. It confirmed 70 application tables, 44 stored media objects, 122 route source files, and direct Cloud dependencies in hosting, media delivery, Stripe, email, AI/research, MCP/OAuth and scheduled jobs.

The current SQL history is not safe to replay blindly: it includes historical credential/data mutations, missing out-of-band email functions and two migration lineages. A source-only copy is not a complete migration.

## Safety commitments

- Leave the live site, DNS, users, database, storage, payments, email and existing jobs untouched during preparation.
- Do not edit integration-managed clients in the original Lovable deployment. Prepare independent replacements in a separately staged source package, preserving the original preview.
- Never export private secrets or customer data into source/GitHub. Sanitize historical embedded bootstrap credentials in the independent package without altering production migration history.
- Preserve all features; unfinished adapters remain explicit cutover blockers, not silently removed functionality.
- Require separate approval for destination writes, traffic/data cutover, credential rotation or any irreversible action.

## Ordered preparation work after approval

### 1. Independent source and VPS configuration

Create a sanitized source package containing all application/UI files, public files, assets, package manifest and lockfile, plus standard Vite/TanStack/Nitro Node-server build configuration. Add Node launch configuration, container/process supervision, Nginx HTTPS proxy and a blank server/browser environment template. Preserve every route and original path; no SPA catch-all.

**Check:** reproducible dependency installation, available automated build result, standalone server startup and public/deep-link/API route smoke tests. Mark production build unverified until actual independent output passes.

### 2. Replace Cloud runtime dependencies without removing features

Prepare independently configurable database/auth clients and caller-validated server middleware. Add direct provider adapters for Stripe, AI, Firecrawl and email while preserving response shapes, payment reconciliation, suppression/retry behavior and free-only research limits. Preserve MCP tool/discovery/consent interfaces through a supported independent implementation. Materialize the actual asset bytes and preserve URLs or map them consistently.

**Check:** focused adapter/authorization tests and existing UI behavior; real provider verification waits for authorized accounts. Existing managed private keys cannot be handed over; provider credentials must be securely re-entered and encrypted at the target.

### 3. Database, users and storage package

Provide a reviewed migration manifest, target prerequisites, restore/import instructions, non-sensitive optional reference seeds, storage bucket configuration and target-only import tooling accepting owner-downloaded files. Do not claim source migrations are a complete SQL export. Use the owner's official export as the authoritative database/auth preservation artifact, then prepare final target scripts after inspecting its supported format. Inventory deployed legacy functions separately: no legacy Edge source directory is in this checkout.

**Owner action:** More → Database → Manage → Settings → Export data; download database export and separately download storage from More → Storage. The export carries password hashes but excludes files, provider settings and secrets. No agent-generated full dump or managed-storage bulk-copy code.

**Check:** restore only to a disposable target after authorization; compare schema, row/object counts, IDs, relationships, grants and RLS. Keep schedulers and outbound sends inactive.

### 4. GitHub and staging handover

Document repository ownership/sync setup, VPS provisioning, secure environment configuration, sender DNS and provider callbacks. Include final archive entry inspection excluding repository metadata, dependencies, build output and secret-bearing environment files before copying to Files.

**Check:** package inventory and secret-pattern review without printing credentials; clean deployment on the authorized VPS staging hostname.

### 5. Validation and final checklist

Test public/localized/mobile layouts, owner/manager/staff denial paths, booking CRUD, guide PIN/guest tokens, media operations, API contracts, sandbox payments/refunds/deposit/balance/tips, email/Auth delivery/suppression, push receipt, research limits and scheduler behavior. Preserve evidence and explicitly label untested checks.

Deliver a concise completed/pending checklist, generated-file inventory, manual account authorizations, final safe-transfer procedure and tested rollback procedure.

## Cutover is a separate approval

Do not change DNS or disable the old site during preparation. Rehearse restoration and final synchronization before choosing a brief approved write-control window or proven replication/traffic handoff. DNS propagation alone cannot guarantee zero downtime or prevent lost new bookings. Enable only one scheduler/worker set. If the destination receives new writes, reconcile those before rolling back.

## Access needed later, not for local preparation

- Owner's official database export and separate storage download.
- Hostinger VPS secure access, OS/resource details and staging hostname.
- Independently owned backend project and GitHub repository authorization.
- Direct payment, AI/research and email provider accounts; securely entered credentials.
- DNS authorization for final cutover and any email subdomain changes.

## Technical notes

Use full-stack Node/Nitro SSR rather than static Vite hosting. Retain TanStack server functions, raw-body webhook verification, bearer attachment, server-side roles and service-role isolation. Preserve `private`/`authz` helper semantics, all table grants/RLS, IDs, hashes and link tokens. Do not reuse Lovable connector credentials as direct Stripe keys. Preserve same public domain where possible; new backend issuer/VAPID/session keys may require re-login or notification re-enrolment.

Current preview checks passed for `/`, `/tours`, `/admin/login`, `/pt` and `/es`; this is not destination validation. No authenticated, payment, email, upload or production-build test was performed during audit. Current database/MCP scans returned no findings; other scan coverage is incomplete/outdated and no recent deep scan was returned.