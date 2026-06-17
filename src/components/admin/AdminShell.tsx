import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteBrand } from "@/lib/brand";
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
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY: NavItem[] = [
  { to: "/admin", label: "Home", icon: LayoutDashboard },
  { to: "/admin/tours", label: "Tours", icon: Map },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/orders", label: "Orders", icon: CreditCard },
];

const MORE: NavItem[] = [
  { to: "/admin/custom-builder", label: "Custom Builder", icon: Sparkles },
  { to: "/admin/blog", label: "Journal", icon: BookOpen },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
];

const ALL = [...PRIMARY, ...MORE];

function isActiveRoute(to: string, pathname: string) {
  if (to === "/admin") return pathname === "/admin";
  return pathname === to || pathname.startsWith(to + "/");
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { brandName } = useSiteBrand();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ to: "/admin/login", search: { redirect: location.pathname } });
    }
  }, [loading, user, isAdmin, navigate, location.pathname]);

  // close sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  const current = ALL.find((n) => isActiveRoute(n.to, location.pathname));
  const currentLabel = current?.label ?? "Admin";
  const onHome = location.pathname === "/admin";
  const moreActive = MORE.some((n) => isActiveRoute(n.to, location.pathname));

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      {/* ============= Desktop header ============= */}
      <header className="hidden md:block border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/admin" className="font-display font-bold text-lg truncate">
              {brandName} Admin
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              {ALL.map((n) => {
                const active = isActiveRoute(n.to, location.pathname);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground truncate max-w-[180px]">{user.email}</span>
            <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Site
            </Link>
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-foreground inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
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
            <Link
              to="/admin"
              className="w-10 h-10 -ml-1 grid place-items-center rounded-full"
              aria-label="Home"
            >
              <span className="font-display font-bold text-base">
                {brandName.charAt(0)}
              </span>
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-none">
              {brandName} Admin
            </p>
            <h1 className="font-display font-bold text-lg leading-tight truncate">
              {currentLabel}
            </h1>
          </div>
          <Link
            to="/"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-accent"
            aria-label="View site"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </header>

      {/* ============= Main ============= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 pb-[calc(env(safe-area-inset-bottom)+88px)] md:pb-12">
        {children}
      </main>

      {/* ============= Mobile bottom tab bar ============= */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {PRIMARY.map((n) => {
            const active = isActiveRoute(n.to, location.pathname);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.4]" : ""}`} />
                <span className="text-[10px] font-medium tracking-wide">{n.label}</span>
                {active && <span className="absolute top-0 h-0.5 w-10 bg-primary rounded-b-full" />}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${
              moreActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">More</span>
          </button>
        </div>
      </nav>

      {/* ============= More sheet ============= */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
          />
          <div
            className="absolute bottom-0 inset-x-0 bg-card rounded-t-3xl border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <h2 className="font-display font-bold text-lg mt-2">More</h2>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 grid place-items-center rounded-full hover:bg-accent"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-3 pt-2 pb-3 grid gap-1">
              {MORE.map((n) => {
                const active = isActiveRoute(n.to, location.pathname);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className={`w-10 h-10 grid place-items-center rounded-xl ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="font-medium">{n.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="border-t border-border mt-1 px-5 py-4">
              <p className="text-xs text-muted-foreground truncate mb-3">{user.email}</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View site
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
