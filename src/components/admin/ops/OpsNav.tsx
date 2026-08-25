import { Link, useRouterState } from "@tanstack/react-router";
import {
  Gauge,
  Sun,
  CalendarDays,
  Ticket,
  Users,
  Map,
  Car,
  UserRound,
  Handshake,
  CreditCard,
  Inbox,
  Settings,
} from "lucide-react";

const ITEMS = [
  { to: "/admin/ops", label: "Dispatch", icon: Gauge, exact: true },
  { to: "/admin/ops/today", label: "Day sheet", icon: Sun },
  { to: "/admin/ops/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/admin/ops/jobs", label: "Jobs", icon: Ticket },
  { to: "/admin/ops/customers", label: "Customers", icon: Users },
  { to: "/admin/ops/tours", label: "Tour catalogue", icon: Map },
  { to: "/admin/ops/vehicles", label: "Vehicles", icon: Car },
  { to: "/admin/ops/team", label: "Guides & Drivers", icon: UserRound },
  { to: "/admin/ops/partners", label: "Partners", icon: Handshake },
  { to: "/admin/ops/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/ops/requests", label: "Guest requests", icon: Inbox },
  { to: "/admin/ops/settings", label: "Ops settings", icon: Settings },
] as const;

export function OpsNav() {
  const { location } = useRouterState();
  return (
    <nav className="-mx-4 sm:mx-0 mb-6 overflow-x-auto">
      <div className="flex gap-1.5 px-4 sm:px-0 min-w-max">
        {ITEMS.map(({ to, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact
            ? location.pathname === to
            : location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap inline-flex items-center gap-1.5 border transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function OpsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <OpsNav />
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Operations
          </p>
          <h1 className="font-display font-bold text-2xl leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
