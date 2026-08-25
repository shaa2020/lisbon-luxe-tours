import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Map, BookOpen, CalendarCheck, Mail, CreditCard, Star, Euro, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRevenueStats, useUpcomingThisWeek, useAdminBadges } from "@/lib/admin-stats";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function useCount(
  table: "tours" | "blog_posts" | "bookings" | "contact_messages" | "orders" | "reviews",
) {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table as never)
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function usePendingReviewCount() {
  return useQuery({
    queryKey: ["admin-count", "reviews", "pending"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reviews" as never)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const tours = useCount("tours");
  const posts = useCount("blog_posts");
  const bookings = useCount("bookings");
  const messages = useCount("contact_messages");
  const orders = useCount("orders");
  const reviews = useCount("reviews");
  const pendingReviews = usePendingReviewCount();

  const revenue = useRevenueStats();
  const upcoming = useUpcomingThisWeek();
  const badges = useAdminBadges();

  const fmtEur = (v: number | undefined) =>
    v == null ? "—" : `€${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const cards = [
    { to: "/admin/tours", label: "Tours", count: tours.data, desc: "Create, edit and publish tour pages.", Icon: Map, badge: null },
    { to: "/admin/blog", label: "Journal", count: posts.data, desc: "Write and publish stories.", Icon: BookOpen, badge: null },
    {
      to: "/admin/reviews",
      label: "Reviews",
      count: reviews.data,
      desc: "Approve, hide and feature guest reviews.",
      Icon: Star,
      badge: pendingReviews.data ? `${pendingReviews.data} pending` : null,
    },
    {
      to: "/admin/bookings",
      label: "Bookings",
      count: bookings.data,
      desc: "Reply to booking requests on WhatsApp.",
      Icon: CalendarCheck,
      badge: badges.data?.bookings ? `${badges.data.bookings} new` : null,
    },
    { to: "/admin/orders", label: "Orders", count: orders.data, desc: "Card payments and revenue.", Icon: CreditCard, badge: null },
    {
      to: "/admin/messages",
      label: "Messages",
      count: messages.data,
      desc: "Contact form messages inbox.",
      Icon: Mail,
      badge: badges.data?.messages ? `${badges.data.messages} new` : null,
    },
  ] as const;

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Revenue, upcoming rides and everything that needs your attention."
        actions={
          <Link
            to="/admin/settings"
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-accent"
          >
            Settings
          </Link>
        }
      />

      {/* ===== Revenue KPI strip ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today", value: revenue.data?.today, Icon: Euro },
          { label: "This week", value: revenue.data?.week, Icon: TrendingUp },
          { label: "This month", value: revenue.data?.month, Icon: TrendingUp },
          { label: "All time", value: revenue.data?.all, Icon: Euro },
        ].map((k) => (
          <AdminCard key={k.label} className="p-4 overflow-hidden relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {k.label}
              </p>
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <k.Icon className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="font-display text-2xl font-bold tabular-nums">
              {revenue.isLoading ? "…" : fmtEur(k.value)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Paid revenue</p>
          </AdminCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-6 items-start">
        <div className="space-y-6">
          {/* ===== Upcoming this week ===== */}
          <AdminCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Upcoming this week</p>
                <p className="text-xs text-muted-foreground">Travel dates between today and Sunday.</p>
              </div>
              <Link to="/admin/bookings" className="text-xs font-semibold text-primary hover:underline">
                View all →
              </Link>
            </div>
            {upcoming.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (upcoming.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled. Enjoy the week!</p>
            ) : (
              <ul className="divide-y divide-border">
                {(upcoming.data ?? []).map((u: any) => (
                  <li key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.customer_name}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {u.tour_title || "Custom tour"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
                        {new Date(u.travel_date).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" /> {u.guests}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                      {u.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          {/* ===== Section cards ===== */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((c) => (
              <Link
                key={c.label}
                to={c.to}
                className="group block rounded-xl border border-border bg-card p-4 hover:border-primary hover:shadow-[0_10px_30px_rgba(30,58,95,0.08)] transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <c.Icon className="w-4.5 h-4.5" />
                  </div>
                  <p className="font-display text-2xl font-bold tabular-nums">{c.count ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{c.label}</p>
                  {c.badge && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                      {c.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== Right rail ===== */}
        <div className="space-y-6">
          <AdminCard className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Promotional banner</p>
            </div>
            {promoLive ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Live on the site
                </span>
                <p className="text-sm text-foreground leading-snug">{promoBanner.headline}</p>
                {promoBanner.code && (
                  <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{promoBanner.code}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No campaign running. Add a headline, promo code and button to show a banner across the site.
              </p>
            )}
            <Link
              to="/admin/settings"
              className="inline-flex rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              {promoLive ? "Edit banner" : "Create banner"}
            </Link>
          </AdminCard>

          <AdminCard className="p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Shortcuts</p>
              <p className="text-xs text-muted-foreground">Jump straight to setup areas.</p>
            </div>
            {[
              { to: "/admin/settings", label: "Settings", desc: "Brand, contact, booking rules, payments." },
              { to: "/admin/custom-builder", label: "Custom builder", desc: "Prices for build-your-own tours." },
              { to: "/admin/discounts", label: "Discounts", desc: "Promo codes and campaigns." },
              { to: "/admin/faqs", label: "FAQs", desc: "Questions shown on the FAQ page." },
            ].map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="block rounded-lg border border-border bg-background p-3.5 hover:border-primary transition"
              >
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}
