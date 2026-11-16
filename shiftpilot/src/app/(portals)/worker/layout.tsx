import { AppShell } from "@/components/layout/app-shell";
import { WORKER_NAV } from "@/components/layout/nav-config";
import { getMemberships, requireWorker } from "@/lib/auth/session";
import { availablePortals } from "@/lib/auth/portal";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireWorker();
  const portals = availablePortals(await getMemberships());
  return (
    <AppShell portalLabel="Worker" nav={WORKER_NAV} user={ctx.user} canSwitchPortal={portals.length > 1}>
      {children}
    </AppShell>
  );
}
