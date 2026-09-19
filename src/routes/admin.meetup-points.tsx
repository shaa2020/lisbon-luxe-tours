import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Save, MapPin } from "lucide-react";
import type { MeetupPoint } from "@/lib/meetup-points";

export const Route = createFileRoute("/admin/meetup-points")({
  component: MeetupPointsAdmin,
  head: () => ({
    meta: [{ title: "Meetup points · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

type TourRow = { id: string; title: string; published: boolean };

const EMPTY = {
  name: "",
  address: "",
  map_url: "",
  latitude: "",
  longitude: "",
  instructions: "",
};

function MeetupPointsAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, Partial<MeetupPoint>>>({});
  const [creating, setCreating] = useState(false);
  const [newPoint, setNewPoint] = useState({ ...EMPTY });

  const { data: points = [], isLoading } = useQuery({
    queryKey: ["admin-meetup-points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetup_points" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as MeetupPoint[];
    },
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["admin-tours-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours" as never)
        .select("id,title,published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as TourRow[];
    },
  });

  const { data: links = [] } = useQuery({
    queryKey: ["admin-tour-meetup-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_meetup_points" as never)
        .select("tour_id,meetup_point_id");
      if (error) throw error;
      return data as unknown as Array<{ tour_id: string; meetup_point_id: string }>;
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-meetup-points"] });
    qc.invalidateQueries({ queryKey: ["admin-tour-meetup-links"] });
  };

  const merged = (p: MeetupPoint): MeetupPoint => ({ ...p, ...(draft[p.id] || {}) });
  const isDirty = (id: string) => Object.keys(draft[id] || {}).length > 0;
  const update = (id: string, patch: Partial<MeetupPoint>) =>
    setDraft((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));

  const save = async (p: MeetupPoint) => {
    const m = merged(p);
    if (!m.name.trim() || !m.address.trim()) return toast.error("Name and address are required.");
    const { error } = await supabase
      .from("meetup_points" as never)
      .update({
        name: m.name.trim(),
        address: m.address.trim(),
        map_url: m.map_url?.trim() || null,
        latitude: m.latitude == null || Number.isNaN(Number(m.latitude)) ? null : Number(m.latitude),
        longitude:
          m.longitude == null || Number.isNaN(Number(m.longitude)) ? null : Number(m.longitude),
        instructions: m.instructions?.trim() || null,
        active: m.active,
        sort_order: m.sort_order,
      } as never)
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    setDraft((d) => {
      const next = { ...d };
      delete next[p.id];
      return next;
    });
    toast.success("Meetup point saved");
    refresh();
  };

  const create = async () => {
    if (!newPoint.name.trim() || !newPoint.address.trim())
      return toast.error("Name and address are required.");
    const { error } = await supabase.from("meetup_points" as never).insert({
      name: newPoint.name.trim(),
      address: newPoint.address.trim(),
      map_url: newPoint.map_url.trim() || null,
      latitude: newPoint.latitude ? Number(newPoint.latitude) : null,
      longitude: newPoint.longitude ? Number(newPoint.longitude) : null,
      instructions: newPoint.instructions.trim() || null,
      sort_order: points.length,
      active: true,
    } as never);
    if (error) return toast.error(error.message);
    setNewPoint({ ...EMPTY });
    setCreating(false);
    toast.success("Meetup point added");
    refresh();
  };

  const remove = async (p: MeetupPoint) => {
    const { count } = await supabase
      .from("bookings" as never)
      .select("id", { count: "exact", head: true })
      .eq("meetup_point_id", p.id);
    if ((count ?? 0) > 0)
      return toast.error(
        `Used by ${count} booking${count === 1 ? "" : "s"} — deactivate it instead so history stays intact.`,
      );
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from("meetup_points" as never).delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const move = async (p: MeetupPoint, dir: -1 | 1) => {
    const idx = points.findIndex((x) => x.id === p.id);
    const other = points[idx + dir];
    if (!other) return;
    await supabase
      .from("meetup_points" as never)
      .update({ sort_order: other.sort_order } as never)
      .eq("id", p.id);
    await supabase
      .from("meetup_points" as never)
      .update({ sort_order: p.sort_order } as never)
      .eq("id", other.id);
    refresh();
  };

  const toggleTour = async (pointId: string, tourId: string, on: boolean) => {
    if (on) {
      const { error } = await supabase
        .from("tour_meetup_points" as never)
        .insert({ tour_id: tourId, meetup_point_id: pointId } as never);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("tour_meetup_points" as never)
        .delete()
        .eq("tour_id", tourId)
        .eq("meetup_point_id", pointId);
      if (error) return toast.error(error.message);
    }
    refresh();
  };

  const assignedTours = (pointId: string) =>
    links.filter((l) => l.meetup_point_id === pointId).map((l) => l.tour_id);

  return (
    <AdminShell requires="ops.manage">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Meetup points</h1>
          <p className="text-sm text-slate-500">
            Where guests meet the tuk tuk when they don&apos;t book hotel pickup.
          </p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Add meetup point
        </button>
      </div>

      {creating && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">New meetup point</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={newPoint.name} onChange={(v) => setNewPoint({ ...newPoint, name: v })} placeholder="Praça do Comércio" />
            <Field label="Full address" value={newPoint.address} onChange={(v) => setNewPoint({ ...newPoint, address: v })} placeholder="Praça do Comércio, 1100-148 Lisboa" />
            <Field label="Google Maps link (optional)" value={newPoint.map_url} onChange={(v) => setNewPoint({ ...newPoint, map_url: v })} placeholder="https://maps.app.goo.gl/…" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" value={newPoint.latitude} onChange={(v) => setNewPoint({ ...newPoint, latitude: v })} placeholder="38.7075" />
              <Field label="Longitude" value={newPoint.longitude} onChange={(v) => setNewPoint({ ...newPoint, longitude: v })} placeholder="-9.1364" />
            </div>
            <div className="sm:col-span-2">
              <Field label="Instructions for guests" value={newPoint.instructions} onChange={(v) => setNewPoint({ ...newPoint, instructions: v })} placeholder="Meet near the designated TukTuk meeting area." textarea />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={create} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Save</button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {!isLoading && points.length === 0 && !creating && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <MapPin className="mx-auto mb-3 h-6 w-6 text-slate-400" />
          <p className="text-sm text-slate-600">No meetup points yet. Add your first one — guests will see it in the booking form.</p>
        </div>
      )}

      <div className="space-y-4">
        {points.map((p) => {
          const m = merged(p);
          const assigned = assignedTours(p.id);
          return (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    m.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {m.active ? "Active" : "Hidden"}
                </span>
                <div className="flex items-center gap-1">
                  <IconBtn title="Move up" onClick={() => move(p, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                  <IconBtn title="Move down" onClick={() => move(p, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                  <IconBtn title={m.active ? "Hide from customers" : "Show to customers"} onClick={() => update(p.id, { active: !m.active })}>
                    {m.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn title="Delete" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-rose-500" /></IconBtn>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" value={m.name} onChange={(v) => update(p.id, { name: v })} />
                <Field label="Full address" value={m.address} onChange={(v) => update(p.id, { address: v })} />
                <Field label="Google Maps link" value={m.map_url ?? ""} onChange={(v) => update(p.id, { map_url: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" value={m.latitude == null ? "" : String(m.latitude)} onChange={(v) => update(p.id, { latitude: v === "" ? null : (Number(v) as never) })} />
                  <Field label="Longitude" value={m.longitude == null ? "" : String(m.longitude)} onChange={(v) => update(p.id, { longitude: v === "" ? null : (Number(v) as never) })} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Instructions for guests" value={m.instructions ?? ""} onChange={(v) => update(p.id, { instructions: v })} textarea />
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Shown for these tours {assigned.length === 0 && "(none selected = shown for every tour)"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tours.map((t) => {
                    const on = assigned.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTour(p.id, t.id, !on)}
                        className={`rounded-full border px-3 py-1.5 text-[12px] transition ${
                          on
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {t.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isDirty(p.id) && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => save(p)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Save className="h-4 w-4" /> Save changes
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none";
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {textarea ? (
        <textarea rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

function IconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
    >
      {children}
    </button>
  );
}
