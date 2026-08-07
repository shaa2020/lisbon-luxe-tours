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
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Overview</p>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">A quick look at what's happening on the site.</p>
      </div>

      {/* ===== Revenue KPI strip ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Today", value: revenue.data?.today, Icon: Euro },
          { label: "This week", value: revenue.data?.week, Icon: TrendingUp },
          { label: "This month", value: revenue.data?.month, Icon: TrendingUp },
          { label: "All time", value: revenue.data?.all, Icon: Euro },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {k.label}
              </p>
              <k.Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <p className="font-display text-2xl font-bold text-primary tabular-nums">
              {revenue.isLoading ? "…" : fmtEur(k.value)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Paid revenue</p>
          </div>
        ))}
      </div>

      {/* ===== Upcoming this week ===== */}
      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Upcoming this week</p>
            <p className="text-xs text-muted-foreground">Bookings with a travel date between today and Sunday.</p>
          </div>
          <Link
            to="/admin/bookings"
            className="text-xs font-semibold text-primary hover:underline"
          >
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
      </section>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group block rounded-xl border border-border bg-card p-5 hover:border-primary hover:shadow-[0_10px_30px_rgba(30,58,95,0.08)] transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <c.Icon className="w-5 h-5" />
              </div>
              <p className="font-display text-3xl font-bold text-primary tabular-nums">
                {c.count ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{c.label}</p>
              {c.badge && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
                  {c.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Shortcuts</p>
            <p className="text-xs text-muted-foreground">Configuration lives in Settings now.</p>
          </div>
          {[
            { to: "/admin/settings", label: "Settings", desc: "Brand, contact, homepage, booking rules, payments." },
            { to: "/admin/custom-builder", label: "Custom Builder", desc: "Prices and options for build-your-own tours." },
            { to: "/admin/faqs", label: "FAQs", desc: "Questions shown on the FAQ page." },
          ].map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="block rounded-lg border border-border bg-background p-4 hover:border-primary transition"
            >
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </Link>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}