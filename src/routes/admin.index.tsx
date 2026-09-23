import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Map, BookOpen, CalendarCheck, Mail, CreditCard, Star, Euro, Users, TrendingUp, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/admin/AdminShell";
import { DashboardToday } from "@/components/admin/DashboardToday";

import { useAdminPromotions, isPromotionLive } from "@/lib/promotions";
import { useAuth } from "@/lib/auth";
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
  const { can } = useAuth();
  const { data: allPromotions } = useAdminPromotions();
  const livePromotions = (allPromotions ?? []).filter((p) => isPromotionLive(p));
  const promoLive = livePromotions.length > 0;

  const fmtEur = (v: number | undefined) =>
    v == null ? "—" : `€${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const allCards = [
    { perm: "tours.manage" as const, to: "/admin/tours", label: "Tours", count: tours.data, desc: "Create, edit and publish tour pages.", Icon: Map, badge: null },
    { perm: "content.manage" as const, to: "/admin/blog", label: "Journal", count: posts.data, desc: "Write and publish stories.", Icon: BookOpen, badge: null },
    {
      perm: "reviews.manage" as const,
      to: "/admin/reviews",
      label: "Reviews",
      count: reviews.data,
      desc: "Approve, hide and feature guest reviews.",
      Icon: Star,
      badge: pendingReviews.data ? `${pendingReviews.data} pending` : null,
    },
    {
      perm: "bookings.view" as const,
      to: "/admin/bookings",
      label: "Bookings",
      count: bookings.data,
      desc: "Reply to booking requests on WhatsApp.",
      Icon: CalendarCheck,
      badge: badges.data?.bookings ? `${badges.data.bookings} new` : null,
    },
    { perm: "orders.view" as const, to: "/admin/orders", label: "Orders", count: orders.data, desc: "Card payments and revenue.", Icon: CreditCard, badge: null },
    {
      perm: "messages.view" as const,
      to: "/admin/messages",
      label: "Messages",
      count: messages.data,
      desc: "Contact form messages inbox.",
      Icon: Mail,
      badge: badges.data?.messages ? `${badges.data.messages} new` : null,
    },
  ].filter((c) => can(c.perm));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <AdminShell requires="dashboard.view">
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight truncate">
            {greeting}! 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your tours today.
          </p>
        </div>
        <div className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold">
          <CalendarCheck className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">{today}</span>
        </div>
      </div>

      {/* ===== Revenue KPI strip ===== */}
      {can("revenue.view") && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today", amount: revenue.data?.today, Icon: Euro, tile: "bg-emerald-50 border-emerald-200", icon: "bg-emerald-100 text-emerald-700", valueClass: "text-emerald-900" },
          { label: "This week", amount: revenue.data?.week, Icon: TrendingUp, tile: "bg-sky-50 border-sky-200", icon: "bg-sky-100 text-sky-700", valueClass: "text-sky-900" },
          { label: "This month", amount: revenue.data?.month, Icon: TrendingUp, tile: "bg-violet-50 border-violet-200", icon: "bg-violet-100 text-violet-700", valueClass: "text-violet-900" },
          { label: "All time", amount: revenue.data?.all, Icon: Euro, tile: "bg-amber-50 border-amber-200", icon: "bg-amber-100 text-amber-700", valueClass: "text-amber-900" },
        ].map((k) => (
          <AdminCard key={k.label} className={`p-4 flex items-center gap-3 min-w-0 ${k.tile}`}>
            <span className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center ${k.icon}`}>
              <k.Icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-muted-foreground truncate">{k.label}</p>
              <p className={`font-display text-xl sm:text-2xl font-bold tabular-nums truncate ${k.valueClass}`}>
                {revenue.isLoading ? "…" : fmtEur(k.amount)}
              </p>
            </div>
          </AdminCard>
        ))}
      </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] gap-6 items-start">
        <div className="min-w-0 space-y-6">
          {can("bookings.view") && <DashboardToday />}

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
          <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {allCards.map((c) => (
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
        <div className="min-w-0 space-y-6">
          {can("marketing.manage") && (
          <AdminCard className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Promotions</p>
            </div>
            {promoLive ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  {livePromotions.length} live on the site
                </span>
                <p className="text-sm text-foreground leading-snug">{livePromotions[0].headline}</p>
                {livePromotions[0].code && (
                  <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">{livePromotions[0].code}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No campaign running. Create a banner and choose where it appears on the site.
              </p>
            )}
            <Link
              to="/admin/promotions"
              className="inline-flex rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
            >
              {promoLive ? "Manage promotions" : "Create promotion"}
            </Link>
          </AdminCard>
          )}

          <AdminCard className="p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Shortcuts</p>
              <p className="text-xs text-muted-foreground">Jump straight to setup areas.</p>
            </div>
            {[
              { perm: "settings.manage" as const, to: "/admin/settings", label: "Settings", desc: "Brand, contact, booking rules, payments." },
              { perm: "tours.manage" as const, to: "/admin/custom-builder", label: "Custom builder", desc: "Prices for build-your-own tours." },
              { perm: "discounts.manage" as const, to: "/admin/discounts", label: "Discounts", desc: "Promo codes and campaigns." },
              { perm: "faqs.manage" as const, to: "/admin/faqs", label: "FAQs", desc: "Questions shown on the FAQ page." },
            ].filter((x) => can(x.perm)).map((s) => (
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
