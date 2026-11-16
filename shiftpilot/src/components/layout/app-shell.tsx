import Link from "next/link";
import { BrandMark } from "./brand";
import { SidebarNav, MobileNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import type { NavSection } from "./nav-config";

export interface AppShellProps {
  portalLabel: string;
  contextLabel?: string;
  nav: NavSection[];
  user: { email: string; fullName: string | null };
  canSwitchPortal: boolean;
  children: React.ReactNode;
}

/** Shared responsive shell for all authenticated portals. */
export function AppShell({ portalLabel, contextLabel, nav, user, canSwitchPortal, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href="/portal" className="flex items-center gap-2 text-white">
            <BrandMark />
            <span className="font-semibold tracking-tight">ShiftPilot</span>
          </Link>
          <span className="ml-auto rounded bg-sidebar-active px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground">
            {portalLabel}
          </span>
        </div>
        {contextLabel && <p className="truncate px-4 pb-2 text-xs text-sidebar-foreground/80">{contextLabel}</p>}
        <SidebarNav sections={nav} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:px-6">
          <MobileNav sections={nav} portalLabel={portalLabel} contextLabel={contextLabel} />
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground lg:hidden">{contextLabel ?? portalLabel}</div>
          <div className="ml-auto">
            <UserMenu user={user} canSwitchPortal={canSwitchPortal} />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
