import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Mail, Check, X, Clock3, Users } from "lucide-react";
import { AdminShell, AdminPageHeader, AdminCard } from "@/components/admin/AdminShell";
import { listAbandonedCheckouts, setAbandonedStatus } from "@/lib/abandoned.functions";

export const Route = createFileRoute("/admin/abandoned")({
  head: () => ({ meta: [{ title: "Unfinished bookings — Admin" }] }),
  component: () => (
    <AdminShell requires="bookings.view">
      <AbandonedBody />
    </AdminShell>
  ),
});

const SITE = "https://tuktuk24lisbon.com";

function ago(value: string | null | undefined) {
  if (!value) return "—";
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

type Row = Awaited<ReturnType<typeof listAbandonedCheckouts>>[number];

function resumeLink(row: Row) {
  const params = new URLSearchParams({ resume: "1" });
  if (row.name) params.set("name", row.name);
  if (row.email) params.set("email", row.email);
  if (row.phone) params.set("phone", row.phone);
  if (row.preferred_date) params.set("date", row.preferred_date);
  if (row.preferred_time) params.set("time", row.preferred_time);
  if (row.number_of_people) params.set("guests", String(row.number_of_people));
  const path = row.tour_slug ? `/tours/${row.tour_slug}` : "/tours";
  return `${SITE}${path}?${params.toString()}`;
}

function recoveryText(row: Row) {
  const tour = row.message?.split(" · ")[0] || "your Lisbon tuk-tuk tour";
  const when = [row.preferred_date, row.preferred_time].filter(Boolean).join(" at ");
  return [
    `Hi ${row.name || "there"}! 👋`,
    "",
    `We saw you started booking ${tour}${when ? ` for ${when}` : ""} with Tuk Tuk 24.`,
    "We're holding a private electric tuk-tuk for you — you can finish here in under a minute:",
    resumeLink(row),
    "",
    "Any questions, just reply to this message.",
  ].join("\n");
}

function AbandonedBody() {
  const qc = useQueryClient();
  const fetchRows = useServerFn(listAbandonedCheckouts);
  const setStatus = useServerFn(setAbandonedStatus);

  const rows = useQuery({ queryKey: ["admin-abandoned"], queryFn: () => fetchRows({}) });

  const statusM = useMutation({
    mutationFn: (v: { id: string; status: "contacted" | "won" | "lost" }) =>
      setStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-abandoned"] });
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = rows.data ?? [];

  return (
    <>
      <AdminPageHeader
        eyebrow="Recover bookings"
        title="Unfinished bookings"
        description="Guests who filled in their details but left before paying. Send them a one-tap link to finish."
      />

      <AdminCard>
        <div className="p-5">
          {rows.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing to chase right now — every started booking was completed.
            </p>
          ) : (
            <div className="space-y-3">
              {list.map((row) => {
                const wa = (row.phone || "").replace(/[^\d]/g, "");
                return (
                  <div key={row.id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {row.name || "Unnamed guest"}
                          {row.status === "contacted" && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide">
                              Contacted
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[row.email, row.phone].filter(Boolean).join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{row.message || "—"}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {[row.preferred_date, row.preferred_time].filter(Boolean).join(" · ") ||
                              "No date chosen"}
                          </span>
                          {row.number_of_people ? (
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                              {row.number_of_people} guests
                            </span>
                          ) : null}
                          <span>Started {ago(row.created_at)}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {wa && (
                          <a
                            href={`https://wa.me/${wa}?text=${encodeURIComponent(recoveryText(row))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => statusM.mutate({ id: row.id, status: "contacted" })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={1.75} /> WhatsApp
                          </a>
                        )}
                        {row.email && (
                          <a
                            href={`mailto:${row.email}?subject=${encodeURIComponent(
                              "Finish your Lisbon tuk-tuk booking",
                            )}&body=${encodeURIComponent(recoveryText(row))}`}
                            onClick={() => statusM.mutate({ id: row.id, status: "contacted" })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                          >
                            <Mail className="h-4 w-4" strokeWidth={1.75} /> Email
                          </a>
                        )}
                        <button
                          onClick={() => statusM.mutate({ id: row.id, status: "won" })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                        >
                          <Check className="h-4 w-4" strokeWidth={1.75} /> Booked
                        </button>
                        <button
                          onClick={() => statusM.mutate({ id: row.id, status: "lost" })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"
                        >
                          <X className="h-4 w-4" strokeWidth={1.75} /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AdminCard>
    </>
  );
}
