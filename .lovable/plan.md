# Connect a different Stripe account (replace the built-in one)

You want the built-in Stripe payments to run through a different Stripe account (the one under hasibulhassanshanto92@gmail.com) instead of the one connected today.

## Important: this part is yours to do, not mine

Swapping the Stripe account behind built-in payments is a platform action — there is no way for me to disconnect it from code. You do it from the Payments dashboard:

1. Open the Payments dashboard.
2. Three-dots menu (top right) → **Disconnect Stripe**.
3. Re-enable Stripe payments and complete the claim/onboarding flow while signed in to the Stripe account for hasibulhassanshanto92@gmail.com.

Tell me once the disconnect is done and I'll drive the re-enable and rewire the code.

## What changes on the new account

- Test and live API keys are re-issued; webhook endpoints are recreated automatically.
- Any products/prices you created in the old Stripe account do **not** carry over.
- Existing paid bookings stay recorded in your database, but their Stripe references belong to the old account — refunds on those must be done from the old Stripe dashboard.
- Going live requires completing Stripe verification again on the new account (business details, bank, 2FA).

## What I do after you reconnect

1. Re-enable built-in Stripe payments for the project so the new sandbox/live gateway keys are provisioned.
2. Verify the Stripe adapter in `src/lib/payments.server.ts` picks up the new gateway keys (it reads `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` through the connector gateway — no hardcoded keys to change).
3. Confirm the webhook route `src/routes/api/public/payments/webhook.ts` still validates against the newly provisioned signing secrets for both `?env=sandbox` and `?env=live`.
4. Run **Test connection** on the Stripe card in Admin → Settings → Payments and make sure it reports OK for the mode you want.
5. Set Stripe as the active gateway (or leave Mollie active) depending on what you want taking live payments.
6. Do one end-to-end test booking in test mode: checkout → payment → order row marked paid → booking confirmed.

## Note on the email

Nothing in the app is keyed to hasibulhassanshanto92@gmail.com — it only matters as the Stripe account login. Your customer-facing contact email stays tuktuklisbon24@gmail.com unless you want that changed too.
