import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import {
  logActivity,
  opsActivitiesQuery,
  opsBookingPaymentsQuery,
  opsBookingQuery,
  opsCustomersQuery,
  opsPartnersQuery,
  opsSettingsQuery,
  opsStaffQuery,
  opsToursQuery,
  opsVehiclesQuery,
} from "@/lib/ops/queries";
import {
  BOOKING_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  VEHICLE_TYPES,
  makeReference,
  money,
  todayISO,
} from "@/lib/ops/types";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/ops/jobs/$id")({ component: Page });

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

type Form = {
  reference: string;
  tour_id: string | null;
  tour_name: string;
  tour_date: string;
  start_time: string;
  duration_hours: number;
  guests: number;
  adults: number;
  children: number;
  customer_id: string | null;
  partner_id: string | null;
  driver_id: string | null;
  guide_id: string | null;
  vehicle_id: string | null;
  vehicle_type: string;
  vehicle_qty: number;
  pickup_location: string;
  dropoff_location: string;
  status: string;
  payment_status: string;
  payment_method: string;
  base_price: number;
  vehicle_charges: number;
  extra_charges: number;
  discount: number;
  deposit_required: number;
  deposit_paid: number;
  currency: string;
  special_requests: string;
  internal_notes: string;
};

function Page() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: job } = useQuery(opsBookingQuery(id));
  const { data: settings } = useQuery(opsSettingsQuery);
  const { data: tours = [] } = useQuery(opsToursQuery);
  const { data: customers = [] } = useQuery(opsCustomersQuery);
  const { data: staff = [] } = useQuery(opsStaffQuery);
  const { data: vehicles = [] } = useQuery(opsVehiclesQuery);
  const { data: partners = [] } = useQuery(opsPartnersQuery);
  const { data: payments = [] } = useQuery(opsBookingPaymentsQuery(id));
  const { data: activities = [] } = useQuery(opsActivitiesQuery(id));

  const [form, setForm] = useState<Form>({
    reference: makeReference(),
    tour_id: null,
    tour_name: "",
    tour_date: todayISO(),
    start_time: "10:00",
    duration_hours: 2,
    guests: 2,
    adults: 2,
    children: 0,
    customer_id: null,
    partner_id: null,
    driver_id: null,
    guide_id: null,
    vehicle_id: null,
    vehicle_type: "Private Tuk Tuk",
    vehicle_qty: 1,
    pickup_location: "",
    dropoff_location: "",
    status: "Pending",
    payment_status: "Unpaid",
    payment_method: "",
    base_price: 0,
    vehicle_charges: 0,
    extra_charges: 0,
    discount: 0,
    deposit_required: 0,
    deposit_paid: 0,
    currency: "EUR",
    special_requests: "",
    internal_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [pay, setPay] = useState({ amount: 0, method: "Cash", notes: "" });

  useEffect(() => {
    if (job) {
      setForm({
        reference: job.reference,
        tour_id: job.tour_id,
        tour_name: job.tour_name,
        tour_date: job.tour_date,
        start_time: job.start_time?.slice(0, 5) ?? "10:00",
        duration_hours: Number(job.duration_hours),
        guests: job.guests,
        adults: job.adults,
        children: job.children,
        customer_id: job.customer_id,
        partner_id: job.partner_id,
        driver_id: job.driver_id,
        guide_id: job.guide_id,
        vehicle_id: job.vehicle_id,
        vehicle_type: job.vehicle_type,
        vehicle_qty: job.vehicle_qty,
        pickup_location: job.pickup_location ?? "",
        dropoff_location: job.dropoff_location ?? "",
        status: job.status,
        payment_status: job.payment_status,
        payment_method: job.payment_method ?? "",
        base_price: Number(job.base_price),
        vehicle_charges: Number(job.vehicle_charges),
        extra_charges: Number(job.extra_charges),
        discount: Number(job.discount),
        deposit_required: Number(job.deposit_required),
        deposit_paid: Number(job.deposit_paid),
        currency: job.currency,
        special_requests: job.special_requests ?? "",
        internal_notes: job.internal_notes ?? "",
      });
    }
  }, [job]);

  useEffect(() => {
    if (isNew && settings) {
      setForm((f) => ({
        ...f,
        currency: settings.currency,
        duration_hours: Number(settings.default_duration_hours),
        start_time: settings.default_start_time.slice(0, 5),
      }));
    }
  }, [isNew, settings]);

  const total = useMemo(
    () =>
      Number(form.base_price) +
      Number(form.vehicle_charges) +
      Number(form.extra_charges) -
      Number(form.discount),
    [form.base_price, form.vehicle_charges, form.extra_charges, form.discount],
  );
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = total - paid;

  const set = (p: Partial<Form>) => setForm((f) => ({ ...f, ...p }));

  const pickTour = (tourId: string) => {
    const t = tours.find((x) => x.id === tourId);
    if (!t) return set({ tour_id: null });
    set({
      tour_id: t.id,
      tour_name: t.name,
      duration_hours: Number(t.duration_hours),
      vehicle_type: t.vehicle_type,
      base_price: Number(t.base_price),
    });
  };

  const save = async () => {
    if (!form.tour_name.trim()) return toast.error("Tour name is required");
    setSaving(true);
    const payload = {
      ...form,
      payment_method: form.payment_method || null,
      pickup_location: form.pickup_location || null,
      dropoff_location: form.dropoff_location || null,
      special_requests: form.special_requests || null,
      internal_notes: form.internal_notes || null,
      guests: Number(form.adults) + Number(form.children),
      total,
    };
    if (isNew) {
      const { data, error } = await supabase
        .from("ops_bookings")
        .insert(payload)
        .select("id")
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      await logActivity(data.id, "Job created");
      toast.success("Job created");
      qc.invalidateQueries({ queryKey: ["ops"] });
      navigate({ to: "/admin/ops/jobs/$id", params: { id: data.id } });
      return;
    }
    const { error } = await supabase.from("ops_bookings").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await logActivity(id, "Job updated", `${form.status} · ${form.payment_status}`);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["ops"] });
  };

  const addPayment = async () => {
    if (!pay.amount) return toast.error("Enter an amount");
    const { error } = await supabase.from("ops_payments").insert({
      booking_id: id,
      amount: pay.amount,
      method: pay.method,
      notes: pay.notes || null,
    });
    if (error) return toast.error(error.message);
    await logActivity(id, "Payment recorded", `${money(pay.amount, form.currency)} · ${pay.method}`);
    setPay({ amount: 0, method: "Cash", notes: "" });
    toast.success("Payment recorded");
    qc.invalidateQueries({ queryKey: ["ops"] });
  };

  const removePayment = async (pid: string) => {
    const { error } = await supabase.from("ops_payments").delete().eq("id", pid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ops"] });
  };

  const removeJob = async () => {
    if (!confirm("Delete this job permanently?")) return;
    const { error } = await supabase.from("ops_bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["ops"] });
    navigate({ to: "/admin/ops/jobs" });
  };

  return (
    <AdminShell requires="ops.view">
      <OpsPage
        title={isNew ? "New job" : form.reference}
        description={isNew ? "Create an operational job." : form.tour_name}
        actions={
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create job" : "Save job"}
            </button>
            {!isNew && (
              <button
                onClick={removeJob}
                className="rounded-md border border-border px-3 py-2.5 text-sm hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        }
      >
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card title="Tour & schedule">
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Tour from catalogue">
                  <select
                    className={input}
                    value={form.tour_id ?? ""}
                    onChange={(e) => pickTour(e.target.value)}
                  >
                    <option value="">Custom / manual</option>
                    {tours.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </L>
                <L label="Tour name">
                  <input
                    className={input}
                    value={form.tour_name}
                    onChange={(e) => set({ tour_name: e.target.value })}
                  />
                </L>
                <L label="Date">
                  <input
                    type="date"
                    className={input}
                    value={form.tour_date}
                    onChange={(e) => set({ tour_date: e.target.value })}
                  />
                </L>
                <L label="Start time">
                  <input
                    type="time"
                    className={input}
                    value={form.start_time}
                    onChange={(e) => set({ start_time: e.target.value })}
                  />
                </L>
                <L label="Duration (hours)">
                  <input
                    type="number"
                    step="0.5"
                    className={input}
                    value={form.duration_hours}
                    onChange={(e) => set({ duration_hours: Number(e.target.value) })}
                  />
                </L>
                <L label="Reference">
                  <input
                    className={input}
                    value={form.reference}
                    onChange={(e) => set({ reference: e.target.value })}
                  />
                </L>
                <L label="Adults">
                  <input
                    type="number"
                    className={input}
                    value={form.adults}
                    onChange={(e) => set({ adults: Number(e.target.value) })}
                  />
                </L>
                <L label="Children">
                  <input
                    type="number"
                    className={input}
                    value={form.children}
                    onChange={(e) => set({ children: Number(e.target.value) })}
                  />
                </L>
                <L label="Pickup location">
                  <input
                    className={input}
                    value={form.pickup_location}
                    onChange={(e) => set({ pickup_location: e.target.value })}
                  />
                </L>
                <L label="Drop-off location">
                  <input
                    className={input}
                    value={form.dropoff_location}
                    onChange={(e) => set({ dropoff_location: e.target.value })}
                  />
                </L>
              </div>
            </Card>

            <Card title="Dispatch">
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Driver">
                  <select
                    className={input}
                    value={form.driver_id ?? ""}
                    onChange={(e) => set({ driver_id: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.role}
                      </option>
                    ))}
                  </select>
                </L>
                <L label="Guide">
                  <select
                    className={input}
                    value={form.guide_id ?? ""}
                    onChange={(e) => set({ guide_id: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.role}
                      </option>
                    ))}
                  </select>
                </L>
                <L label="Vehicle">
                  <select
                    className={input}
                    value={form.vehicle_id ?? ""}
                    onChange={(e) => set({ vehicle_id: e.target.value || null })}
                  >
                    <option value="">Unassigned</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.capacity} seats)
                      </option>
                    ))}
                  </select>
                </L>
                <L label="Vehicle type">
                  <select
                    className={input}
                    value={form.vehicle_type}
                    onChange={(e) => set({ vehicle_type: e.target.value })}
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </L>
                <L label="Vehicles needed">
                  <input
                    type="number"
                    className={input}
                    value={form.vehicle_qty}
                    onChange={(e) => set({ vehicle_qty: Number(e.target.value) })}
                  />
                </L>
                <L label="Partner / source">
                  <select
                    className={input}
                    value={form.partner_id ?? ""}
                    onChange={(e) => set({ partner_id: e.target.value || null })}
                  >
                    <option value="">Direct</option>
                    {partners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.company}
                      </option>
                    ))}
                  </select>
                </L>
              </div>
            </Card>

            <Card title="Notes">
              <div className="grid sm:grid-cols-2 gap-3">
                <L label="Guest requests">
                  <textarea
                    rows={3}
                    className={input}
                    value={form.special_requests}
                    onChange={(e) => set({ special_requests: e.target.value })}
                  />
                </L>
                <L label="Internal notes">
                  <textarea
                    rows={3}
                    className={input}
                    value={form.internal_notes}
                    onChange={(e) => set({ internal_notes: e.target.value })}
                  />
                </L>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Status">
              <div className="grid gap-3">
                <L label="Job status">
                  <select
                    className={input}
                    value={form.status}
                    onChange={(e) => set({ status: e.target.value })}
                  >
                    {BOOKING_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </L>
                <L label="Payment status">
                  <select
                    className={input}
                    value={form.payment_status}
                    onChange={(e) => set({ payment_status: e.target.value })}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </L>
                <L label="Payment method">
                  <select
                    className={input}
                    value={form.payment_method}
                    onChange={(e) => set({ payment_method: e.target.value })}
                  >
                    <option value="">—</option>
                    {PAYMENT_METHODS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </L>
                <L label="Customer">
                  <select
                    className={input}
                    value={form.customer_id ?? ""}
                    onChange={(e) => set({ customer_id: e.target.value || null })}
                  >
                    <option value="">No customer linked</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </L>
              </div>
            </Card>

            <Card title="Pricing">
              <div className="grid grid-cols-2 gap-3">
                <L label="Base price">
                  <input
                    type="number"
                    className={input}
                    value={form.base_price}
                    onChange={(e) => set({ base_price: Number(e.target.value) })}
                  />
                </L>
                <L label="Vehicle charges">
                  <input
                    type="number"
                    className={input}
                    value={form.vehicle_charges}
                    onChange={(e) => set({ vehicle_charges: Number(e.target.value) })}
                  />
                </L>
                <L label="Extras">
                  <input
                    type="number"
                    className={input}
                    value={form.extra_charges}
                    onChange={(e) => set({ extra_charges: Number(e.target.value) })}
                  />
                </L>
                <L label="Discount">
                  <input
                    type="number"
                    className={input}
                    value={form.discount}
                    onChange={(e) => set({ discount: Number(e.target.value) })}
                  />
                </L>
                <L label="Deposit required">
                  <input
                    type="number"
                    className={input}
                    value={form.deposit_required}
                    onChange={(e) => set({ deposit_required: Number(e.target.value) })}
                  />
                </L>
                <L label="Currency">
                  <input
                    className={input}
                    value={form.currency}
                    onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
                  />
                </L>
              </div>
              <div className="mt-3 pt-3 border-t border-border text-sm space-y-1">
                <Row label="Total" value={money(total, form.currency)} strong />
                <Row label="Paid" value={money(paid, form.currency)} />
                <Row label="Balance" value={money(balance, form.currency)} strong />
              </div>
            </Card>

            {!isNew && (
              <>
                <Card title="Record a payment">
                  <div className="grid gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      className={input}
                      value={pay.amount || ""}
                      onChange={(e) => setPay((p) => ({ ...p, amount: Number(e.target.value) }))}
                    />
                    <select
                      className={input}
                      value={pay.method}
                      onChange={(e) => setPay((p) => ({ ...p, method: e.target.value }))}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      placeholder="Note (optional)"
                      className={input}
                      value={pay.notes}
                      onChange={(e) => setPay((p) => ({ ...p, notes: e.target.value }))}
                    />
                    <button
                      onClick={addPayment}
                      className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold"
                    >
                      Add payment
                    </button>
                  </div>
                  {payments.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-xs">
                      {payments.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground truncate">
                            {new Date(p.paid_at).toLocaleDateString()} · {p.method}
                          </span>
                          <span className="flex items-center gap-2">
                            {money(p.amount, form.currency)}
                            <button
                              onClick={() => removePayment(p.id)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Delete payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card title="Activity">
                  {activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {activities.map((a) => (
                        <li key={a.id}>
                          <p className="font-medium">{a.action}</p>
                          <p className="text-muted-foreground">
                            {new Date(a.created_at).toLocaleString()}
                            {a.detail ? ` · ${a.detail}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      </OpsPage>
    </AdminShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="font-display font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
