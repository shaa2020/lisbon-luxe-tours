import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function useCount(table: "tours" | "blog_posts" | "bookings" | "contact_messages") {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
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

  const cards: { to: string; label: string; count: number | undefined; desc: string }[] = [
    { to: "/admin/tours", label: "Tours", count: tours.data, desc: "Create, edit and publish tour pages." },
    { to: "/admin/blog", label: "Journal", count: posts.data, desc: "Write and publish stories." },
    { to: "/admin", label: "Bookings", count: bookings.data, desc: "Booking requests inbox (coming soon)." },
    { to: "/admin", label: "Messages", count: messages.data, desc: "Contact messages inbox (coming soon)." },
  ];

  return (
    <AdminShell>
      <h1 className="text-2xl font-display font-bold mb-6">Dashboard</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="block rounded-xl border border-border bg-card p-5 hover:border-primary transition"
          >
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">{c.label}</p>
              <p className="font-display text-3xl font-bold text-primary">
                {c.count ?? "—"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
