import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteBrand } from "@/lib/brand";

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { brandName } = useSiteBrand();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate({ to: "/admin/login", search: { redirect: location.pathname } });
    }
  }, [loading, user, isAdmin, navigate, location.pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  const nav: { to: string; label: string }[] = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/tours", label: "Tours" },
    { to: "/admin/blog", label: "Journal" },
    { to: "/admin/reviews", label: "Reviews" },
    { to: "/admin/bookings", label: "Bookings" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/messages", label: "Messages" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="font-display font-bold text-lg">
{brandName} Admin
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {nav.map((n) => {
                const active =
                  n.to === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-1.5 rounded-md transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground hidden sm:inline">{user.email}</span>
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground"
            >
              View site
            </Link>
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="sm:hidden border-t border-border px-4 py-2 flex gap-1 overflow-x-auto text-sm">
          {nav.map((n) => {
            const active =
              n.to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 px-3 py-1.5 rounded-md ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
