/**
 * Pure portal-resolution logic (unit tested). Decides where a signed-in user
 * lands based on their memberships. A user may hold several (e.g. a staff
 * member who is also a worker); they then choose on /portal.
 */
export type PortalKind = "admin" | "client" | "worker";

export interface MembershipSummary {
  staffAgencies: { agencyId: string; agencyName: string; roles: string[] }[];
  clientMemberships: { clientId: string; clientName: string; agencyId: string }[];
  workerProfiles: { workerId: string; agencyId: string; status: string; engagementType: string }[];
}

export const PORTAL_PATHS: Record<PortalKind, string> = {
  admin: "/admin",
  client: "/client",
  worker: "/worker",
};

export function availablePortals(m: MembershipSummary): PortalKind[] {
  const portals: PortalKind[] = [];
  if (m.staffAgencies.length > 0) portals.push("admin");
  if (m.clientMemberships.length > 0) portals.push("client");
  if (m.workerProfiles.some((w) => w.status !== "archived")) portals.push("worker");
  return portals;
}

/**
 * Returns the single destination, or null when the user must choose
 * (several portals) or has no access yet (no portals).
 */
export function resolveLanding(m: MembershipSummary): string | null {
  const portals = availablePortals(m);
  return portals.length === 1 ? PORTAL_PATHS[portals[0]] : null;
}

/** Only allow same-origin relative redirects (prevents open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/portal"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(next)) return fallback;
  try {
    const u = new URL(next, "http://local.invalid");
    if (u.origin !== "http://local.invalid") return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
