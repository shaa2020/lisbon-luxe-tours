import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, HardHat, LayoutDashboard } from "lucide-react";
import { getMemberships, requireUser } from "@/lib/auth/session";
import { availablePortals, resolveLanding, PORTAL_PATHS, type PortalKind } from "@/lib/auth/portal";
import { BrandMark } from "@/components/layout/brand";
import { EmptyState } from "@/components/ui/feedback";

export const metadata: Metadata = { title: "Choose a portal" };

const META: Record<PortalKind, { title: string; description: string; Icon: typeof LayoutDashboard }> = {
  admin: { title: "Admin HQ", description: "Agency operations, clients, workers and finance", Icon: LayoutDashboard },
  client: { title: "Client portal", description: "Request staff, track attendance, approve hours", Icon: Building2 },
  worker: { title: "Worker portal", description: "Your shifts, check-in, hours and documents", Icon: HardHat },
};

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ choose?: string }> }) {
  const user = await requireUser("/portal");
  const memberships = await getMemberships();
  const { choose } = await searchParams;
  const landing = resolveLanding(memberships);
  if (landing && !choose) redirect(landing);
  const portals = availablePortals(memberships);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-8" />
        <span className="text-lg font-semibold">ShiftPilot</span>
      </div>
      <div className="w-full max-w-xl">
        {portals.length === 0 ? (
          <EmptyState
            title="Your account is not linked to an agency yet"
            description={`You are signed in as ${user.email}. Ask your agency to send you an invitation, then open the link in that email.`}
            action={
              <form action="/auth/signout" method="post">
                <button className="text-sm text-primary hover:underline">Sign out</button>
              </form>
            }
          />
        ) : (
          <>
            <h1 className="mb-4 text-center text-lg font-semibold">Where would you like to go?</h1>
            <ul className="grid gap-3">
              {portals.map((p) => {
                const { title, description, Icon } = META[p];
                return (
                  <li key={p}>
                    <Link
                      href={PORTAL_PATHS[p]}
                      className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-xs transition-colors hover:border-primary/50 hover:bg-primary-soft/30"
                    >
                      <span className="rounded-md bg-primary-soft p-2.5 text-primary-soft-foreground">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-medium">{title}</span>
                        <span className="block text-sm text-muted-foreground">{description}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
