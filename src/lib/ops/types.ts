import type { Database } from "@/integrations/supabase/types";

export type OpsCustomer = Database["public"]["Tables"]["ops_customers"]["Row"];
export type OpsTour = Database["public"]["Tables"]["ops_tours"]["Row"];
export type OpsStaff = Database["public"]["Tables"]["ops_staff"]["Row"];
export type OpsVehicle = Database["public"]["Tables"]["ops_vehicles"]["Row"];
export type OpsPartner = Database["public"]["Tables"]["ops_partners"]["Row"];
export type OpsBooking = Database["public"]["Tables"]["ops_bookings"]["Row"];
export type OpsPayment = Database["public"]["Tables"]["ops_payments"]["Row"];
export type OpsActivity = Database["public"]["Tables"]["ops_booking_activities"]["Row"];
export type OpsRequest = Database["public"]["Tables"]["ops_change_requests"]["Row"];
export type OpsSettings = Database["public"]["Tables"]["ops_settings"]["Row"];

export const BOOKING_STATUSES = [
  "Inquiry",
  "Pending",
  "Confirmed",
  "In Progress",
  "Completed",
  "Cancelled",
  "No Show",
] as const;

export const PAYMENT_STATUSES = [
  "Unpaid",
  "Deposit Required",
  "Deposit Paid",
  "Partially Paid",
  "Paid",
  "Pay on Arrival",
  "Refunded",
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Card",
  "Bank Transfer",
  "Online Payment",
  "Other",
] as const;

export const VEHICLE_STATUSES = ["Available", "Assigned", "Unavailable", "Maintenance"] as const;
export const STAFF_ROLES = ["Driver", "Guide", "Driver & Guide", "Manager", "Admin"] as const;
export const STAFF_STATUSES = ["Active", "Off duty", "Inactive"] as const;
export const PARTNER_TYPES = [
  "Hotel",
  "Travel Agency",
  "Tour Operator",
  "Travel Agent",
  "Content Creator",
  "Local Business",
] as const;
export const VEHICLE_TYPES = [
  "Private Tuk Tuk",
  "Shared Tuk Tuk",
  "Private Van",
  "Other",
] as const;
export const REQUEST_TYPES = ["Change", "Cancel", "Question"] as const;
export const REQUEST_STATUSES = ["Open", "In Progress", "Resolved", "Declined"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type OpsBookingWithRelations = OpsBooking & {
  ops_customers: Pick<OpsCustomer, "id" | "name" | "whatsapp" | "email" | "country"> | null;
  driver: Pick<OpsStaff, "id" | "name"> | null;
  guide: Pick<OpsStaff, "id" | "name"> | null;
  ops_vehicles: Pick<OpsVehicle, "id" | "name"> | null;
  ops_partners: Pick<OpsPartner, "id" | "company"> | null;
};

export const BOOKING_SELECT =
  "*, ops_customers(id,name,whatsapp,email,country), driver:ops_staff!ops_bookings_driver_id_fkey(id,name), guide:ops_staff!ops_bookings_guide_id_fkey(id,name), ops_vehicles(id,name), ops_partners(id,company)";

export const statusTone: Record<string, string> = {
  Inquiry: "bg-muted text-muted-foreground",
  Pending: "bg-amber-500/15 text-amber-600",
  Confirmed: "bg-emerald-500/15 text-emerald-600",
  "In Progress": "bg-blue-500/15 text-blue-600",
  Completed: "bg-primary/15 text-primary",
  Cancelled: "bg-destructive/15 text-destructive",
  "No Show": "bg-destructive/15 text-destructive",
  Unpaid: "bg-destructive/15 text-destructive",
  "Deposit Required": "bg-amber-500/15 text-amber-600",
  "Deposit Paid": "bg-amber-500/15 text-amber-600",
  "Partially Paid": "bg-amber-500/15 text-amber-600",
  Paid: "bg-emerald-500/15 text-emerald-600",
  "Pay on Arrival": "bg-blue-500/15 text-blue-600",
  Refunded: "bg-muted text-muted-foreground",
  Open: "bg-amber-500/15 text-amber-600",
  Resolved: "bg-emerald-500/15 text-emerald-600",
  Declined: "bg-muted text-muted-foreground",
  Available: "bg-emerald-500/15 text-emerald-600",
  Assigned: "bg-blue-500/15 text-blue-600",
  Unavailable: "bg-muted text-muted-foreground",
  Maintenance: "bg-amber-500/15 text-amber-600",
  Active: "bg-emerald-500/15 text-emerald-600",
};

export function money(v: number | null | undefined, currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function makeReference() {
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  const d = new Date();
  return `TT${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${n}`;
}
