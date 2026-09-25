import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Banknote, CheckCircle2, Clock, CreditCard, Delete, Download, Languages, Link2, Lock, MapPin,
  MessageCircle, Navigation, Phone, Play, Star, UserX, Users, Wallet, WifiOff, X,
} from "lucide-react";
import {
  getGuideRunSheet, guideCollect, guideStatus, guideTourAction, guideUnlock,
} from "@/lib/guide-dispatch.functions";

export const Route = createFileRoute("/guide/$token")({
  head: () => ({
    meta: [
      { title: "My tours · TukTuk24 Guide" },
      { name: "description", content: "Private guide app for Tuk Tuk 24 guides." },
      { property: "og:title", content: "My tours · TukTuk24 Guide" },
      { property: "og:description", content: "Private guide app for Tuk Tuk 24 guides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GuideApp,
  errorComponent: () => <p className="p-6 text-sm">Couldn't load the guide app. Close and open it again.</p>,
  notFoundComponent: () => <p className="p-6 text-sm">Link not found.</p>,
});

type Range = "today" | "tomorrow" | "week" | "history" | "money";
type RunSheet = Awaited<ReturnType<typeof getGuideRunSheet>>;
type Tour = RunSheet["tours"][number];

const euro = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
const digits = (p: string) => p.replace(/[^\d]/g, "");
const first = (n: string) => String(n || "").split(" ")[0];
const passKey = (t: string) => `t24_guide_pass_${t.slice(0, 12)}`;
const cacheKey = (t: string, r: string) => `t24_guide_cache_${t.slice(0, 12)}_${r}`;

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a); window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return on;
}

function GuideApp() {
  const { token } = Route.useParams();
  const [pass, setPass] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.setItem("t24_guide_token", token);
    const link = document.querySelector('link[rel="manifest"]');
    if (link) link.setAttribute("href", "/guide.webmanifest");
    const p = localStorage.getItem(passKey(token));
    if (p && Number(p.split(".")[1]) > Date.now()) setPass(p);
    setReady(true);
  }, [token]);

  const lock = () => { localStorage.removeItem(passKey(token)); setPass(null); };

  if (!ready) return <Wrap><p className="text-sm text-muted-foreground">Loading…</p></Wrap>;
  if (!pass) return <LockScreen token={token} onUnlock={(p) => { localStorage.setItem(passKey(token), p); setPass(p); }} />;
  return <Main token={token} pass={pass} onLock={lock} />;
}

/* ---------------- Lock screen ---------------- */

