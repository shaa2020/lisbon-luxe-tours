import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard } from "@/components/admin/AdminShell";
import {
  buildLedger,
  euro,
  todayKey,
  tourStageClass,
  TOUR_STAGE_LABEL,
} from "@/lib/booking-ledger";
import { Banknote, Clock, MessageSquare, UserRound } from "lucide-react";

/**
 * Operations cockpit for the dashboard: what needs attention right now and a
 * compact departure board for today's real bookings.
 */
export function DashboardToday() {
  const date = todayKey();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["dash-today-bookings", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("travel_date", date)
        .order("travel_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ids = (bookings as any[]).map((b) => b.id);

  const { data: orders = [] } = useQuery({
    queryKey: ["dash-today-orders", date, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () =>
      (
        await supabase
          .from("orders")
          .select("booking_id,amount_total,payment_status")
          .in("booking_id", ids)
      ).data ?? [],
  });

  const { data: manual = [] } = useQuery({
    queryKey: ["dash-today-manual", date, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () =>
      (
        await supabase
          .from("booking_payments")
          .select("booking_id,amount_cents,direction,order_id")
          .in("booking_id", ids)
      ).data ?? [],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["dash-staff-min"],
    queryFn: async () =>
      (await supabase.from("ops_staff").select("id,name").order("name")).data ?? [],
  });

  const staffName = (id: string | null) =>
    id ? ((staff as any[]).find((s) => s.id === id)?.name ?? null) : null;

  const rows = useMemo(() => {
    return (bookings as any[])
      .map((b) => ({
        b,
        l: buildLedger(
          b,
          (orders as any[]).filter((o) => o.booking_id === b.id),
          (manual as any[]).filter((m) => m.booking_id === b.id),
        ),
      }))
      .filter(({ b, l }) => (b.status || "").toLowerCase() !== "cancelled" && l.tourStage !== "cancelled");
  }, [bookings, orders, manual]);

  const noGuide = rows.filter(({ b }) => !b.guide_id).length;
  const cashDue = rows.reduce((s, { l }) => s + l.dueCents, 0);
  const guests = rows.reduce((s, { b }) => s + Number(b.guests || 0), 0);

  const alerts = [
    noGuide > 0 && {
      key: "guide",
      icon: UserRound,
      text: `${noGuide} tour${noGuide > 1 ? "s" : ""} today with no guide assigned`,
      tone: "bg-amber-50 border-amber-200 text-amber-900",
      to: "/admin/ops/today" as const,
      cta: "Assign",
    },
    cashDue > 0 && {
      key: "cash",
      icon: Banknote,
      text: `${euro(cashDue)} still to collect on today's tours`,
      tone: "bg-sky-50 border-sky-200 text-sky-900",
      to: "/admin/reconciliation" as const,
      cta: "Settle",
    },
  ].filter(Boolean) as {
    key: string;
    icon: any;
    text: string;
    tone: string;
    to: "/admin/ops/today" | "/admin/reconciliation";
    cta: string;
  }[];

  return (
    <div className="min-w-0 space-y-4">
      {alerts.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
          {alerts.map((a) => (
            <Link
              key={a.key}
              to={a.to}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm hover:opacity-90 ${a.tone}`}
            >
              <a.icon className="w-4 h-4 shrink-0" />
              <span className="min-w-0 flex-1">{a.text}</span>
              <span className="text-xs font-semibold shrink-0">{a.cta} →</span>
            </Link>
          ))}
        </div>
      )}

      <AdminCard className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Today&apos;s departures</p>
            <p className="text-xs text-muted-foreground">
              {rows.length} tour{rows.length === 1 ? "" : "s"} · {guests} guest
              {guests === 1 ? "" : "s"}
            </p>
          </div>
          <Link to="/admin/ops/today" className="text-xs font-semibold text-primary hover:underline">
            Day sheet →
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing departing today.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ b, l }) => {
              const pickup =
                b.pickup_type === "hotel"
                  ? b.pickup_place_name || "Hotel pickup"
                  : b.meetup_point_name || "—";
              const guide = staffName(b.guide_id);
              return (
                <li key={b.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums w-16 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    {(b.travel_time || "--:--").slice(0, 5)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">
                      {b.tour_title || "Tour"}{" "}
                      <span className="text-muted-foreground font-normal">
                        · {b.customer_name} · {b.guests} pax
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {pickup} · {guide ?? "No guide yet"}
                    </span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${tourStageClass(l.tourStage)}`}
                  >
                    {TOUR_STAGE_LABEL[l.tourStage]}
                  </span>
                  <span
                    className={`text-xs font-semibold tabular-nums shrink-0 ${
                      l.dueCents > 0 ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    {l.dueCents > 0 ? `${euro(l.dueCents)} due` : "Paid"}
                  </span>
                  {b.phone && (
                    <a
                      href={`https://wa.me/${String(b.phone).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 grid place-items-center w-8 h-8 rounded-lg border border-border text-emerald-600 hover:bg-accent"
                      aria-label="WhatsApp guest"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminCard>

    </div>
  );
}
