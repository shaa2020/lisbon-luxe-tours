# Fix team invitations and password management

## What's wrong today

Two separate gaps, both confirmed by looking at the project:

1. **Invitation and password emails are not branded or set up for your domain.**
   Your sending domain `notify.tuktuk24lisbon.com` is verified, but the project has no
   authentication email templates yet — invitations, password resets and magic links go out
   through the generic default template from a default sender, which lands in spam or gets
   filtered. The invite request itself did reach the mail hook (logs show it ran), so this is a
   deliverability/branding problem, not a broken invite button.

2. **There is no password reset or password set screen anywhere in the app.**
   Nothing in the codebase calls the password-reset or password-update APIs, and the admin login
   page (`/admin/login`) has only email + password fields. So an invited staff member who clicks
   the invite link has no screen to choose a password, and you as owner have no "forgot password"
   flow. That also explains the expired-link error in the logs: the invite link lands on a page
   that never consumes the token.

## What I'll build

**Branded auth emails**
- Scaffold the six authentication email templates (invite, signup confirmation, password reset,
  magic link, email change, reauthentication) and style them with the Tuk Tuk 24 brand — logo,
  gold accent, same typography as the customer booking emails.
- Emails then send from your verified domain instead of the generic default sender.

**A real password flow**
- New page `/admin/set-password`: handles both invite links and password-reset links. It picks up
  the token from the link, asks for a new password twice, saves it, then drops the person straight
  into the admin panel.
- "Forgot your password?" link on the admin login page → asks for the email → sends the reset mail
  → confirmation message.
- Auth redirect URLs for invite and recovery point at `/admin/set-password` so links stop dying.

**Owner controls on the Team page**
- Each member row gets a "Send password reset" action, so you can re-trigger a reset for anyone
  without them needing the original invite.
- Re-invite action for members who never accepted, plus a clear "Invited / Active" status label
  based on whether they've ever signed in.

## Technical notes

- Auth templates via the auth-email scaffolder; styling applied to the generated `.tsx` templates,
  body background stays white.
- `/admin/set-password` is a public route (no auth gate) that reads the recovery/invite session
  from the URL fragment, then calls `supabase.auth.updateUser({ password })`.
- Reset trigger on the login page uses `supabase.auth.resetPasswordForEmail` with
  `redirectTo = ${origin}/admin/set-password`.
- Owner-side reset in `src/lib/team.functions.ts`: a new server function guarded by
  `assertPermission(context, "team.manage")` that generates a recovery link with the admin client.
- Team list already returns `lastSignInAt`, used for the Invited/Active badge — no schema changes.
