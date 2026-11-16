#!/usr/bin/env node
/**
 * Creates a new agency (tenant) and its first owner.
 *
 *   node scripts/bootstrap-agency.mjs --name "Acme Staffing" --slug acme \
 *        --owner-email owner@acme.nl --owner-name "Anna de Vries" [--password '...']
 *
 * Without --password the owner receives a Supabase invitation email to choose
 * a password (recommended for production). With --password the account is
 * created confirmed (development only).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Run from a trusted machine; never expose the service role key.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values: a } = parseArgs({
  options: {
    name: { type: "string" },
    slug: { type: "string" },
    "owner-email": { type: "string" },
    "owner-name": { type: "string" },
    password: { type: "string" },
  },
});

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
if (!url || !key) fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
if (!a.name || !a.slug || !a["owner-email"]) fail("--name, --slug and --owner-email are required.");
if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(a.slug)) fail("--slug must be lowercase letters, digits and dashes.");
if (a.password && a.password.length < 12) fail("--password must be at least 12 characters.");
if (a.password && process.env.NEXT_PUBLIC_APP_ENV === "production") fail("--password is not allowed in production; use the invitation flow.");

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const email = a["owner-email"].trim().toLowerCase();

let userId;
if (a.password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: a.password,
    email_confirm: true,
    user_metadata: { full_name: a["owner-name"] ?? null },
  });
  if (error) fail(`Could not create the owner: ${error.message}`);
  userId = data.user.id;
} else {
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: a["owner-name"] ?? null },
    redirectTo: `${appUrl}/auth/confirm?next=/reset-password`,
  });
  if (error) fail(`Could not invite the owner: ${error.message}`);
  userId = data.user.id;
}

const { data: agencyId, error } = await admin.rpc("bootstrap_agency", { p_name: a.name, p_slug: a.slug, p_owner_user_id: userId });
if (error) fail(`Could not create the agency: ${error.message}`);

console.log(`Agency "${a.name}" created (${agencyId}).`);
console.log(a.password ? `Owner ${email} can sign in at ${appUrl}/login.` : `An invitation email was sent to ${email}.`);
