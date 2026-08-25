# Repair and professionalize customer emails

## Confirmed diagnosis

- The sending domain is verified and the live email queue is running.
- Recent confirmation, reminder, update, and review-request emails did not reach customers. Their delivery logs show the first attempt failed because the booking-email sender omitted the required unsubscribe token; retries then reused the failed idempotency key and ended in permanent failure.
- No recipients are currently blocked by the suppression list.
- Automatic reminder and review-request settings are enabled, but no bookings have yet been marked as successfully emailed.
- The admin email history currently displays every retry row rather than one final status per email, so it can be misleading.

## Implementation

### 1. Fix the shared sending pipeline
- Update the shared branded booking-email sender used by confirmations, reminders, booking updates, cancellations, refunds, invoices, custom messages, and review requests.
- Generate or reuse the recipient’s unsubscribe token before queueing every message, include it in the queued payload, and keep suppression checks fail-closed.
- Preserve a fresh idempotency key for each intentional resend while keeping retry attempts safe from duplicates.
- Return an accurate `queued` result instead of describing a queued message as already delivered.

### 2. Make automated emails reliable
- Keep the existing daily reminder and post-tour review automation, but only mark a booking as emailed after the message has been accepted into the queue.
- Ensure failures remain eligible for a later retry instead of being recorded as completed.
- Keep the existing admin-controlled automation toggles.

### 3. Upgrade the email design and content
- Refine the reusable email layout into a polished Tuk Tuk 24 design with clear brand header, readable booking summary, prominent action button, contact/reply details, and a restrained mobile-safe layout.
- Improve confirmation, reminder, update, cancellation, refund, invoice, review, payment, and custom-message wording while preserving editable admin templates and placeholders.
- Show date and time, guest count, total, booking reference, and relevant policy information consistently when available.
- Continue sending booking messages from `bookings@tuktuk24lisbon.com`, general messages from `hello@tuktuk24lisbon.com`, and support messages from `support@tuktuk24lisbon.com`.

### 4. Make delivery status clear in Admin
- Change success notices to “Email queued” until delivery is confirmed.
- Rework the Emails screen into an admin-only monitoring view with:
  - 24-hour, 7-day, 30-day, and custom date filters
  - multi-select email-type and status filters
  - deduplicated totals for unique emails, sent, failed, and suppressed
  - one latest-status row per message, sortable newest-first and paginated after 50 rows
  - clear status badges and readable failure details
- Keep recipient addresses and delivery errors restricted to admins.

### 5. Validate end to end
- Preview representative confirmation and reminder emails at desktop and mobile email widths.
- Send fresh confirmation and reminder tests through the repaired live path.
- Confirm the app action queues the email, the delivery log reaches `sent`, and the recipient inbox receives it.
- Re-trigger the previously failed customer emails only through intentional admin resend actions; permanently failed queue items cannot be retried automatically.

## Technical notes

- Keep email delivery on the existing Lovable Cloud queue and verified sender domain.
- Consolidate unsubscribe-token preparation so both the generic app-email route and direct booking sender follow the same rules.
- Deduplicate monitoring data by the latest row for each `message_id`; all counts and tables must use that same dataset.
- Preserve admin authorization at both the UI and server-function boundaries.
