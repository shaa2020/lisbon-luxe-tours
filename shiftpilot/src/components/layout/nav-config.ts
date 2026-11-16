import type { Permission } from "@/lib/auth/permissions";

export type NavIcon =
  | "dashboard" | "settings" | "users" | "shield" | "briefcase" | "calendar" | "clock" | "receipt" | "home" | "file" | "bell";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Visible when the user holds ANY of these (empty = always). */
  anyOf?: Permission[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Only routes that are implemented appear here — no placeholder links.
 * Modules are added as each roadmap phase ships (see DEVELOPMENT_STATUS.md).
 */
export const ADMIN_NAV: NavSection[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", anyOf: ["dashboard.view"] }] },
  {
    label: "Administration",
    items: [
      { href: "/admin/settings", label: "Agency settings", icon: "settings", anyOf: ["agency.settings.manage"] },
      { href: "/admin/settings/team", label: "Team & access", icon: "users", anyOf: ["users.manage"] },
      { href: "/admin/settings/roles", label: "Roles & permissions", icon: "shield", anyOf: ["users.manage", "roles.manage"] },
      { href: "/admin/audit-log", label: "Audit log", icon: "file", anyOf: ["audit.read"] },
    ],
  },
];

export const CLIENT_NAV: NavSection[] = [{ items: [{ href: "/client", label: "Overview", icon: "dashboard" }] }];

export const WORKER_NAV: NavSection[] = [{ items: [{ href: "/worker", label: "Home", icon: "home" }] }];

export function filterNav(sections: NavSection[], granted: ReadonlySet<string>): NavSection[] {
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.anyOf || i.anyOf.length === 0 || i.anyOf.some((p) => granted.has(p))) }))
    .filter((s) => s.items.length > 0);
}
