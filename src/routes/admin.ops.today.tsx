import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { adminAssignBooking } from "@/lib/payments-admin.functions";
import {
  buildLedger,
  euro,
  todayKey,
  tourStageClass,
  paymentStateClass,
  TOUR_STAGE_LABEL,
  PAYMENT_STATE_LABEL,
  type TourStage,
} from "@/lib/booking-ledger";

export const Route = createFileRoute("/admin/ops/today")({ component: Page });

const QUICK: TourStage[] = ["confirmed", "in_progress", "completed", "no_show"];
const sel = "rounded-md border border-border bg-background px-2 py-1 text-xs";

/** The day sheet, built from the real customer bookings. */
function Page() {
  const qc = useQueryClient();
  const assign = useServerFn(adminAssignBooking);
  const [date, setDate] = useState(todayKey());

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["ops-day-bookings", date],
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

  const ids = bookings.map((b: any) => b.id);

  const { data: orders = [] } = useQuery({
    queryKey: ["ops-day-orders", date, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("booking_id,amount_total,payment_status")
        .neq("kind", "tip")
        .in("booking_id", ids);
      return data ?? [];
    },
  });
  const { data: manual = [] } = useQuery({
    queryKey: ["ops-day-manual", date, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_payments")
        .select("booking_id,amount_cents,direction,order_id")
        .in("booking_id", ids);
      return data ?? [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["ops-staff-min"],
    queryFn: async () => (await supabase.from("ops_staff").select("id,name").order("name")).data ?? [],
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["ops-vehicles-min"],
    queryFn: async () =>
      (await supabase.from("ops_vehicles").select("id,name,capacity").order("name")).data ?? [],
  });

  const ledgers = useMemo(() => {
    const out: Record<string, ReturnType<typeof buildLedger>> = {};
    for (const b of bookings as any[]) {
      out[b.id] = buildLedger(
        b,
        (orders as any[]).filter((o) => o.booking_id === b.id),
        (manual as any[]).filter((m) => m.booking_id === b.id),
      );
    }
    return out;
  }, [bookings, orders, manual]);

  const save = async (id: string, patch: Record<string, unknown>) => {
    try {
      const res: any = await assign({ data: { booking_id: id, ...patch } });
      if (res?.conflicts?.length) toast.warning(res.conflicts[0]);
      else toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["ops-day-bookings"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    }
  };

  const live = (bookings as any[]).filter(
    (b) => (b.status || "").toLowerCase() !== "cancelled" && ledgers[b.id]?.tourStage !== "cancelled",
  );
  const guests = live.reduce((s, b) => s + Number(b.guests || 0), 0);
  const value = live.reduce((s, b) => s + (ledgers[b.id]?.totalCents ?? 0), 0);
  const due = live.reduce((s, b) => s + (ledgers[b.id]?.dueCents ?? 0), 0);

  return (
    <AdminShell requires="ops.view">
      <OpsPage
        title="Day sheet"
        description="Every real booking for the day, with guide, vehicle and pickup."
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Stat label="Tours" value={String(live.length)} />
          <Stat label="Guests" value={String(guests)} />
          <Stat label="Value" value={euro(value)} />
          <Stat label="Still owed" value={euro(due)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing booked on this date.</p>
        ) : (
          <div className="space-y-2">
            {(bookings as any[]).map((b) => {
              const l = ledgers[b.id];
              const pickup =
                b.pickup_type === "hotel"
                  ? `${b.pickup_place_name || "Hotel"}${b.pickup_address ? ` — ${b.pickup_address}` : ""}`
                  : b.meetup_point_name || "—";
              return (
                <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-display font-bold text-lg">
                          {(b.travel_time || "--:--").slice(0, 5)}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {b.booking_reference ?? ""}
                        </span>
                        {l && (
                          <>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tourStageClass(l.tourStage)}`}
                            >
                              {TOUR_STAGE_LABEL[l.tourStage]}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${paymentStateClass(l.paymentState)}`}
                            >
                              {PAYMENT_STATE_LABEL[l.paymentState]}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="font-semibold">{b.tour_title ?? "Tour"}</p>
                      <p className="text-sm text-muted-foreground">
                        {b.customer_name}
                        {b.phone ? ` · ${b.phone}` : ""} · {b.guests} guests
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Pickup: {pickup}</p>
                      {l && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {euro(l.paidCents)} paid
                          {l.dueCents > 0 ? ` · ${euro(l.dueCents)} still owed` : " · settled"}
                        </p>
                      )}
                      {b.notes && <p className="text-xs mt-1 text-amber-600">Note: {b.notes}</p>}
                    </div>
                    <Link
                      to="/admin/bookings"
                      className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                    >
                      Open booking
                    </Link>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <select
                      className={sel}
                      value={b.guide_id ?? ""}
                      onChange={(e) => save(b.id, { guide_id: e.target.value || null })}
                    >
                      <option value="">No guide</option>
                      {(staff as any[]).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className={sel}
                      value={b.vehicle_id ?? ""}
                      onChange={(e) => save(b.id, { vehicle_id: e.target.value || null })}
                    >
                      <option value="">No vehicle</option>
                      {(vehicles as any[]).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    {QUICK.map((s) => (
                      <button
                        key={s}
                        onClick={() => save(b.id, { tour_status: s })}
                        className={`px-3 py-1.5 rounded-md text-xs border ${
                          (b.tour_status || "upcoming") === s
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {TOUR_STAGE_LABEL[s]}
                      </button>
                    ))}
                    {b.phone && (
                      <a
                        href={`https://wa.me/${String(b.phone).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-md text-xs border border-border hover:bg-accent"
                      >
                        WhatsApp guest
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </OpsPage>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-xl mt-1">{value}</p>
    </div>
  );
}
