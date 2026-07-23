import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { confirmCheckout } from "@/lib/checkout.functions";

export const Route = createFileRoute("/booking/success")({
  validateSearch: z.object({ session_id: z.string().optional() }),
  component: SuccessPage,
  head: () => ({
    meta: [
      { title: "Booking confirmed · Tuk Tuk 24" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <p className="text-sm text-muted-foreground">Could not confirm your payment. Please contact us.</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const [state, setState] = useState<{
    loading: boolean;
    paid: boolean;
    tour?: string | null;
    amount?: number;
    name?: string | null;
  }>({ loading: true, paid: false });

  useEffect(() => {
    if (!session_id) {
      setState({ loading: false, paid: false });
      return;
    }
    confirmCheckout({ data: { session_id } })
      .then((r) =>
        setState({
          loading: false,
          paid: r.paid,
          tour: r.tour_title,
          amount: r.amount_total,
          name: r.customer_name,
        }),
      )
      .catch(() => setState({ loading: false, paid: false }));
  }, [session_id]);

  return (
    <div className="min-h-screen bg-cloud/40 grid place-items-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl p-10 text-center shadow-sm">
        {state.loading ? (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-gold animate-spin mb-4" />
            <p className="text-body">Confirming your payment…</p>
          </>
        ) : state.paid ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold grid place-items-center mx-auto mb-6">
              <Check className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-display text-3xl text-ink mb-2">Payment received</h1>
            <p className="text-body text-sm mb-6">
              {state.name ? `Thanks ${state.name.split(" ")[0]}! ` : "Thank you! "}
              We've confirmed your booking{state.tour ? ` for ${state.tour}` : ""}.
              You'll receive details on WhatsApp shortly.
            </p>
            {state.amount ? (
              <p className="font-display text-3xl text-gold mb-8">
                €{(state.amount / 100).toFixed(2)}
              </p>
            ) : null}
            <Link
              to="/"
              className="inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-gold transition"
            >
              Back to home
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Payment not confirmed</h1>
            <p className="text-body text-sm mb-6">
              We couldn't confirm your payment yet. If you were charged, please contact us — we'll sort it out.
            </p>
            <Link
              to="/"
              className="inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
