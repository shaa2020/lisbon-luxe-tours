import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ before?: string; table?: string }> }) {
  const ctx = await requireStaff("audit.read");
  const { before, table } = await searchParams;
  const supabase = await createClient();
  let q = supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, changed_fields, actor_user_id, actor_role, created_at")
    .eq("agency_id", ctx.agencyId)
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);
  if (before && /^\d+$/.test(before)) q = q.lt("id", Number(before));
  if (table && /^[a-z_]+$/.test(table)) q = q.eq("table_name", table);
  const { data: rows, error } = await q;
  if (error) throw error;
  const last = rows?.at(-1)?.id;

  return (
    <>
      <PageHeader title="Audit log" description="Append-only record of changes. Entries cannot be edited or deleted." />
      <Card className="overflow-hidden">
        {!rows || rows.length === 0 ? (
          <EmptyState icon={FileText} title="No entries" className="m-5" />
        ) : (
          <Table>
            <THead>
              <tr><TH>When</TH><TH>Action</TH><TH>Record</TH><TH>Changed fields</TH><TH>Actor</TH></tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.created_at)}</TD>
                  <TD><Badge tone={r.action === "delete" ? "danger" : r.action === "insert" ? "success" : "neutral"}>{r.action}</Badge></TD>
                  <TD>
                    <span className="block">{r.table_name}</span>
                    <code className="text-xs text-muted-foreground">{r.record_id?.slice(0, 8)}</code>
                  </TD>
                  <TD className="max-w-xs truncate text-muted-foreground">{r.changed_fields?.join(", ") ?? "—"}</TD>
                  <TD className="text-xs text-muted-foreground">{r.actor_user_id ? r.actor_user_id.slice(0, 8) : r.actor_role ?? "system"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
      {rows && rows.length === PAGE_SIZE && last && (
        <div className="mt-4 flex justify-end">
          <a className="text-sm text-primary hover:underline" href={`?before=${last}${table ? `&table=${table}` : ""}`}>Older entries →</a>
        </div>
      )}
    </>
  );
}
