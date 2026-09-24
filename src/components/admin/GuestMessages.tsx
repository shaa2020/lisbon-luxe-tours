import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fillTemplate, waUrl, type GuestTemplate } from "@/lib/guest-messages";
import { MessageCircle, ChevronDown, History } from "lucide-react";
import { toast } from "sonner";

export function useGuestTemplates() {
  return useQuery({
    queryKey: ["guest-templates"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("guest_message_templates")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      return (data ?? []) as GuestTemplate[];
    },
  });
}

function useGuide(id: string | null | undefined) {
  return useQuery({
    queryKey: ["guest-msg-guide", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () =>
      (await supabase.from("ops_staff").select("name,phone,whatsapp").eq("id", id!).maybeSingle()).data,
  });
}

async function logSend(bookingId: string, key: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("guest_message_log").insert({
    booking_id: bookingId,
    template_key: key,
    channel: "whatsapp",
    sent_by: data.user.id,
    sent_by_email: data.user.email ?? null,
  });
}

/** Dropdown of ready-written WhatsApp messages for one booking. */
export function GuestMessageMenu({
  booking,
  dueCents = 0,
  compact = false,
}: {
  booking: any;
  dueCents?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data: templates = [] } = useGuestTemplates();
  const { data: guide } = useGuide(booking.guide_id);
  if (!booking.phone) return null;

  const lang = (booking.language || "en").slice(0, 2);
  const byKey = new Map<string, GuestTemplate>();
  for (const t of templates) {
    if (t.language === "en" && !byKey.has(t.key)) byKey.set(t.key, t);
  }
  for (const t of templates) if (t.language === lang) byKey.set(t.key, t);
  const list = [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order);

  const send = async (t: GuestTemplate) => {
    const url = waUrl(booking.phone, fillTemplate(t.body, booking, guide ?? null, dueCents));
    if (!url) return toast.error("This guest has no valid phone number");
    window.open(url, "_blank", "noopener");
    setOpen(false);
    await logSend(booking.id, t.key);
    qc.invalidateQueries({ queryKey: ["guest-msg-log", booking.id] });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Send guest message"
        className={
          compact
            ? "grid place-items-center w-8 h-8 rounded-lg border border-border text-emerald-600 hover:bg-accent"
            : "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
        }
      >
        <MessageCircle className={compact ? "w-4 h-4" : "h-3.5 w-3.5"} strokeWidth={1.75} />
        {!compact && (
          <>
            Message guest <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-60 rounded-xl border border-border bg-popover p-1 shadow-lg">
            {list.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No messages set up yet.</p>
            )}
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => send(t)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** List of messages already sent for one booking. */
export function GuestMessageHistory({ bookingId }: { bookingId: string }) {
  const { data: templates = [] } = useGuestTemplates();
  const { data: rows = [] } = useQuery({
    queryKey: ["guest-msg-log", bookingId],
    queryFn: async () =>
      (
        await supabase
          .from("guest_message_log")
          .select("*")
          .eq("booking_id", bookingId)
          .order("sent_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });
  const label = (k: string) => templates.find((t) => t.key === k)?.label ?? k;
  return (
    <div className="rounded-md border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <History className="h-3.5 w-3.5" strokeWidth={1.75} /> Messages sent
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No guest messages sent yet.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {rows.map((r: any) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2">
              <span className="font-medium text-foreground">
                {label(r.template_key)} <span className="text-muted-foreground">· {r.channel}</span>
              </span>
              <span className="text-muted-foreground">
                {new Date(r.sent_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                {r.sent_by_email ? ` · ${r.sent_by_email}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
