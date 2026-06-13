import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { Mail, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesInbox,
});

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
};

const STATUSES = ["new", "read", "archived"] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    new: "bg-primary/10 text-primary border-primary/20",
    read: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    archived: "bg-muted/50 text-muted-foreground border-border",
  };
  return map[s] || map.new;
}

function MessagesInbox() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Message[];
    },
  });

  const filtered = filter === "all" ? messages : messages.filter((m) => m.status === filter);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: messages.filter((m) => m.status === s).length }),
    { all: messages.length } as Record<string, number>,
  );

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["admin-count", "contact_messages"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
    qc.invalidateQueries({ queryKey: ["admin-count", "contact_messages"] });
  };

  const mailto = (m: Message) => {
    const subject = m.subject ? `Re: ${m.subject}` : "Re: your message to Tuk Tuk 24";
    const body = `Hi ${m.name},\n\nThanks for reaching out.\n\n— Tuk Tuk 24\n\n---\n> ${m.message.split("\n").join("\n> ")}`;
    return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Inbox</p>
        <h1 className="text-3xl font-display font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contact form submissions from your website.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)}{" "}
            <span className="opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No messages here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-border bg-card p-5"
              onMouseEnter={() => m.status === "new" && updateStatus(m.id, "read")}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl">{m.name}</h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(m.status)}`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <a href={`mailto:${m.email}`} className="hover:text-primary">
                      {m.email}
                    </a>{" "}
                    ·{" "}
                    {new Date(m.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              {m.subject && (
                <p className="text-sm font-semibold text-foreground mb-2">{m.subject}</p>
              )}
              <div className="rounded-md bg-muted/40 border border-border p-3 text-sm text-foreground mb-4 whitespace-pre-wrap">
                {m.message}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={mailto(m)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90"
                >
                  <Mail className="w-4 h-4" />
                  Reply by email
                </a>
                <select
                  value={m.status}
                  onChange={(e) => updateStatus(m.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      Mark as {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(m.id)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
