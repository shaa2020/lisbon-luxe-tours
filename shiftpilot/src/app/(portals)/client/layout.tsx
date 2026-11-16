import { AppShell } from "@/components/layout/app-shell";
import { CLIENT_NAV } from "@/components/layout/nav-config";
import { getMemberships, requireClient } from "@/lib/auth/session";
import { availablePortals } from "@/lib/auth/portal";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireClient();
  const portals = availablePortals(await getMemberships());
  return (
    <AppShell portalLabel="Client" contextLabel={ctx.clientName} nav={CLIENT_NAV} user={ctx.user} canSwitchPortal={portals.length > 1}>
      {children}
    </AppShell>
  );
}
