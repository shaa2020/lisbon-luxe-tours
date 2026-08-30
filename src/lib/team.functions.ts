import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";
import { normalizeRole, type StaffRole } from "./permissions";

const roleSchema = z.enum(["owner", "manager", "staff"]);

const DEFAULT_SITE_URL = "https://tuktuk24lisbon.com";

/** Only allow redirect origins we own, falling back to the live site. */
function safeOrigin(origin?: string | null): string {
  if (!origin) return DEFAULT_SITE_URL;
  try {
    const u = new URL(origin);
    const ok =
      u.protocol === "https:" &&
      (u.hostname.endsWith("tuktuk24lisbon.com") || u.hostname.endsWith("lovable.app"));
    return ok ? u.origin : DEFAULT_SITE_URL;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export type TeamMember = {
  userId: string;
  email: string;
  fullName: string | null;
  role: StaffRole | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamMember[]> => {
    await assertPermission(context, "team.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles, error: rErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rErr) throw new Error(rErr.message);

    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, email, full_name");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });

    const byId = new Map<string, TeamMember>();
    for (const u of users?.users ?? []) {
      byId.set(u.id, {
        userId: u.id,
        email: u.email ?? "",
        fullName: (u.user_metadata?.["full_name"] as string) ?? null,
        role: null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
    for (const p of profiles ?? []) {
      const m = byId.get(p.id);
      if (m) {
        m.email = m.email || (p.email ?? "");
        m.fullName = p.full_name ?? m.fullName;
      }
    }
    for (const r of roles ?? []) {
      const m = byId.get(r.user_id);
      const next = normalizeRole(r.role as string);
      if (m && next) m.role = m.role === "owner" ? m.role : next;
    }

    return [...byId.values()]
      .filter((m) => m.role !== null)
      .sort((a, b) => (a.email > b.email ? 1 : -1));
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(200),
        fullName: z.string().trim().max(200).optional(),
        role: roleSchema,
        origin: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "team.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = `${safeOrigin(data.origin)}/admin/set-password`;

    const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = existing?.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase())?.id;

    if (!userId) {
      const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { full_name: data.fullName ?? null },
        redirectTo,
      });
      if (error) throw new Error(error.message);
      userId = invited.user?.id;
    } else {
      // Existing account: send a password link instead of a duplicate invite.
      await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo });
    }
    if (!userId) throw new Error("Could not create the team member.");

    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, full_name: data.fullName ?? null });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role as never });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, userId };
  });

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid(), role: roleSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "team.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.userId === context.userId && data.role !== "owner") {
      throw new Error("You can't remove your own owner access.");
    }

    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role as never });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "team.manage");
    if (data.userId === context.userId) throw new Error("You can't remove yourself.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .in("role", ["owner", "admin"] as never);
    const { data: victim } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const victimIsOwner = (victim ?? []).some((r) => normalizeRole(r.role as string) === "owner");
    if (victimIsOwner && (count ?? 0) <= 1) throw new Error("There must be at least one owner.");

    const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
