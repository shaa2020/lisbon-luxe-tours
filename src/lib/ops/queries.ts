import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BOOKING_SELECT,
  type OpsBookingWithRelations,
  type OpsCustomer,
  type OpsPartner,
  type OpsPayment,
  type OpsRequest,
  type OpsSettings,
  type OpsStaff,
  type OpsTour,
  type OpsVehicle,
} from "./types";

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const opsBookingsQuery = queryOptions({
  queryKey: ["ops", "bookings"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("ops_bookings")
        .select(BOOKING_SELECT)
        .order("tour_date", { ascending: false })
        .order("start_time", { ascending: true }),
    ) as unknown as OpsBookingWithRelations[],
});

export const opsBookingQuery = (id: string) =>
  queryOptions({
    queryKey: ["ops", "booking", id],
    queryFn: async () =>
      unwrap(
        await supabase.from("ops_bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle(),
      ) as unknown as OpsBookingWithRelations | null,
    enabled: id !== "new",
  });

export const opsActivitiesQuery = (bookingId: string) =>
  queryOptions({
    queryKey: ["ops", "activities", bookingId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("ops_booking_activities")
          .select("*")
          .eq("booking_id", bookingId)
          .order("created_at", { ascending: false }),
      ),
    enabled: bookingId !== "new",
  });

export const opsBookingPaymentsQuery = (bookingId: string) =>
  queryOptions({
    queryKey: ["ops", "payments", bookingId],
    queryFn: async () =>
      unwrap(
        await supabase
          .from("ops_payments")
          .select("*")
          .eq("booking_id", bookingId)
          .order("paid_at", { ascending: false }),
      ) as OpsPayment[],
    enabled: bookingId !== "new",
  });

export const opsAllPaymentsQuery = queryOptions({
  queryKey: ["ops", "payments", "all"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("ops_payments")
        .select("*, ops_bookings(reference, tour_name, currency)")
        .order("paid_at", { ascending: false })
        .limit(500),
    ) as unknown as (OpsPayment & {
      ops_bookings: { reference: string; tour_name: string; currency: string } | null;
    })[],
});

export const opsCustomersQuery = queryOptions({
  queryKey: ["ops", "customers"],
  queryFn: async () =>
    unwrap(await supabase.from("ops_customers").select("*").order("name")) as OpsCustomer[],
});

export const opsToursQuery = queryOptions({
  queryKey: ["ops", "tours"],
  queryFn: async () =>
    unwrap(await supabase.from("ops_tours").select("*").order("name")) as OpsTour[],
});

export const opsStaffQuery = queryOptions({
  queryKey: ["ops", "staff"],
  queryFn: async () =>
    unwrap(await supabase.from("ops_staff").select("*").order("name")) as OpsStaff[],
});

export const opsVehiclesQuery = queryOptions({
  queryKey: ["ops", "vehicles"],
  queryFn: async () =>
    unwrap(await supabase.from("ops_vehicles").select("*").order("name")) as OpsVehicle[],
});

export const opsPartnersQuery = queryOptions({
  queryKey: ["ops", "partners"],
  queryFn: async () =>
    unwrap(await supabase.from("ops_partners").select("*").order("company")) as OpsPartner[],
});

export const opsRequestsQuery = queryOptions({
  queryKey: ["ops", "requests"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("ops_change_requests")
        .select("*, ops_bookings(reference, tour_name, tour_date)")
        .order("created_at", { ascending: false }),
    ) as unknown as (OpsRequest & {
      ops_bookings: { reference: string; tour_name: string; tour_date: string } | null;
    })[],
});

export const opsSettingsQuery = queryOptions({
  queryKey: ["ops", "settings"],
  queryFn: async () =>
    unwrap(
      await supabase.from("ops_settings").select("*").eq("id", true).maybeSingle(),
    ) as OpsSettings | null,
  staleTime: 60_000,
});

export async function logActivity(bookingId: string, action: string, detail?: string) {
  await supabase
    .from("ops_booking_activities")
    .insert({ booking_id: bookingId, action, detail: detail ?? null });
}
