import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function startOfDayISO(daysOffset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString();
}
function startOfWeekISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow; // Monday start
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}
function startOfMonthISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d.toISOString();
}
function endOfWeekDateOnly() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const diff = dow === 0 ? 0 : 7 - dow; // Sunday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Paid revenue (in EUR) for today / this week / this month. */
export function useRevenueStats() {
  return useQuery({
    queryKey: ["admin-stats", "revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("amount_total, payment_status, created_at")
        .eq("payment_status", "paid");
      if (error) throw error;
      const todayStart = startOfDayISO(0);
      const weekStart = startOfWeekISO();
      const monthStart = startOfMonthISO();
      let today = 0, week = 0, month = 0, all = 0;
      for (const o of data ?? []) {
        const cents = Number((o as any).amount_total) || 0;
        all += cents;
        const c = (o as any).created_at as string;
        if (c >= monthStart) month += cents;
        if (c >= weekStart) week += cents;
        if (c >= todayStart) today += cents;
      }
      return {
        today: today / 100,
        week: week / 100,
        month: month / 100,
        all: all / 100,
      };
    },
    refetchOnWindowFocus: false,
  });
}

/** Bookings whose travel_date falls between today and end of this week. */
export function useUpcomingThisWeek() {
  return useQuery({
    queryKey: ["admin-stats", "upcoming-week"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const end = endOfWeekDateOnly();
      const { data, error } = await supabase
        .from("bookings")
        .select("id, customer_name, tour_title, travel_date, guests, status, phone")
        .gte("travel_date", today)
        .lte("travel_date", end)
        .neq("status", "archived")
        .order("travel_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    refetchOnWindowFocus: false,
  });
}

/** Counts for sidebar/nav unread badges. */
export function useAdminBadges() {
  return useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const [newBookings, newMessages, pendingReviews] = await Promise.all([
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("contact_messages")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);
      return {
        bookings: newBookings.count ?? 0,
        messages: newMessages.count ?? 0,
        reviews: pendingReviews.count ?? 0,
      };
    },
    refetchInterval: 60_000,
  });
}
