export type StaffRole = "owner" | "manager" | "staff";

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  staff: "Staff",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner: "Full access, including settings, payments, discounts and team.",
  manager: "Bookings, orders, tours, content, marketing and operations.",
  staff: "Day-to-day bookings and operations only. No money or settings.",
};

export const ROLE_RANK: Record<StaffRole, number> = {
  owner: 30,
  manager: 20,
  staff: 10,
};

export type Permission =
  | "dashboard.view"
  | "revenue.view"
  | "bookings.view"
  | "bookings.edit"
  | "bookings.delete"
  | "bookings.email"
  | "orders.view"
  | "orders.refund"
  | "tours.manage"
  | "content.manage"
  | "reviews.manage"
  | "faqs.manage"
  | "messages.view"
  | "emails.manage"
  | "ops.view"
  | "ops.manage"
  | "marketing.manage"
  | "discounts.manage"
  | "settings.manage"
  | "payments.manage"
  | "api.manage"
  | "team.manage";

const STAFF: Permission[] = [
  "dashboard.view",
  "bookings.view",
  "bookings.edit",
  "bookings.email",
  "messages.view",
  "ops.view",
];

const MANAGER: Permission[] = [
  ...STAFF,
  "revenue.view",
  "bookings.delete",
  "orders.view",
  "tours.manage",
  "content.manage",
  "reviews.manage",
  "faqs.manage",
  "emails.manage",
  "ops.manage",
  "marketing.manage",
];

const OWNER: Permission[] = [
  ...MANAGER,
  "orders.refund",
  "discounts.manage",
  "settings.manage",
  "payments.manage",
  "api.manage",
  "team.manage",
];

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  staff: STAFF,
  manager: MANAGER,
  owner: OWNER,
};

/** Legacy `admin` rows behave as owners. */
export function normalizeRole(role: string | null | undefined): StaffRole | null {
  if (!role) return null;
  if (role === "admin" || role === "owner") return "owner";
  if (role === "manager") return "manager";
  if (role === "staff") return "staff";
  return null;
}

export function roleCan(role: StaffRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleAtLeast(role: StaffRole | null, min: StaffRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
