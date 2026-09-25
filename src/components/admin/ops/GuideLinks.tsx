import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, KeyRound, MessageCircle, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { listGuideLinks, resetGuideLink, setGuidePaused, setGuidePin } from "@/lib/guide-dispatch.functions";

function ago(iso: string | null) {
  if (!iso) return "Never opened";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 2) return "Active now";
  if (m < 60) return `Active ${m} min ago`;
  if (m < 1440) return `Active ${Math.round(m / 60)} h ago`;
  return `Active ${Math.round(m / 1440)} d ago`;
}

export function GuideLinks() {
  const list = useServerFn(listGuideLinks);
  const reset = useServerFn(resetGuideLink);
  const pinFn = useServerFn(setGuidePin);
  const pauseFn = useServerFn(setGuidePaused);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ops", "guide-links"], queryFn: () => list() });
  const rows = (q.data ?? []).filter((s: any) => String(s.status).toLowerCase() !== "inactive");
  const refresh = () => qc.invalidateQueries({ queryKey: ["ops", "guide-links"] });
  const url = (t: string) => `https://tuktuk24lisbon.com/guide/${t}`;

  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); await refresh(); toast.success(ok); } catch (e: any) { toast.error(e?.message || "Something went wrong"); }
  }

  if (!rows.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Guide app</h3>
      <p className="mb-3 text-xs text-muted-foreground">Each guide installs the app from their private link and unlocks it with their own 4-digit PIN.</p>
      <ul className="divide-y divide-border">
        {rows.map((s: any) => {
          const link = s.dispatch_token ? url(s.dispatch_token) : null;
          const wa = (s.whatsapp || s.phone || "").replace(/[^\d]/g, "");
          const text = encodeURIComponent(`Hi ${String(s.name).split(" ")[0]}, here is your TukTuk24 Guide app. Open it, tap Install, and unlock with the PIN I'll give you:\n${link}`);
          const locked = s.pin_locked_until && new Date(s.pin_locked_until) > new Date();
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.name} <span className="font-normal text-muted-foreground">· {s.role}</span></p>
                <p className="text-xs text-muted-foreground">
                  {s.access_paused ? <span className="text-destructive">Paused</span> : s.has_pin ? "PIN set" : <span className="text-destructive">No PIN yet</span>}
                  {locked ? " · Locked (wrong PINs)" : ""} · {ago(s.last_seen_at)}
                </p>
              </div>
              <span className="flex gap-1">
                <button className="rounded-md border border-border p-1.5" title="Set PIN" onClick={() => {
                  const pin = window.prompt(`New 4-digit PIN for ${s.name}:`);
                  if (pin == null) return;
                  if (!/^\d{4}$/.test(pin)) return toast.error("PIN must be exactly 4 digits");
                  run(() => pinFn({ data: { staffId: s.id, pin } }), "PIN saved — tell the guide in person");
                }}><KeyRound className="h-4 w-4" /></button>
                {link && (
                  <>
                    <button className="rounded-md border border-border p-1.5" title="Copy link" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></button>
                    {wa && <a className="rounded-md border border-border p-1.5" title="Send on WhatsApp" href={`https://wa.me/${wa}?text=${text}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>}
                    <a className="rounded-md border border-border p-1.5" title="Open" href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </>
                )}
                <button className="rounded-md border border-border p-1.5" title={s.access_paused ? "Resume access" : "Pause access"} onClick={() =>
                  run(() => pauseFn({ data: { staffId: s.id, paused: !s.access_paused } }), s.access_paused ? "Access resumed" : "Access paused")
                }>{s.access_paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
                <button className="rounded-md border border-border p-1.5" title="New link" onClick={() => {
                  if (window.confirm("Make a new link? The old one stops working immediately.")) run(() => reset({ data: { staffId: s.id } }), "New link created");
                }}><RotateCcw className="h-4 w-4" /></button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
