import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getCustomTourComponents, submitCustomTour } from "@/lib/custom-tour.functions";
import { Check, MapPin, Car, Clock, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/tours/custom")({
  component: CustomBuilderPage,
  head: () => ({
    meta: [
      { title: "Build Your Custom Lisbon Tour | Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Design your own private Lisbon experience. Choose vehicle, destinations, duration, and add-ons — see live pricing and book instantly.",
      },
    ],
  }),
});

type Component = {
  id: string;
  category: "vehicle" | "destination" | "addon" | "duration";
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

const CAT_META = {
  vehicle: { title: "Vehicle", icon: Car, single: true, required: true },
  duration: { title: "Duration", icon: Clock, single: true, required: true },
  destination: { title: "Destinations", icon: MapPin, single: false, required: true },
  addon: { title: "Add-ons", icon: Sparkles, single: false, required: false },
} as const;

const ORDER: (keyof typeof CAT_META)[] = ["vehicle", "duration", "destination", "addon"];

function CustomBuilderPage() {
  const fetcher = useServerFn(getCustomTourComponents);
  const submit = useServerFn(submitCustomTour);
  const { data: components = [], isLoading } = useQuery({
    queryKey: ["custom-tour-components"],
    queryFn: () => fetcher(),
  });

  const grouped = useMemo(() => {
    const map: Record<string, Component[]> = {
      vehicle: [],
      duration: [],
      destination: [],
      addon: [],
    };
    (components as Component[]).forEach((c) => {
      if (map[c.category]) map[c.category].push(c);
    });
    return map;
  }, [components]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    customer_name: "",
    email: "",
    phone: "",
    travel_date: "",
    time: "",
    guests: 2,
    notes: "",
  });
  const [busy, setBusy] = useState<null | "pay" | "request">(null);

  function toggle(id: string, category: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      const meta = CAT_META[category as keyof typeof CAT_META];
      if (meta.single) {
        // remove any other in this category
        grouped[category].forEach((c) => next.delete(c.id));
        if (!prev.has(id)) next.add(id);
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  const selectedComponents = useMemo(
    () => (components as Component[]).filter((c) => selected.has(c.id)),
    [components, selected],
  );
  const total = selectedComponents.reduce((s, c) => s + c.price_cents, 0);

  function validate(): string | null {
    if (!form.customer_name.trim()) return "Please enter your name";
    if (!form.email.trim()) return "Please enter your email";
    if (!grouped.vehicle.some((c) => selected.has(c.id))) return "Pick a vehicle";
    if (!grouped.duration.some((c) => selected.has(c.id))) return "Pick a duration";
    if (!grouped.destination.some((c) => selected.has(c.id)))
      return "Pick at least one destination";
    return null;
  }

  async function handleSubmit(mode: "pay" | "request") {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(mode);
    try {
      const res = await submit({
        data: {
          component_ids: Array.from(selected),
          customer_name: form.customer_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          travel_date: form.travel_date || null,
          time: form.time || null,
          guests: Number(form.guests) || 1,
          notes: form.notes.trim() || null,
          mode,
        },
      });
      if (res.mode === "pay" && "url" in res && res.url) {
        window.location.href = res.url;
      } else {
        toast.success("Quote request sent! We'll be in touch within 24h.");
        setSelected(new Set());
        setForm({
          customer_name: "",
          email: "",
          phone: "",
          travel_date: "",
          time: "",
          guests: 2,
          notes: "",
        });
      }
    } catch (e) {
      toast.error((e as Error).message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />
      <main className="pt-[68px] md:pt-[120px]">
        {/* Hero */}
        <section className="bg-ink text-white py-12 md:py-20">
          <div className="container-x text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-3">
              Build your own
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Design Your Private Lisbon Tour
            </h1>
            <p className="max-w-xl mx-auto text-white/75 text-sm md:text-base">
              Pick your vehicle, destinations, and extras. Live pricing — book now or request a quote.
            </p>
          </div>
        </section>

        {/* Builder */}
        <section className="py-10 md:py-16">
          <div className="container-x grid lg:grid-cols-[1fr_360px] gap-8">
            <div className="space-y-10">
              {isLoading && (
                <div className="grid place-items-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading &&
                ORDER.map((cat) => {
                  const meta = CAT_META[cat];
                  const Icon = meta.icon;
                  const items = grouped[cat] || [];
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex items-baseline gap-3 mb-4">
                        <Icon className="w-5 h-5 text-gold" />
                        <h2 className="font-display text-2xl font-bold">{meta.title}</h2>
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {meta.single ? "Pick one" : "Pick any"}
                          {meta.required ? " · required" : ""}
                        </span>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {items.map((c) => {
                          const isSel = selected.has(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggle(c.id, cat)}
                              className={`text-left rounded-xl border p-4 transition-all ${
                                isSel
                                  ? "border-gold bg-gold/5 shadow-[0_4px_16px_rgba(43,182,247,0.15)]"
                                  : "border-border bg-white hover:border-gold/50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-ink">{c.name}</div>
                                  {c.description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {c.description}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-display font-bold text-ink">
                                    {c.price_cents === 0
                                      ? "Free"
                                      : `€${(c.price_cents / 100).toFixed(0)}`}
                                  </div>
                                  {isSel && (
                                    <Check className="w-4 h-4 text-gold ml-auto mt-1" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-[140px] lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-display text-xl font-bold mb-4">Your Tour</h3>

                {selectedComponents.length === 0 ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    No components selected yet.
                  </p>
                ) : (
                  <ul className="space-y-2 mb-4 text-sm">
                    {selectedComponents.map((c) => (
                      <li key={c.id} className="flex justify-between gap-3">
                        <span className="text-foreground">{c.name}</span>
                        <span className="font-medium text-muted-foreground">
                          {c.price_cents === 0 ? "—" : `€${(c.price_cents / 100).toFixed(0)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-border pt-3 mb-5 flex justify-between items-baseline">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Estimated total
                  </span>
                  <span className="font-display text-2xl font-bold text-gold">
                    €{(total / 100).toFixed(0)}
                  </span>
                </div>

                <div className="space-y-3">
                  <input
                    placeholder="Full name *"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold"
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={form.travel_date}
                      onChange={(e) => setForm({ ...form, travel_date: e.target.value })}
                      className="px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold"
                    />
                    <input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-muted-foreground">Guests</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.guests}
                      onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })}
                      className="w-20 px-3 py-2 rounded-lg border border-border bg-white text-sm text-center focus:outline-none focus:border-gold"
                    />
                  </div>
                  <textarea
                    placeholder="Anything else we should know?"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-gold resize-none"
                  />
                </div>

                <div className="mt-5 space-y-2">
                  <button
                    onClick={() => handleSubmit("pay")}
                    disabled={!!busy || total < 100}
                    className="w-full py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {busy === "pay" && <Loader2 className="w-4 h-4 animate-spin" />}
                    Book & Pay €{(total / 100).toFixed(0)}
                  </button>
                  <button
                    onClick={() => handleSubmit("request")}
                    disabled={!!busy}
                    className="w-full py-3 rounded-full border border-border text-ink text-[12px] font-semibold uppercase tracking-widest hover:bg-accent transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {busy === "request" && <Loader2 className="w-4 h-4 animate-spin" />}
                    Request Quote
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                  Quote requests are confirmed via email within 24 hours.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
