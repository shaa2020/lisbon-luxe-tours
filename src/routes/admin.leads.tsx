import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Sparkles } from "lucide-react";
import { AdminShell, AdminPageHeader, AdminCard } from "@/components/admin/AdminShell";
import {
  getConversationThread,
  listConversations,
  listLeads,
  updateLeadStatus,
} from "@/lib/leads.functions";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({ meta: [{ title: "Leads & chats — Admin" }] }),
  component: () => (
    <AdminShell requires="bookings.view">
      <LeadsBody />
    </AdminShell>
  ),
});

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

function when(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function LeadsBody() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listLeads);
  const fetchChats = useServerFn(listConversations);
  const fetchThread = useServerFn(getConversationThread);
  const setStatus = useServerFn(updateLeadStatus);

  const [openChat, setOpenChat] = useState<string | null>(null);

  const leads = useQuery({ queryKey: ["admin-leads"], queryFn: () => fetchLeads({}) });
  const chats = useQuery({ queryKey: ["admin-conversations"], queryFn: () => fetchChats({}) });
  const thread = useQuery({
    queryKey: ["admin-conversation", openChat],
    queryFn: () => fetchThread({ data: { id: openChat! } }),
    enabled: Boolean(openChat),
  });

  const statusM = useMutation({
    mutationFn: (v: { id: string; status: (typeof STATUSES)[number] }) => setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Inbox"
        title="Leads & WhatsApp chats"
        description="Enquiries captured by the API, the AI agent and n8n automations."
      />

      <AdminCard className="mb-6">
        <div className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4" /> Leads ({leads.data?.length ?? 0})
          </h3>
          {leads.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (leads.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <div className="space-y-3">
              {(leads.data ?? []).map((l) => (
                <div key={l.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{l.name || "Unnamed guest"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[l.phone, l.email, l.language?.toUpperCase()].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[
                          l.tour_slug ? `Tour: ${l.tour_slug}` : null,
                          l.preferred_date ? `Date: ${l.preferred_date}` : null,
                          l.preferred_time ? `Time: ${l.preferred_time}` : null,
                          l.number_of_people ? `${l.number_of_people} guests` : null,
                          `Source: ${l.source}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {l.message && <p className="mt-2 text-sm">{l.message}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground">{when(l.created_at)}</p>
                    </div>
                    <select
                      value={l.status}
                      onChange={(e) =>
                        statusM.mutate({ id: l.id, status: e.target.value as (typeof STATUSES)[number] })
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="h-4 w-4" /> WhatsApp conversations ({chats.data?.length ?? 0})
          </h3>
          {(chats.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {(chats.data ?? []).map((c) => (
                <div key={c.id} className="rounded-xl border border-border">
                  <button
                    onClick={() => setOpenChat(openChat === c.id ? null : c.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
                  >
                    <span className="text-sm font-semibold">
                      {c.display_name || c.phone}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">{c.phone}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.handled_by === "ai" ? "AI" : "Human"} · {when(c.last_message_at)}
                    </span>
                  </button>
                  {openChat === c.id && (
                    <div className="space-y-2 border-t border-border p-4">
                      {thread.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                      {(thread.data ?? []).map((m) => (
                        <div
                          key={m.id}
                          className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                            m.sender === "customer" ? "bg-muted" : "ml-auto bg-primary/10"
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {m.sender} · {when(m.sent_at)}
                          </p>
                          <p>{m.body || `(${m.message_type})`}</p>
                        </div>
                      ))}
                      {(thread.data ?? []).length === 0 && !thread.isLoading && (
                        <p className="text-xs text-muted-foreground">No messages stored yet.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>
    </>
  );
}
