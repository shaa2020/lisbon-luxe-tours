export type EmailLogFilters = {
  start: string;
  end: string;
  templates: string[];
  statuses: string[];
};

export async function fetchEmailDashboard(context: { supabase: any; userId: string }, filters: EmailLogFilters) {
  const { assertAdmin } = await import("./bookings-admin.server");
  await assertAdmin(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("email_send_log")
    .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
    .gte("created_at", filters.start)
    .lte("created_at", filters.end)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error(error.message);

  const latest = new Map<string, any>();
  for (const row of data ?? []) {
    const key = row.message_id || row.id;
    if (!latest.has(key)) latest.set(key, row);
  }

  const allRows = Array.from(latest.values());
  const templateNames = Array.from(new Set(allRows.map((row) => row.template_name))).sort();
  const normalizeStatus = (status: string) => (status === "dlq" ? "failed" : status);
  const rows = allRows.filter((row) => {
    const templateMatch = filters.templates.length === 0 || filters.templates.includes(row.template_name);
    const statusMatch = filters.statuses.length === 0 || filters.statuses.includes(normalizeStatus(row.status));
    return templateMatch && statusMatch;
  });

  return {
    rows,
    templateNames,
    stats: {
      total: rows.length,
      sent: rows.filter((row) => row.status === "sent").length,
      failed: rows.filter((row) => row.status === "failed" || row.status === "dlq").length,
      suppressed: rows.filter((row) => row.status === "suppressed").length,
    },
  };
}