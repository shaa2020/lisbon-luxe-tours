import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV, filterNav } from "@/components/layout/nav-config";
import { getMemberships, requireStaff } from "@/lib/auth/session";
import { availablePortals } from "@/lib/auth/portal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  const portals = availablePortals(await getMemberships());
  return (
    <AppShell
      portalLabel="Admin HQ"
      contextLabel={ctx.agencyName}
      nav={filterNav(ADMIN_NAV, ctx.permissions)}
      user={ctx.user}
      canSwitchPortal={portals.length > 1}
    >
      {children}
    </AppShell>
  );
}