function LockScreen({ token, onUnlock }: { token: string; onUnlock: (p: string) => void }) {
  const st = useQuery({ queryKey: ["guide-status", token], queryFn: () => guideStatus({ data: { token } }) });
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(p: string) {
    setBusy(true); setErr(null);
    try {
      const r = await guideUnlock({ data: { token, pin: p } });
      if (r.ok) onUnlock(r.pass);
      else { setErr(r.error); setPin(""); }
    } catch { setErr("No connection — try again"); setPin(""); }
    finally { setBusy(false); }
  }
  function press(d: string) {
    if (busy || pin.length >= 4) return;
    const n = pin + d; setPin(n);
    if (n.length === 4) submit(n);
  }

  if (st.isLoading) return <Wrap><p className="text-sm text-muted-foreground">Loading…</p></Wrap>;
  if (!st.data) return <Wrap><p className="text-sm">This link is not active. Ask the office for a new one.</p></Wrap>;
  const s = st.data;

  return (
    <Wrap>
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Lock className="h-6 w-6" strokeWidth={1.75} /></div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">TukTuk24 Guide</p>
        <h1 className="mb-1 text-2xl font-semibold">Hi {s.name}</h1>
        {s.paused ? <p className="text-sm text-destructive">Your access is paused. Please contact the office.</p>
        : !s.hasPin ? <p className="text-sm text-muted-foreground">No PIN set yet. Ask the office to set your 4-digit PIN.</p>
        : <>
          <p className="mb-6 text-sm text-muted-foreground">Enter your 4-digit PIN</p>
          <div className="mb-3 flex gap-3">
            {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-primary ${pin.length > i ? "bg-primary" : ""}`} />)}
          </div>
          <p className="mb-4 h-5 text-sm text-destructive">{err}</p>
          <div className="grid w-64 grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <button key={d} onClick={() => press(d)} className="h-16 rounded-full border border-border bg-card text-2xl font-medium active:bg-muted">{d}</button>
            ))}
            <span />
            <button onClick={() => press("0")} className="h-16 rounded-full border border-border bg-card text-2xl font-medium active:bg-muted">0</button>
            <button onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete" className="flex h-16 items-center justify-center rounded-full active:bg-muted"><Delete className="h-6 w-6" strokeWidth={1.75} /></button>
          </div>
        </>}
      </div>
    </Wrap>
  );
}

/* ---------------- Main app ---------------- */

function Main({ token, pass, onLock }: { token: string; pass: string; onLock: () => void }) {
  const [tab, setTab] = useState<Range>("today");
  const online = useOnline();
  const qc = useQueryClient();
  const range = tab === "money" ? "today" : tab;
  const [cached, setCached] = useState<RunSheet | null>(null);

  const q = useQuery({
    queryKey: ["guide-run", token, range],
    queryFn: async () => {
      const r = await getGuideRunSheet({ data: { token, pass, range } });
      localStorage.setItem(cacheKey(token, range), JSON.stringify(r));
      return r;
    },
    refetchInterval: 60000,
    retry: (n, e: any) => !["LOCKED", "PAUSED"].includes(e?.message) && n < 2,
  });

  useEffect(() => {
    const raw = localStorage.getItem(cacheKey(token, range));
    setCached(raw ? JSON.parse(raw) : null);
  }, [token, range]);

  useEffect(() => {
    const m = (q.error as any)?.message;
    if (m === "LOCKED" || m === "PAUSED") onLock();
  }, [q.error, onLock]);

  const d = q.data ?? cached;
  const refresh = () => qc.invalidateQueries({ queryKey: ["guide-run", token] });

  const tabs: { k: Range; l: string }[] = [
    { k: "today", l: "Today" }, { k: "tomorrow", l: "Tomorrow" }, { k: "week", l: "7 days" },
    { k: "history", l: "History" }, { k: "money", l: "Money" },
  ];

  return (
    <Wrap>
      <header className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">TukTuk24 Guide</p>
          <h1 className="text-2xl font-semibold">Hi {d?.guide.name ?? ""}</h1>
        </div>
        <div className="flex gap-2">
          <InstallButton />
          <button onClick={onLock} aria-label="Lock" className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"><Lock className="h-3.5 w-3.5" strokeWidth={1.75} />Lock</button>
        </div>
      </header>

      {!online && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <WifiOff className="h-4 w-4" strokeWidth={1.75} />No connection — showing last saved tours. Buttons will work when you're back online.
        </p>
      )}

      <nav className="sticky top-0 z-10 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-background px-4 py-2">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${tab === t.k ? "bg-primary text-primary-foreground" : "border border-border"}`}>{t.l}</button>
        ))}
      </nav>

      {!d && q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {d && tab === "money" && <Money d={d} />}
      {d && tab !== "money" && (
        <div className="space-y-3">
          {d.tours.length === 0 && <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">No tours.</p>}
          {d.tours.map((t) => (
            <TourCard key={t.id} t={t} token={token} pass={pass} online={online} showDate={tab === "week" || tab === "history"} reviewUrl={d.reviewUrl} onDone={refresh} />
          ))}
        </div>
      )}

      {d && (
        <div className="mt-8 grid grid-cols-2 gap-2">
          <a href={`tel:+${digits(d.office.phone)}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm"><Phone className="h-4 w-4" strokeWidth={1.75} />Call office</a>
          <a href={`https://wa.me/${digits(d.office.whatsapp)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm"><MessageCircle className="h-4 w-4" strokeWidth={1.75} />WhatsApp office</a>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-muted-foreground">Updates every minute · Locks automatically after 12 hours</p>
    </Wrap>
  );
}

function Money({ d }: { d: RunSheet }) {
  const e = d.earnings;
  const Row = ({ l, v, strong }: { l: string; v: number; strong?: boolean }) => (
    <div className="flex justify-between py-2 text-sm"><span className={strong ? "font-semibold" : "text-muted-foreground"}>{l}</span><span className={strong ? "font-semibold" : ""}>{euro(v)}</span></div>
  );
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-primary p-4 text-primary-foreground">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-80"><Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />Cash to hand in</p>
        <p className="text-3xl font-semibold">{euro(e.cashToHandIn)}</p>
        <p className="text-xs opacity-80">Cash you collected that hasn't been handed to the office yet</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">Today</h3>
        <div className="divide-y divide-border"><Row l="Cash collected" v={e.todayCash} /><Row l="Card collected" v={e.todayCard} /></div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">This month</h3>
        <div className="divide-y divide-border">
          <Row l="Cash collected" v={e.monthCash} />
          <Row l="Card collected" v={e.monthCard} />
        </div>
      </section>
    </div>
  );
}

function TourCard({ t, token, pass, online, showDate, reviewUrl, onDone }: {
  t: Tour; token: string; pass: string; online: boolean; showDate: boolean; reviewUrl: string; onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const done = t.stage === "completed" || t.stage === "no_show" || t.rawStatus === "no_show";
  const started = t.stage === "in_progress";
  const onWay = t.rawStatus === "on_the_way";
  const ph = t.phone ? digits(t.phone) : "";
  const g = first(t.guest);
  const maps = t.lat && t.lng
    ? `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}`
    : t.address || t.place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address || t.place || "")}` : null;
  const wa = (text: string) => ph ? `https://wa.me/${ph}?text=${encodeURIComponent(text)}` : null;

  async function act(action: "onway" | "start" | "noshow" | "finish") {
    if (action === "noshow" && !window.confirm("Mark this guest as a no-show?")) return;
    if (action === "finish" && t.due_cents > 0 && !window.confirm(`${euro(t.due_cents)} is still owed. Finish anyway?`)) return;
    setBusy(action);
    try {
      await guideTourAction({ data: { token, pass, bookingId: t.id, action } });
      if (action === "onway") {
        const link = wa(`Hi ${g}! I'm your Tuk Tuk 24 guide and I'm on my way to ${t.place || "the meeting point"}. See you soon!${t.tripUrl ? `\nFollow your tour: ${t.tripUrl}` : ""}`);
        if (link) window.open(link, "_blank");
      }
      onDone();
    } catch (e: any) { window.alert(e?.message || "Something went wrong"); }
    finally { setBusy(null); }
  }

  const quick = [
    { l: "Running late", m: `Hi ${g}, it's your Tuk Tuk 24 guide. I'm running about 10 minutes late — so sorry, see you very soon!` },
    { l: "I've arrived", m: `Hi ${g}, I've arrived at ${t.place || "the meeting point"}. Look for the Tuk Tuk 24 tuk-tuk!` },
    { l: "Where are you?", m: `Hi ${g}, I'm at ${t.place || "the meeting point"} — where are you? Send me your location and I'll come to you.` },
    { l: "Weather", m: `Hi ${g}, just a heads-up: the tuk-tuk has rain covers, so the tour goes ahead in any weather. See you soon!` },
  ];

  return (
    <article className={`rounded-xl border border-border bg-card p-4 ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate && <p className="text-xs font-medium text-muted-foreground">{new Date(t.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</p>}
          <p className="flex items-center gap-1.5 text-lg font-semibold"><Clock className="h-4 w-4" strokeWidth={1.75} />{t.time?.slice(0, 5) || "—"}{t.duration ? <span className="text-xs font-normal text-muted-foreground">· {t.duration}</span> : null}</p>
          <p className="text-sm font-medium">{t.tour}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" strokeWidth={1.75} />{t.guest} · {t.guests}</span>
            {t.language && <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" strokeWidth={1.75} />{t.language}</span>}
            {t.ref && <span>{t.ref}</span>}
          </p>
        </div>
        {done ? <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{t.rawStatus === "no_show" || t.stage === "no_show" ? "No-show" : "Done"}</span>
          : started ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">On tour</span>
          : onWay ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">On the way</span> : null}
      </div>

      <div className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${t.due_cents > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        <span className="flex items-center gap-2"><Banknote className="h-4 w-4" strokeWidth={1.75} />{t.due_cents > 0 ? `COLLECT ${euro(t.due_cents)}` : "Fully paid (€0 due)"}</span>
      </div>

      {(t.place || t.address || t.instructions || t.notes) && (
        <div className="mt-3 divide-y divide-border rounded-lg border border-border">
          {(t.place || t.address) && (
            <div className="flex items-start gap-2 p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
              <div className="min-w-0 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Meeting point</p>
                <p className="font-medium">{t.place || t.address}</p>
                {t.address && t.address !== t.place && <p className="text-muted-foreground">{t.address}</p>}
                {t.instructions && <p className="mt-1 text-muted-foreground">{t.instructions}</p>}
              </div>
            </div>
          )}
          {t.notes && (
            <div className="p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
              <p className="whitespace-pre-line">{t.notes}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {maps ? <a href={maps} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><MapPin className="h-4 w-4" strokeWidth={1.75} />Map</a> : <span />}
        {ph ? <a href={`tel:+${ph}`} className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><Phone className="h-4 w-4" strokeWidth={1.75} />Call</a> : <span />}
        {ph ? <a href={`https://wa.me/${ph}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-lg border border-border py-2.5 text-sm"><MessageCircle className="h-4 w-4" strokeWidth={1.75} />WhatsApp</a> : <span />}
      </div>

      {!done && ph && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {quick.map((x) => <a key={x.l} href={wa(x.m)!} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-border px-3 py-1 text-xs">{x.l}</a>)}
        </div>
      )}

      {!done && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!online || onWay || started || !!busy} onClick={() => act("onway")} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm font-medium disabled:opacity-40"><Navigation className="h-4 w-4" strokeWidth={1.75} />On my way</button>
            <button disabled={!online || started || !!busy} onClick={() => act("start")} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm font-medium disabled:opacity-40"><Play className="h-4 w-4" strokeWidth={1.75} />Start tour</button>
          </div>
          {t.due_cents > 0 && (
            <button disabled={!online || !!busy} onClick={() => setPay(true)} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"><Wallet className="h-4 w-4" strokeWidth={1.75} />Take payment · {euro(t.due_cents)}</button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!online || !!busy} onClick={() => act("noshow")} className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-3 text-sm disabled:opacity-40"><UserX className="h-4 w-4" strokeWidth={1.75} />No-show</button>
            <button disabled={!online || !!busy} onClick={() => act("finish")} className={`flex items-center justify-center gap-1.5 rounded-lg py-3 text-sm font-semibold disabled:opacity-40 ${t.due_cents > 0 ? "border border-border" : "bg-primary text-primary-foreground"}`}><CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />{busy === "finish" ? "…" : "Finish tour"}</button>
          </div>
        </div>
      )}

      {t.stage === "completed" && ph && (
        <a href={wa(`Hi ${g}, thank you so much for touring Lisbon with Tuk Tuk 24! If you enjoyed it, a quick review would mean the world to us: ${reviewUrl}`)!} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-sm"><Star className="h-4 w-4" strokeWidth={1.75} />Ask for a review</a>
      )}

      {pay && <PaySheet t={t} token={token} pass={pass} onClose={() => setPay(false)} onDone={() => { setPay(false); onDone(); }} wa={wa} />}
    </article>
  );
}

function PaySheet({ t, token, pass, onClose, onDone, wa }: {
  t: Tour; token: string; pass: string; onClose: () => void; onDone: () => void; wa: (s: string) => string | null;
}) {
  const [method, setMethod] = useState<"cash" | "card" | "link">("cash");
  const [amount, setAmount] = useState((t.due_cents / 100).toFixed(2));
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const cents = Math.round(Number(amount.replace(",", ".")) * 100);
  const valid = cents > 0 && cents <= t.due_cents;

  async function save() {
    if (method === "link") {
      const l = wa(`Hi ${first(t.guest)}, here is a secure link to pay the remaining ${euro(t.due_cents)} for your Tuk Tuk 24 tour: ${t.payUrl}`);
      if (l) window.open(l, "_blank");
      onClose();
      return;
    }
    if (!valid) return;
    if (!window.confirm(`Confirm you received ${euro(cents)} by ${method}?`)) return;
    setBusy(true);
    try {
      await guideCollect({ data: { token, pass, bookingId: t.id, method, amountCents: cents, reference: ref || undefined } });
      onDone();
    } catch (e: any) { window.alert(e?.message || "Could not save"); }
    finally { setBusy(false); }
  }

  const opt = (k: typeof method, l: string, Icon: any) => (
    <button onClick={() => setMethod(k)} className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-sm ${method === k ? "border-primary bg-primary/10 text-primary" : "border-border"}`}><Icon className="h-5 w-5" strokeWidth={1.75} />{l}</button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-foreground/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-background p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Take payment</h3>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" strokeWidth={1.75} /></button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">{t.guest} owes <b className="text-foreground">{euro(t.due_cents)}</b></p>
        <div className="mb-4 grid grid-cols-3 gap-2">{opt("cash", "Cash", Banknote)}{opt("card", "Card", CreditCard)}{opt("link", "Pay link", Link2)}</div>
        {method !== "link" ? (
          <>
            <label className="mb-1 block text-xs text-muted-foreground">Amount received (€)</label>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mb-1 w-full rounded-lg border border-border bg-card px-3 py-3 text-lg" />
            {!valid && <p className="mb-2 text-xs text-destructive">Enter an amount up to {euro(t.due_cents)}</p>}
            {method === "card" && (
              <>
                <label className="mb-1 mt-2 block text-xs text-muted-foreground">Card last 4 digits or receipt no. (optional)</label>
                <input value={ref} onChange={(e) => setRef(e.target.value.slice(0, 60))} className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-3" />
              </>
            )}
            <button disabled={!valid || busy} onClick={save} className="mt-3 w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40">{busy ? "Saving…" : `Confirm ${method} ${valid ? euro(cents) : ""}`}</button>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Sends the guest a secure link on WhatsApp so they can pay online. It shows as paid only once the money arrives.</p>
            <button onClick={save} className="w-full rounded-lg bg-primary py-3.5 text-sm font-semibold text-primary-foreground">Send pay link on WhatsApp</button>
          </>
        )}
      </div>
    </div>
  );
}

function InstallButton() {
  const [evt, setEvt] = useState<any>(null);
  const [help, setHelp] = useState(false);
  const [standalone, setStandalone] = useState(true);
  useEffect(() => {
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);
    const h = (e: any) => { e.preventDefault(); setEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (standalone) return null;
  return (
    <>
      <button onClick={async () => { if (evt) { evt.prompt(); setEvt(null); } else setHelp(true); }} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs"><Download className="h-3.5 w-3.5" strokeWidth={1.75} />Install</button>
      {help && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40" onClick={() => setHelp(false)}>
          <div className="w-full rounded-t-2xl bg-background p-5 pb-8 text-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">Install the guide app</h3>
            <p className="mb-1 font-medium">iPhone (Safari)</p>
            <ol className="mb-3 list-decimal pl-5 text-muted-foreground"><li>Tap the Share button at the bottom</li><li>Tap "Add to Home Screen"</li><li>Tap "Add"</li></ol>
            <p className="mb-1 font-medium">Android (Chrome)</p>
            <ol className="mb-4 list-decimal pl-5 text-muted-foreground"><li>Tap the ⋮ menu at the top right</li><li>Tap "Install app" or "Add to Home screen"</li></ol>
            <button onClick={() => setHelp(false)} className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground">Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-md bg-background px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] text-foreground">{children}</main>;
}
