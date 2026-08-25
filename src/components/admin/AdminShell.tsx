import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteBrand } from "@/lib/brand";
import { useAdminBadges } from "@/lib/admin-stats";
import {
  LayoutDashboard,
  Map,
  CalendarCheck,
  CreditCard,
  MoreHorizontal,
  BookOpen,
  Star,
  MessageSquare,
  LogOut,
  ExternalLink,
  ChevronLeft,
  X,
  Sparkles,
  HelpCircle,
  Settings,
  Compass,
  Gauge,
  Megaphone,
  Tag,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc?: string;
};

type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, desc: "Revenue and activity" }],
  },
  {
    title: "Sell",
    items: [
      { to: "/admin/tours", label: "Tours", icon: Map, desc: "Catalogue and pricing" },
      { to: "/admin/custom-builder", label: "Custom builder", icon: Sparkles, desc: "Build-your-own options" },
      { to: "/admin/discounts", label: "Discounts", icon: Tag, desc: "Promo codes" },
    ],
  },
  {
    title: "Operate",
    items: [
      { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck, desc: "Requests and schedule" },
      { to: "/admin/orders", label: "Orders", icon: CreditCard, desc: "Payments and refunds" },
      { to: "/admin/ops", label: "Operations", icon: Gauge, desc: "Jobs, drivers, vehicles" },
      { to: "/admin/messages", label: "Messages", icon: MessageSquare, desc: "Contact inbox" },
    ],
  },
  {
    title: "Content",
    items: [
      { to: "/admin/blog", label: "Journal", icon: BookOpen, desc: "Stories and news" },
      { to: "/admin/guide", label: "Travel guide", icon: Compass, desc: "SEO guide hub" },
      { to: "/admin/reviews", label: "Reviews", icon: Star, desc: "Approve guest reviews" },
      { to: "/admin/faqs", label: "FAQs", icon: HelpCircle, desc: "Questions and answers" },
    ],
  },
  {
    title: "Configure",
    items: [
      { to: "/admin/settings", label: "Settings", icon: Settings, desc: "Brand, booking, payments" },
    ],
  },
];

const ALL: NavItem[] = GROUPS.flatMap((g) => g.items);

/** Bottom tab bar targets on mobile. */
const PRIMARY: NavItem[] = [
  { to: "/admin", label: "Home", icon: LayoutDashboard },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/tours", label: "Tours", icon: Map },
  { to: "/admin/orders", label: "Orders", icon: CreditCard },
];

