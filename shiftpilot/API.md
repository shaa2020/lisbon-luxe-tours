# API

ShiftPilot exposes no separate REST API of its own. Clients interact through:

1. **Next.js Server Actions and Route Handlers** (this document, section A), which authenticate the user, validate input
   with Zod and then talk to Supabase as that user.
2. **Supabase Data API (PostgREST)** on the user's JWT — every table is protected by RLS, so direct API access by a
   signed-in user is limited to exactly what the policies allow.
3. **Database RPC functions** (section B) for operations that must be atomic.

## A. Server Actions and Route Handlers

| Location | Action | Who | Notes |
| --- | --- | --- | --- |
| `app/(auth)/actions.ts` | `signInAction` | anyone | Zod validation, shared rate limit (10 / 15 min per IP+email), generic error message, records `user_sessions` |
| | `requestPasswordResetAction` | anyone | Rate limited (5 / h); identical response whether or not the account exists |
| | `updatePasswordAction` | recovery session | Password policy: 12–128 chars |
| | `signUpFromInvitationAction` | invitee | Only reachable from a valid invitation link; rate limited |
| `app/invite/[token]/actions.ts` | `acceptInvitationAction` | signed-in invitee | Calls `accept_invitation()` |
| `app/(portals)/admin/settings/actions.ts` | `updateAgencySettingsAction` | `agency.settings.manage` | IBAN checksum, KvK/VAT format, location-privacy rule |
| `app/(portals)/admin/settings/team/actions.ts` | `inviteStaffAction` | `users.manage` | 256-bit token, only the SHA-256 hash stored, 7-day expiry; emailed via Resend when configured, otherwise the link is shown once to the inviter |
| | `revokeInvitationAction`, `removeRoleAction` | `users.manage` | Owner role protected by database triggers |
| `app/(portals)/account/actions.ts` | `updateProfileAction`, `changePasswordAction` | signed-in user | Own profile only |
| `app/auth/confirm/route.ts` | `GET` | email link | Verifies Supabase `token_hash` (signup, invite, recovery, email change); redirect target sanitised |
| `app/auth/signout/route.ts` | `POST` | signed-in user | Same-origin check (CSRF) |

Server Actions are protected against CSRF by Next.js (POST-only, Origin/Host comparison). All redirects pass through
`safeNextPath()` to prevent open redirects.

## B. Database RPC functions

| Function | Callable by | Purpose |
| --- | --- | --- |
| `my_permissions(agency_id)` | authenticated | The caller's effective permissions in an agency (UI hints only) |
| `accept_invitation(token)` | authenticated | Validates token hash, expiry, single use and email match; creates the staff role, client membership or worker link atomically |
| `respond_to_shift_invitation(invitation_id, accept, reason?)` | the invited worker | Accept/decline a broadcast offer; acceptance creates the assignment — headcount, double-booking and pathway rules enforced in the same transaction |
| `respond_to_assignment(assignment_id, accept, reason?)` | the assigned worker | Accept/decline a direct assignment |
| `client_shift_staff(shift_id)` | client users (and staff) | Privacy-preserving staff list: display name, position, status only |
| `log_audit_event(...)` | agency members, service role | Explicit audit entries (e.g. "invoice emailed") |
| `bootstrap_agency(name, slug, owner)` | service role | Creates a tenant with defaults and its owner |
| `consume_rate_limit(key, limit, window)` / `purge_rate_limits()` | service role | Shared fixed-window rate limiting |
| `claim_automation_jobs(worker, limit)` / `claim_notification_deliveries(limit)` | service role | Queue consumers using `FOR UPDATE SKIP LOCKED` |

Errors raised by database rules use SQLSTATE `P0001` (business rule), `P0002` (not found) or `42501` (not authorised)
with human-readable messages that the UI can display.

## C. Planned (later phases)

Shift/request lifecycle actions, attendance recording (`record_attendance` with idempotency keys and offline device
time), timesheet approval, invoice issuing and PDF generation, payroll export, webhook receivers (Resend, WhatsApp)
and the AI assistant tool layer. Each will be documented here when implemented.
