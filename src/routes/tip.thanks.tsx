import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2 } from "lucide-react";
import { confirmTip } from "@/lib/tips.functions";

export const Route = createFileRoute("/tip/thanks")({
  component: TipThanks,
  validateSearch: (search: Record<string, unknown>) => ({
    session_id: typeof search["session_id"] === "string" ? (search["session_id"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Thank you · Tuk Tuk 24 Lisbon" },
      { name: "description", content: "Thank you for tipping your Tuk Tuk 24 guide in Lisbon." },
      { property: "og:title", content: "Thank you · Tuk Tuk 24 Lisbon" },
      { property: "og:description", content: "Thank you for tipping your Tuk Tuk 24 guide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function TipThanks() {
  const { session_id } = Route.useSearch();
  const confirm = useServerFn(confirmTip);
  const { data, isLoading } = useQuery({
    queryKey: ["tip-confirm", session_id],
    queryFn: () => confirm({ data: { session_id } }),
    enabled: !!session_id,
    retry: 2,
  });

  return (
    <div className="min-h-screen bg-cloud/40 px-4 py-16">
      <div className="max-w-md mx-auto bg-background border border-border rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold grid place-items-center mx-auto mb-5">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-gold animate-spin" strokeWidth={1.75} />
          ) : (
            <Heart className="w-6 h-6 text-gold" strokeWidth={1.75} />
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-body">Checking your payment…</p>
        ) : data?.paid ? (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Thank you!</h1>
            <p className="text-sm text-body">
              Your tip of €{((data.amountCents || 0) / 100).toFixed(2)} goes straight to your guide. It means a lot.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Payment not completed</h1>
            <p className="text-sm text-body">
              Nothing has been charged. You can try again from your tour page, or message us on WhatsApp.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
