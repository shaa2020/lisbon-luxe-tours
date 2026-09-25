import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, CheckCircle2, Clock, MapPin, MessageCircle, Phone, Play, Users } from "lucide-react";
import { getGuideRunSheet, guideTourAction } from "@/lib/guide-dispatch.functions";

export const Route = createFileRoute("/guide/$token")({
  head: () => ({
    meta: [
      { title: "My tours · Tuk Tuk 24 guide" },
      { name: "description", content: "Private daily run-sheet for Tuk Tuk 24 guides." },
      { property: "og:title", content: "My tours · Tuk Tuk 24 guide" },
      { property: "og:description", content: "Private daily run-sheet for Tuk Tuk 24 guides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GuidePage,
  errorComponent: () => <p className="p-6 text-sm">Couldn't load your tours. Pull down to refresh.</p>,
  notFoundComponent: () => <p className="p-6 text-sm">Link not found.</p>,
});

const euro = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
const digits = (p: string) => p.replace(/[^\d]/g, "");

function GuidePage() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["guide-run", token],
    queryFn: () => getGuideRunSheet({ data: { token } }),
    refetchInterval: 60000,
  });

  async function act(id: string, action: "start" | "finish", due: number) {
    if (action === "finish") {
      const msg = due > 0 ? `Confirm you collected ${euro(due)} cash and the tour is finished?` : "Mark this tour as finished?";
      if (!window.confirm(msg)) return;
    }
    setBusy(id + action);
    try {
      await guideTourAction({ data: { token, bookingId: id, action } });
      await qc.invalidateQueries({ queryKey: ["guide-run", token] });
    } catch (e: any) {
      window.alert(e?.message || "Something went wrong — try again");
    } finally {
      setBusy(null);
    }
  }

  if (q.isLoading) return <Wrap><p className="text-sm text-muted-foreground">Loading…</p></Wrap>;
  const d = q.data;
  if (!d) return <Wrap><p className="text-sm">This link is not active. Ask the office for a new one.</p></Wrap>;

  const days = [
    { key: d.today, label: "Today" },
    { key: d.tomorrow, label: "Tomorrow" },
  ];

  return (
    <Wrap>
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tuk Tuk 24</p>
        <h1 className="text-2xl font-semibold">Hi {d.guide.name}</h1>
      </header>
      {days.map((day) => {
        const tours = d.tours.filter((t) => t.date === day.key);
        return (
          <section key={day.key} className="mb-7">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              {day.label} · {new Date(day.key + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </h2>
            {tours.length === 0 && <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No tours.</p>}
            <div className="space-y-3">
              {tours.map((t) => {
                const done = t.stage === "completed";
                const started = t.stage === "in_progress";
                const maps = t.lat && t.lng
                  ? `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`
                  : t.address || t.place
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address || t.place || "")}`
                    : null;
                const ph = t.phone ? digits(t.phone) : "";
                return (
                  <article key={t.id} className={`rounded-xl border border-border bg-card p-4 ${done ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="flex items-center gap-1.5 text-lg font-semibold"><Clock className="h-4 w-4" strokeWidth={1.75} />{t.time?.slice(0, 5) || "—"}</p>
                        <p className="text-sm font-medium">{t.tour}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" strokeWidth={1.75} />{t.guest} · {t.guests} guests{t.ref ? ` · ${t.ref}` : ""}</p>
                      </div>
                      {done && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Done</span>}
                      {started && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">On tour</span>}
                    </div>

                    <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${t.due_cents > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <span className="flex items-center gap-2"><Banknote className="h-4 w-4" strokeWidth={1.75} />
                        {t.due_cents > 0 ? `COLLECT ${euro(t.due_cents)} CASH` : "Fully paid (€0 due)"}
                      </span>
                    </div>

                    {(t.place || t.address) && (
                      <p className="mt-3 flex items-start gap-1.5 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                        <span>{t.place}{t.address && t.address !== t.place ? ` — ${t.address}` : ""}{t.instructions ? <span className="block text-muted-foreground">{t.instructions}</span> : null}</span>
                      </p>
                    )}
                    {t.notes && <p className="mt-2 rounded-md bg-muted p-2 text-xs">{t.notes}</p>}

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {maps ? <a href={maps} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><MapPin className="h-4 w-4" strokeWidth={1.75} />Map</a> : <span />}
                      {ph ? <a href={`tel:+${ph}`} className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><Phone className="h-4 w-4" strokeWidth={1.75} />Call</a> : <span />}
                      {ph ? <a href={`https://wa.me/${ph}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><MessageCircle className="h-4 w-4" strokeWidth={1.75} />WhatsApp</a> : <span />}
                    </div>

                    {!done && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button disabled={started || !!busy} onClick={() => act(t.id, "start", t.due_cents)} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm font-medium disabled:opacity-40">
                          <Play className="h-4 w-4" strokeWidth={1.75} />{busy === t.id + "start" ? "…" : "Start tour"}
                        </button>
                        <button disabled={!!busy} onClick={() => act(t.id, "finish", t.due_cents)} className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
                          <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />{busy === t.id + "finish" ? "…" : t.due_cents > 0 ? "Cash collected & done" : "Tour finished"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-center text-xs text-muted-foreground">Updates every minute · keep this link private</p>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-md bg-background px-4 py-6 text-foreground">{children}</main>;
}