function isActiveRoute(to: string, pathname: string) {
  if (to === "/admin") return pathname === "/admin";
  return pathname === to || pathname.startsWith(to + "/");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { brandName, promoBanner } = useSiteBrand();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const { data: badges } = useAdminBadges();
  const [moreOpen, setMoreOpen] = useState(false);

  const badgeFor = (to: string): number => {
    if (to === "/admin/bookings") return badges?.bookings ?? 0;
    if (to === "/admin/messages") return badges?.messages ?? 0;
    if (to === "/admin/reviews") return badges?.reviews ?? 0;
    return 0;
  };

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ to: "/admin/login", search: { redirect: location.pathname } });
    }
  }, [loading, user, isAdmin, navigate, location.pathname]);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 text-foreground">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  const current = ALL.find((n) => isActiveRoute(n.to, location.pathname));
  const currentLabel = current?.label ?? "Admin";
  const onHome = location.pathname === "/admin";
  const moreItems = ALL.filter((n) => !PRIMARY.some((p) => p.to === n.to));
  const moreActive = moreItems.some((n) => isActiveRoute(n.to, location.pathname));
  const moreBadge = (badges?.messages ?? 0) + (badges?.reviews ?? 0);

  const Badge = ({ n, small = false }: { n: number; small?: boolean }) =>
    n > 0 ? (
      <span
        className={`inline-flex items-center justify-center rounded-full font-bold bg-destructive text-destructive-foreground ${
          small ? "min-w-[16px] h-[16px] px-1 text-[9px]" : "min-w-[20px] h-5 px-1.5 text-[10px]"
        }`}
      >
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  return (
    <div className="min-h-[100dvh] bg-muted/40 text-foreground md:flex">
      {/* ============= Desktop sidebar ============= */}
      <aside className="hidden md:flex w-[248px] shrink-0 flex-col border-r border-border bg-card sticky top-0 h-[100dvh]">
        <div className="px-5 py-5 border-b border-border">
          <Link to="/admin" className="block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Control panel
            </p>
            <p className="font-display text-lg font-bold leading-tight truncate">{brandName}</p>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((n) => {
                  const active = isActiveRoute(n.to, location.pathname);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                      )}
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                      <span className="ml-auto">
                        <Badge n={badgeFor(n.to)} small />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          {promoBanner.enabled && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                <Megaphone className="w-3 h-3" /> Promo live
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{promoBanner.headline}</p>
            </div>
          )}
          <p className="px-1 text-[11px] text-muted-foreground truncate">{user.email}</p>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Site
            </Link>
            <button
              onClick={() => signOut()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] font-medium hover:bg-accent"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ============= Desktop top bar ============= */}
        <header className="hidden md:flex sticky top-0 z-30 h-14 items-center gap-3 border-b border-border bg-card/85 backdrop-blur px-6">
          <h1 className="font-display text-base font-bold truncate">{currentLabel}</h1>
          <span className="text-muted-foreground/40">/</span>
          <p className="text-xs text-muted-foreground truncate">{brandName} admin</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/admin/messages"
              className="relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MessageSquare className="w-4 h-4" />
              <Badge n={badges?.messages ?? 0} small />
            </Link>
            <Link
              to="/admin/settings"
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* ============= Mobile app bar ============= */}
        <header
          className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="h-14 px-3 flex items-center gap-2">
            {!onHome ? (
              <button
                onClick={() => navigate({ to: "/admin" })}
                className="w-10 h-10 -ml-1 grid place-items-center rounded-full hover:bg-accent active:scale-95 transition"
                aria-label="Back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <Link to="/admin" className="w-10 h-10 -ml-1 grid place-items-center rounded-full" aria-label="Home">
                <span className="font-display font-bold text-base">{brandName.charAt(0)}</span>
              </Link>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
                {brandName} Admin
              </p>
              <h1 className="font-display font-bold text-lg leading-tight truncate">{currentLabel}</h1>
            </div>
            <Link to="/" className="w-10 h-10 grid place-items-center rounded-full hover:bg-accent" aria-label="View site">
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </header>

        {/* ============= Main ============= */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-14">
          {children}
        </main>
      </div>

      {/* ============= Mobile bottom tab bar ============= */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {PRIMARY.map((n) => {
            const active = isActiveRoute(n.to, location.pathname);
            const Icon = n.icon;
            const b = badgeFor(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? "stroke-[2.4]" : ""}`} />
                  {b > 0 && (
                    <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground">
                      {b > 9 ? "9+" : b}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide">{n.label}</span>
                {active && <span className="absolute top-0 h-0.5 w-10 bg-primary rounded-b-full" />}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${
              moreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="w-5 h-5" />
              {moreBadge > 0 && (
                <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-destructive text-destructive-foreground">
                  {moreBadge > 9 ? "9+" : moreBadge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {/* ============= More sheet ============= */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-2xl bg-card border-t border-border max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="sticky top-0 bg-card px-4 pt-3 pb-2 flex items-center justify-between border-b border-border">
              <p className="font-display font-bold text-base">All sections</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((n) => {
                      const Icon = n.icon;
                      const active = isActiveRoute(n.to, location.pathname);
                      const b = badgeFor(n.to);
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          className={`rounded-xl border p-3 active:scale-[0.98] transition ${
                            active ? "border-primary bg-primary/5" : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <Badge n={b} small />
                          </div>
                          <p className="text-sm font-semibold leading-tight">{n.label}</p>
                          {n.desc && <p className="text-[11px] text-muted-foreground leading-snug">{n.desc}</p>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button
                onClick={() => signOut()}
                className="w-full rounded-xl border border-border py-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ Shared page primitives ============================ */

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-1.5">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(30,58,95,0.04)] ${className}`}>
      {children}
    </div>
  );
}
