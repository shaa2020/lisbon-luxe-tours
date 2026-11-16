"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell, Briefcase, CalendarDays, Clock, FileText, Home, LayoutDashboard, Menu, Receipt, Settings, Shield, Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";
import type { NavIcon, NavSection } from "./nav-config";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, settings: Settings, users: Users, shield: Shield, briefcase: Briefcase,
  calendar: CalendarDays, clock: Clock, receipt: Receipt, home: Home, file: FileText, bell: Bell,
};

function isActive(pathname: string, href: string) {
  const portalRoot = href.split("/").length === 2;
  return portalRoot ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // The most specific matching item wins (e.g. /admin/settings/team over /admin/settings).
  const all = sections.flatMap((s) => s.items);
  const activeHref = all
    .filter((i) => isActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
      {sections.map((section, idx) => (
        <div key={section.label ?? idx}>
          {section.label && (
            <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">{section.label}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-active/70 hover:text-sidebar-active-foreground",
                      active && "bg-sidebar-active font-medium text-sidebar-active-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ sections, portalLabel, contextLabel }: { sections: NavSection[]; portalLabel: string; contextLabel?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="rounded-md p-2 text-foreground hover:bg-surface-muted lg:hidden" aria-label="Open navigation">
        <Menu className="size-5" />
      </DialogTrigger>
      <SheetContent title="Navigation" className="bg-sidebar">
        <div className="flex h-14 items-center gap-2 px-4 text-white">
          <BrandMark />
          <span className="font-semibold">ShiftPilot</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-sidebar-foreground">{portalLabel}</span>
        </div>
        {contextLabel && <p className="truncate px-4 pb-2 text-xs text-sidebar-foreground/80">{contextLabel}</p>}
        <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Dialog>
  );
}
