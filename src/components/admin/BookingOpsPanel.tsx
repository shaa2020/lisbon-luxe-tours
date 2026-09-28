import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MapPin, Car, User, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminRecordBookingPayment,
  adminDeleteBookingPayment,
  adminAssignBooking,
  PAYMENT_METHODS,
} from "@/lib/payments-admin.functions";
import { euro, TOUR_STAGE_LABEL, type BookingLedger, type TourStage } from "@/lib/booking-ledger";

type B = {
  id: string;
  travel_date?: string | null;
  tour_status?: string | null;
  guide_id?: string | null;
  vehicle_id?: string | null;
  pickup_type?: string | null;
  meetup_point_name?: string | null;
  meetup_point_address?: string | null;
  pickup_place_name?: string | null;
  pickup_address?: string | null;
  pickup_fee_cents?: number | null;
  pickup_instructions?: string | null;
};

const STAGES: TourStage[] = ["upcoming", "confirmed", "in_progress", "completed", "no_show"];
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

/** Operations + money for one booking: pickup, guide, vehicle, recorded payments. */
export function BookingOpsPanel({ booking, ledger }: { booking: B; ledger?: BookingLedger }) {
  const qc = useQueryClient();
  const assign = useServerFn(adminAssignBooking);
  const record = useServerFn(adminRecordBookingPayment);
  const removePayment = useServerFn(adminDeleteBookingPayment);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    amount: ledger && ledger.dueCents > 0 ? (ledger.dueCents / 100).toFixed(2) : "",
    method: "cash" as (typeof PAYMENT_METHODS)[number]["value"],
    notes: "",
    paid_at: new Date().toISOString().slice(0, 10),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["ops-staff-min"],
    queryFn: async () => {
      const { data } = await supabase.from("ops_staff").select("id,name,role").order("name");
      return data ?? [];
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["ops-vehicles-min"],
    queryFn: async () => {
      const { data } = await supabase.from("ops_vehicles").select("id,name,capacity").order("name");
      return data ?? [];
    },
  });
  const [editPickup, setEditPickup] = useState(false);
  const [pk, setPk] = useState({
    mode: (booking.pickup_type === "hotel" ? "hotel" : "meetup") as "hotel" | "meetup",
    meetupId: "",
    name: booking.pickup_place_name ?? "",
    address: booking.pickup_address ?? "",
    instructions: booking.pickup_instructions ?? "",
  });
  const { data: meetups = [] } = useQuery({
    queryKey: ["meetup-points-admin-min"],
    enabled: editPickup,
    queryFn: async () => {
      const { data } = await supabase
        .from("meetup_points")
        .select("id,name")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["booking-payments", booking.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_payments")
        .select("id,amount_cents,direction,method,notes,paid_at,order_id,guide_id")
        .eq("booking_id", booking.id)
        .order("paid_at", { ascending: false });
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["booking-payments", booking.id] });
    qc.invalidateQueries({ queryKey: ["admin-bookings-manual-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
  };

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res: any = await assign({ data: { booking_id: booking.id, ...patch } });
      if (res?.conflicts?.length) toast.warning(res.conflicts[0]);
      else toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    const cents = Math.round(Number(form.amount) * 100);
    if (!cents || cents < 1) return toast.error("Enter an amount");
    setBusy(true);
    try {
      await record({
        data: {
          booking_id: booking.id,
          amount_cents: cents,
          method: form.method,
          direction: "payment",
          notes: form.notes || null,
          paid_at: new Date(form.paid_at).toISOString(),
        },
      });
      toast.success("Payment recorded");
      setAdding(false);
      setForm((f) => ({ ...f, amount: "", notes: "" }));
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not record the payment");
    } finally {
      setBusy(false);
    }
  };

  const pickup =
    booking.pickup_type === "hotel"
      ? `${booking.pickup_place_name || "Hotel pickup"}${booking.pickup_address ? ` — ${booking.pickup_address}` : ""}`
      : booking.meetup_point_name
        ? `${booking.meetup_point_name}${booking.meetup_point_address ? ` — ${booking.meetup_point_address}` : ""}`
        : "Not chosen";

  const savePickup = async () => {
    if (pk.mode === "meetup") {
      if (!pk.meetupId) return toast.error("Choose a meeting point");
      await save({ pickup: { type: "meetup", meetup_point_id: pk.meetupId } });
    } else {
      if (!pk.name.trim()) return toast.error("Enter the hotel or place name");
      await save({
        pickup: {
          type: "hotel",
          place_name: pk.name.trim(),
          address: pk.address.trim() || null,
          instructions: pk.instructions.trim() || null,
        },
      });
    }
    setEditPickup(false);
  };

  return (
    <div className="mt-5 pt-5 border-t border-border space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Operations
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> Pickup
              </p>
              {!editPickup && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setEditPickup(true)}
                >
                  {pickup === "Not chosen" ? "Add" : "Change"}
                </button>
              )}
            </div>
            {!editPickup ? (
              <>
                <p className="text-sm">{pickup}</p>
                {!!booking.pickup_fee_cents && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Pickup fee charged: {euro(Number(booking.pickup_fee_cents))}
                  </p>
                )}
                {booking.pickup_instructions && (
                  <p className="text-xs text-muted-foreground mt-1">{booking.pickup_instructions}</p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <select
                  className={field}
                  value={pk.mode === "hotel" ? "__hotel" : pk.meetupId}
                  onChange={(e) =>
                    e.target.value === "__hotel"
                      ? setPk({ ...pk, mode: "hotel" })
                      : setPk({ ...pk, mode: "meetup", meetupId: e.target.value })
                  }
                >
                  <option value="">Choose a meeting point…</option>
                  {meetups.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  <option value="__hotel">Hotel / custom address…</option>
                </select>
                {pk.mode === "hotel" && (
                  <>
                    <input
                      className={field}
                      placeholder="Hotel or place name"
                      value={pk.name}
                      onChange={(e) => setPk({ ...pk, name: e.target.value })}
                    />
                    <input
                      className={field}
                      placeholder="Address (optional)"
                      value={pk.address}
                      onChange={(e) => setPk({ ...pk, address: e.target.value })}
                    />
                    <input
                      className={field}
                      placeholder="Instructions for the driver (optional)"
                      value={pk.instructions}
                      onChange={(e) => setPk({ ...pk, instructions: e.target.value })}
                    />
                  </>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={savePickup}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  >
                    Save pickup
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditPickup(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              <User className="w-3.5 h-3.5" /> Guide
            </label>
            <select
              className={field}
              value={booking.guide_id ?? ""}
              disabled={busy}
              onChange={(e) => save({ guide_id: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {staff.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.role ? ` · ${s.role}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              <Car className="w-3.5 h-3.5" /> Vehicle
            </label>
            <select
              className={field}
              value={booking.vehicle_id ?? ""}
              disabled={busy}
              onChange={(e) => save({ vehicle_id: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.capacity ? ` · ${v.capacity} seats` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {STAGES.map((s) => {
            const active = (booking.tour_status || "upcoming") === s;
            return (
              <button
                key={s}
                disabled={busy}
                onClick={() => save({ tour_status: s })}
                className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                  active
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-border hover:bg-accent"
                }`}
              >
                {TOUR_STAGE_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Payments
            {ledger ? (
              <span className="ml-2 normal-case tracking-normal text-foreground">
                {euro(ledger.paidCents)} paid
                {ledger.dueCents > 0 ? ` · ${euro(ledger.dueCents)} still due` : " · settled"}
              </span>
            ) : null}
          </p>
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            <Plus className="w-3.5 h-3.5" /> Record payment
          </button>
        </div>

        {adding && (
          <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Amount (€)</label>
              <input
                className={field}
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">How was it paid?</label>
              <select
                className={field}
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value as any })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {PAYMENT_METHODS.find((m) => m.value === form.method)?.hint}
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date</label>
              <input
                type="date"
                className={field}
                value={form.paid_at}
                onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <input
                className={field}
                placeholder="Note (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button
                onClick={submitPayment}
                disabled={busy}
                className="shrink-0 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded by hand.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-semibold">
                    {p.direction === "refund" ? "-" : ""}
                    {euro(Number(p.amount_cents))}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                    {" · "}
                    {String(p.paid_at).slice(0, 10)}
                    {p.order_id ? " · from payment provider" : ""}
                  </span>
                  {p.notes && <p className="text-xs text-muted-foreground truncate">{p.notes}</p>}
                </div>
                {!p.order_id && (
                  <button
                    onClick={async () => {
                      try {
                        await removePayment({ data: { id: p.id } });
                        toast.success("Removed");
                        refresh();
                      } catch (e: any) {
                        toast.error(e?.message || "Could not remove");
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
