import { normalizeRole, roleAtLeast, roleCan, type Permission, type StaffRole } from "./permissions";

type Ctx = { supabase: any; userId: string };

/** Reads the caller's highest staff role using their own (RLS-scoped) client. */
export async function getCallerRole(context: Ctx): Promise<StaffRole | null> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);

  let best: StaffRole | null = null;
  for (const row of data ?? []) {
    const r = normalizeRole((row as { role: string }).role);
    if (r && (!best || roleAtLeast(r, best))) best = r;
  }
  return best;
}

/** Throws unless the caller has at least `min`. Returns the caller's role. */
export async function assertRole(context: Ctx, min: StaffRole = "manager"): Promise<StaffRole> {
  const role = await getCallerRole(context);
  if (!roleAtLeast(role, min)) throw new Error("Forbidden");
  return role as StaffRole;
}

/** Throws unless the caller's role grants `permission`. */
export async function assertPermission(context: Ctx, permission: Permission): Promise<StaffRole> {
  const role = await getCallerRole(context);
  if (!roleCan(role, permission)) throw new Error("Forbidden");
  return role as StaffRole;
}
