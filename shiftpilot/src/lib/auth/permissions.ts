/**
 * Permission catalogue — must mirror public.permissions (migration 0002).
 * A unit test parses the migration and fails if the two lists diverge.
 *
 * These constants drive UI visibility only. Every action is enforced again
 * server-side (requireStaff) and by PostgreSQL RLS.
 */
export const PERMISSIONS = [
  "dashboard.view",
  "agency.settings.manage",
  "users.manage",
  "roles.manage",
  "audit.read",
  "integrations.manage",
  "crm.read",
  "crm.write",
  "clients.read",
  "clients.write",
  "clients.archive",
  "workers.read",
  "workers.write",
  "workers.sensitive.read",
  "workers.notes.read",
  "industries.manage",
  "recruitment.read",
  "recruitment.write",
  "requests.read",
  "requests.review",
  "shifts.read",
  "shifts.write",
  "shifts.assign",
  "matching.override",
  "attendance.read",
  "attendance.correct",
  "timesheets.read",
  "timesheets.approve",
  "rates.read",
  "rates.write",
  "finance.read",
  "finance.write",
  "invoices.issue",
  "payments.record",
  "payroll.export",
  "purchase_invoices.approve",
  "documents.read",
  "documents.upload",
  "documents.verify",
  "compliance.read",
  "compliance.review",
  "gdpr.manage",
  "reports.read",
  "notifications.manage",
  "ai.assistant.use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SYSTEM_ROLES = [
  "agency_owner",
  "agency_admin",
  "operations_manager",
  "recruiter",
  "finance",
  "compliance_officer",
  "sales",
] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export function hasAll(granted: ReadonlySet<string>, required: readonly Permission[]): boolean {
  return required.every((p) => granted.has(p));
}

export function hasAny(granted: ReadonlySet<string>, required: readonly Permission[]): boolean {
  return required.length === 0 || required.some((p) => granted.has(p));
}
