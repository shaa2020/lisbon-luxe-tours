import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/booking/cancelled")({
  component: CancelledPage,
  head: () => ({
    meta: [
      { title: "Booking cancelled · Tuk Tuk 24" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => <div className="p-8">Error</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function CancelledPage() {
  return (
    <div className="min-h-screen bg-cloud/40 grid place-items-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl p-10 text-center shadow-sm">
        <h1 className="font-display text-3xl text-ink mb-2">Booking cancelled</h1>
        <p className="text-body text-sm mb-6">
          No payment was taken. Your seat isn't reserved yet — try again whenever you're ready.
        </p>
        <Link
          to="/"
          className="inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-gold transition"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
