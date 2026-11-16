import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPermission, type Permission } from "./permissions";
import type { MembershipSummary } from "./portal";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
}

/**
 * Data Access Layer. All authorisation decisions start here.
 * `getUser()` validates the JWT with Supabase Auth (never trust getSession()
 * alone on the server).
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", data.user.id).maybeSingle();
  return {
    id: data.user.id,
    email: profile?.email ?? data.user.email ?? "",
    fullName: profile?.full_name ?? null,
  };
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export const getMemberships = cache(async (): Promise<MembershipSummary> => {
  const user = await getCurrentUser();
  if (!user) return { staffAgencies: [], clientMemberships: [], workerProfiles: [] };
  const supabase = await createClient();

  const [roles, clients, workers] = await Promise.all([
    supabase.from("user_roles").select("agency_id, roles(key), agencies(name)").eq("user_id", user.id),
    supabase
      .from("client_memberships")
      .select("client_id, agency_id, clients(name)")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabase.from("workers").select("id, agency_id, status, engagement_type").eq("user_id", user.id),
  ]);

  const staff = new Map<string, { agencyId: string; agencyName: string; roles: string[] }>();
  for (const r of roles.data ?? []) {
    const entry = staff.get(r.agency_id) ?? { agencyId: r.agency_id, agencyName: r.agencies?.name ?? "", roles: [] };
    if (r.roles?.key) entry.roles.push(r.roles.key);
    staff.set(r.agency_id, entry);
  }

  return {
    staffAgencies: [...staff.values()],
    clientMemberships: (clients.data ?? []).map((c) => ({
      clientId: c.client_id,
      agencyId: c.agency_id,
      clientName: c.clients?.name ?? "",
    })),
    workerProfiles: (workers.data ?? []).map((w) => ({
      workerId: w.id,
      agencyId: w.agency_id,
      status: w.status,
      engagementType: w.engagement_type,
    })),
  };
});

const ACTIVE_AGENCY_COOKIE = "sp_agency";
const ACTIVE_CLIENT_COOKIE = "sp_client";

export interface StaffContext {
  user: CurrentUser;
  agencyId: string;
  agencyName: string;
  roles: string[];
  permissions: ReadonlySet<Permission>;
  agencies: MembershipSummary["staffAgencies"];
  can: (p: Permission) => boolean;
}

/**
 * Requires agency staff membership (and optionally permissions). The active
 * agency comes from a cookie but is ALWAYS validated against the user's
 * memberships, so a forged cookie cannot grant access to another tenant.
 */
export async function requireStaff(...required: Permission[]): Promise<StaffContext> {
  const user = await requireUser("/admin");
  const m = await getMemberships();
  if (m.staffAgencies.length === 0) forbidden();

  const preferred = (await cookies()).get(ACTIVE_AGENCY_COOKIE)?.value;
  const agency = m.staffAgencies.find((a) => a.agencyId === preferred) ?? m.staffAgencies[0];

  const supabase = await createClient();
  const { data } = await supabase.rpc("my_permissions", { p_agency_id: agency.agencyId });
  const permissions = new Set((data ?? []).filter(isPermission));
  for (const p of required) if (!permissions.has(p)) forbidden();

  return {
    user,
    agencyId: agency.agencyId,
    agencyName: agency.agencyName,
    roles: agency.roles,
    permissions,
    agencies: m.staffAgencies,
    can: (p) => permissions.has(p),
  };
}

export interface ClientContext {
  user: CurrentUser;
  clientId: string;
  clientName: string;
  agencyId: string;
  memberships: MembershipSummary["clientMemberships"];
  capabilities: { request: boolean; approve: boolean; finance: boolean; manageUsers: boolean };
  role: string;
}

export async function requireClient(): Promise<ClientContext> {
  const user = await requireUser("/client");
  const m = await getMemberships();
  if (m.clientMemberships.length === 0) forbidden();
  const preferred = (await cookies()).get(ACTIVE_CLIENT_COOKIE)?.value;
  const membership = m.clientMemberships.find((c) => c.clientId === preferred) ?? m.clientMemberships[0];

  const supabase = await createClient();
  const { data } = await supabase
    .from("client_memberships")
    .select("role, can_request_staff, can_approve_timesheets, can_view_finance, can_manage_users")
    .eq("client_id", membership.clientId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!data) forbidden();

  return {
    user,
    clientId: membership.clientId,
    clientName: membership.clientName,
    agencyId: membership.agencyId,
    memberships: m.clientMemberships,
    role: data.role,
    capabilities: {
      request: data.can_request_staff,
      approve: data.can_approve_timesheets,
      finance: data.can_view_finance,
      manageUsers: data.can_manage_users,
    },
  };
}

export interface WorkerContext {
  user: CurrentUser;
  workerId: string;
  agencyId: string;
  status: string;
  engagementType: string;
}

export async function requireWorker(): Promise<WorkerContext> {
  const user = await requireUser("/worker");
  const m = await getMemberships();
  const profile = m.workerProfiles.find((w) => w.status !== "archived");
  if (!profile) forbidden();
  return { user, ...profile };
}

export const ACTIVE_COOKIES = { agency: ACTIVE_AGENCY_COOKIE, client: ACTIVE_CLIENT_COOKIE } as const;
