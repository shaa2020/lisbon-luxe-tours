import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Trash2, Star, Check, EyeOff, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { StarRating } from "@/components/site/StarRating";
import {
  useImportReview,
  useAllReviewsAdmin,
  useDeleteReview,
  useModerateReview,
  type Review,
} from "@/lib/reviews";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

const STATUSES = ["all", "pending", "approved", "hidden"] as const;
type StatusFilter = (typeof STATUSES)[number];

function statusBadge(s: Review["status"]) {
  const map: Record<Review["status"], string> = {
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    hidden: "bg-muted/60 text-muted-foreground border-border",
  };
  return map[s];
}

const fld =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";

function ReviewImporter() {
  const importReview = useImportReview();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    author_name: "",
    rating: 5,
    title: "",
    body: "",
    travel_date: "",
    tour_slug: "",
    source: "google",
    source_url: "",
    featured: true,
  });

  const submit = async () => {
    try {
      await importReview.mutateAsync({
        author_name: form.author_name,
        rating: form.rating,
        title: form.title,
        body: form.body,
        travel_date: form.travel_date || null,
        tour_slug: form.tour_slug || null,
        source: form.source,
        source_url: form.source_url || null,
        featured: form.featured,
      });
      toast.success("Review imported and published");
      setForm({ ...form, author_name: "", title: "", body: "", source_url: "", travel_date: "" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-semibold text-primary underline"
      >
        {open ? "Hide importer" : "Import a Google / TripAdvisor review"}
      </button>
      {open && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className={fld}
            placeholder="Reviewer name"
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Rating</span>
            <StarRating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          </div>
          <input
            className={fld}
            placeholder="Headline (optional)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className={fld}
            placeholder="Tour slug (optional, e.g. alfama-classic)"
            value={form.tour_slug}
            onChange={(e) => setForm({ ...form, tour_slug: e.target.value })}
          />
          <textarea
            className={`${fld} md:col-span-2`}
            rows={4}
            placeholder="Review text (copy it exactly as written)"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <select
            className={fld}
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          >
            <option value="google">Google</option>
            <option value="tripadvisor">TripAdvisor</option>
            <option value="getyourguide">GetYourGuide</option>
            <option value="direct">Direct / email</option>
          </select>
          <input
            className={fld}
            placeholder="Link to the original review (optional)"
            value={form.source_url}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
          />
          <input
            className={fld}
            type="date"
            value={form.travel_date}
            onChange={(e) => setForm({ ...form, travel_date: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            Feature on homepage
          </label>
          <div className="md:col-span-2">
            <button
              onClick={submit}
              disabled={importReview.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {importReview.isPending ? "Importing…" : "Import & publish"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Only copy real reviews you actually received. Imported reviews show their source on the site.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminReviewsPage() {
  const { data: reviews = [], isLoading } = useAllReviewsAdmin();
  const moderate = useModerateReview();
  const del = useDeleteReview();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const counts = useMemo(() => {
    const base = { all: reviews.length, pending: 0, approved: 0, hidden: 0 };
    for (const r of reviews) base[r.status] += 1;
    return base;
  }, [reviews]);

  const visible = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

  const setStatus = (id: string, status: Review["status"]) => {
    moderate.mutate(
      { id, patch: { status } },
      {
        onSuccess: () => toast.success(`Marked as ${status}`),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const toggleFeatured = (r: Review) => {
    moderate.mutate(
      { id: r.id, patch: { featured: !r.featured } },
      {
        onSuccess: () => toast.success(r.featured ? "Removed from featured" : "Marked as featured"),
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const remove = (id: string) => {
    if (!confirm("Delete this review? This cannot be undone.")) return;
    del.mutate(id, {
      onSuccess: () => toast.success("Deleted"),
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
          Moderation
        </p>
        <h1 className="text-3xl font-display font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Approve, hide, or feature customer reviews. Pending reviews are invisible to the public.
        </p>
      </div>

      <ReviewImporter />

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)}{" "}
            <span className="opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No reviews here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl">{r.author_name}</h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(r.status)}`}
                    >
                      {r.status}
                    </span>
                    {r.featured && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-gold/10 text-amber-700 border-amber-500/30">
                        Featured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.tour_slug ? <>Tour: <span className="text-foreground">/{r.tour_slug}</span> · </> : null}
                    {format(new Date(r.created_at), "d MMM yyyy, HH:mm")}
                    {r.author_email ? <> · {r.author_email}</> : null}
                  </p>
                </div>
                <StarRating value={r.rating} readOnly />
              </div>

              {r.title && (
                <p className="text-sm font-semibold text-foreground mb-2">{r.title}</p>
              )}
              <div className="rounded-md bg-muted/40 border border-border p-3 text-sm text-foreground mb-4 whitespace-pre-wrap">
                {r.body}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {r.status !== "approved" && (
                  <button
                    onClick={() => setStatus(r.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                )}
                {r.status !== "hidden" && (
                  <button
                    onClick={() => setStatus(r.id, "hidden")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border text-foreground px-3 py-2 text-xs font-medium hover:bg-accent"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </button>
                )}
                {r.status !== "pending" && (
                  <button
                    onClick={() => setStatus(r.id, "pending")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border text-foreground px-3 py-2 text-xs font-medium hover:bg-accent"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Move to pending
                  </button>
                )}
                <button
                  onClick={() => toggleFeatured(r)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium border transition ${
                    r.featured
                      ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
                      : "border-border text-foreground hover:bg-accent"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${r.featured ? "fill-amber-500" : ""}`} />
                  {r.featured ? "Featured" : "Feature"}
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
