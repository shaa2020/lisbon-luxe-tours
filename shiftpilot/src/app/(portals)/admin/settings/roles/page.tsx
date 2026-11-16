import type { Metadata } from "next";
import { Fragment } from "react";
import { Check } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata: Metadata = { title: "Roles & permissions" };

export default async function RolesPage() {
  const ctx = await requireStaff();
  if (!ctx.can("users.manage") && !ctx.can("roles.manage")) {
    const { forbidden } = await import("next/navigation");
    forbidden();
  }
  const supabase = await createClient();
  const [{ data: roles }, { data: perms }, { data: grants }] = await Promise.all([
    supabase.from("roles").select("id, key, name, description, is_system").or(`agency_id.is.null,agency_id.eq.${ctx.agencyId}`).order("is_system", { ascending: false }).order("name"),
    supabase.from("permissions").select("key, description, category").order("category").order("key"),
    supabase.from("role_permissions").select("role_id, permission_key"),
  ]);
  const granted = new Set((grants ?? []).map((g) => `${g.role_id}:${g.permission_key}`));
  const categories = [...new Set((perms ?? []).map((p) => p.category))];

  return (
    <>
      <PageHeader title="Roles & permissions" description="What each role can do. System roles are maintained by ShiftPilot; every permission is also enforced by the database." />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH className="sticky left-0 z-10 min-w-56 bg-surface-muted">Permission</TH>
              {(roles ?? []).map((r) => (
                <TH key={r.id} className="text-center normal-case tracking-normal">{r.name}</TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {categories.map((cat) => (
              <Fragment key={cat}>
                <tr className="bg-surface-muted/50">
                  <td colSpan={(roles?.length ?? 0) + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</td>
                </tr>
                {(perms ?? []).filter((p) => p.category === cat).map((p) => (
                  <TR key={p.key}>
                    <TD className="sticky left-0 bg-surface">
                      <span className="block">{p.description}</span>
                      <code className="text-xs text-muted-foreground">{p.key}</code>
                    </TD>
                    {(roles ?? []).map((r) => (
                      <TD key={r.id} className="text-center">
                        {granted.has(`${r.id}:${p.key}`) ? (
                          <Check className="mx-auto size-4 text-success" aria-label="Granted" />
                        ) : (
                          <span className="sr-only">Not granted</span>
                        )}
                      </TD>
                    ))}
                  </TR>
                ))}
              </Fragment>
            ))}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
