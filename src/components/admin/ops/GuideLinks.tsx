import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { listGuideLinks, resetGuideLink } from "@/lib/guide-dispatch.functions";

const SITE = "https://tuktuk24lisbon.com";

export function GuideLinks() {
  const list = useServerFn(listGuideLinks);
  const reset = useServerFn(resetGuideLink);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ops", "guide-links"], queryFn: () => list() });
  const rows = (q.data ?? []).filter((s: any) => String(s.status).toLowerCase() !== "inactive");

  const url = (t: string) => `${typeof window !== "undefined" ? window.location.origin : SITE}/guide/${t}`;

  async function doReset(id: string) {
    if (!window.confirm("Make a new link? The old one will stop working.")) return;
    try {
      await reset({ data: { staffId: id } });
      await qc.invalidateQueries({ queryKey: ["ops", "guide-links"] });
      toast.success("New link created");
    } catch (e: any) {
      toast.error(e?.message || "Could not reset");
    }
  }

  if (!rows.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Guide run-sheet links</h3>
      <p className="mb-3 text-xs text-muted-foreground">Each guide opens their own link on the phone to see today's and tomorrow's tours, collect cash and finish tours.</p>
      <ul className="divide-y divide-border">
        {rows.map((s: any) => {
          const link = s.dispatch_token ? url(s.dispatch_token) : null;
          const wa = (s.whatsapp || s.phone || "").replace(/[^\d]/g, "");
          const text = encodeURIComponent(`Hi ${String(s.name).split(" ")[0]}, here is your Tuk Tuk 24 tours link. Save it to your home screen:\n${link}`);
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="text-sm">{s.name} <span className="text-muted-foreground">· {s.role}</span></span>
              <span className="flex gap-1">
                {link && (
                  <>
                    <button className="rounded-md border border-border p-1.5" title="Copy link" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></button>
                    {wa && <a className="rounded-md border border-border p-1.5" title="Send on WhatsApp" href={`https://wa.me/${wa}?text=${text}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>}
                    <a className="rounded-md border border-border p-1.5" title="Open" href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                  </>
                )}
                <button className="rounded-md border border-border p-1.5" title="New link" onClick={() => doReset(s.id)}><RotateCcw className="h-4 w-4" /></button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
