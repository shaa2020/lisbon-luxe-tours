import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Lock, Users } from "lucide-react";
import { createBalanceCheckout, getBookingBalance } from "@/lib/balance-pay.functions";
import { PaypalWallet } from "@/components/site/PaypalWallet";


export const Route = createFileRoute("/booking/pay/$id")({
  component: PayBalancePage,
  head: () => ({
    meta: [
      { title: "Pay your balance · Tuk Tuk 24 Lisbon" },
      {
        name: "description",
        content: "Securely pay the outstanding balance for your private tuk-tuk tour in Lisbon.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Pay your balance · Tuk Tuk 24 Lisbon" },
      {
        property: "og:description",
        content: "Securely pay the outstanding balance for your private tuk-tuk tour in Lisbon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function PayBalancePage() {
  const { id } = Route.useParams();
  const fetchBalance = useServerFn(getBookingBalance);
  const startCheckout = useServerFn(createBalanceCheckout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking-balance", id],
    queryFn: () => fetchBalance({ data: { id } }),
    retry: false,
  });

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await startCheckout({ data: { id } });
      if (res.url) {
        window.location.href = res.url;
        return;
      }
      setError("Could not start the payment. Please reply to your booking email and we'll help.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /** Creates the provider order for the on-site wallet buttons. */
  const startWalletOrder = async (): Promise<string | null> => {
    setError(null);
    try {
      const res = await startCheckout({ data: { id } });
      return res.sessionId ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      return null;
    }
  };

  const finishWalletOrder = (orderId: string) => {
    window.location.assign(`/booking/success?session_id=${encodeURIComponent(orderId)}`);
  };


  if (isLoading) {
    return (
      <main className="min-h-[70vh] grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="min-h-[70vh] grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-foreground">Payment link not found</h1>
          <p className="mt-2 text-muted-foreground">
            This link is no longer valid. Reply to your booking email and we'll send a new one.
          </p>
        </div>
      </main>
    );
  }

  const dateLabel = data.travelDate
    ? new Date(data.travelDate).toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <main className="min-h-[80vh] bg-muted/40 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="rounded-t-2xl bg-[#1e3a5f] px-6 py-5 text-white">
          <p className="text-lg font-bold">Tuk Tuk 24</p>
          <p className="text-[11px] tracking-widest text-sky-200 mt-0.5">
            PRIVATE TUK-TUK TOURS · LISBON
          </p>
        </div>

        <div className="rounded-b-2xl border border-t-0 border-border bg-card px-6 py-7 shadow-sm">
          {data.dueCents <= 0 || data.paymentStatus === "paid" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h1 className="mt-3 font-display text-2xl text-foreground">
                You're all paid, {data.customerFirstName}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                There's nothing left to pay for this booking. See you in Lisbon!
              </p>
            </div>
          ) : data.cancelled ? (
            <div className="text-center py-4">
              <h1 className="font-display text-2xl text-foreground">Booking cancelled</h1>
              <p className="mt-2 text-muted-foreground text-sm">
                This booking has been cancelled, so no payment is due. If this looks wrong, reply to
                your booking email.
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl text-foreground">
                Complete your payment, {data.customerFirstName}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Your spot is held — pay the remaining balance to lock everything in.
              </p>

              <div className="mt-6 rounded-xl border border-border bg-muted/50 divide-y divide-border">
                {data.tourTitle && (
                  <div className="px-4 py-3">
                    <p className="text-[11px] tracking-widest text-muted-foreground">TOUR</p>
                    <p className="text-sm font-semibold text-foreground">{data.tourTitle}</p>
                  </div>
                )}
                <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-2">
                  {dateLabel && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                      {dateLabel}
                      {data.travelTime ? ` · ${data.travelTime}` : ""}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {data.guests} guest{data.guests === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Booking total</span>
                    <span>{money(data.totalCents)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Already paid</span>
                    <span>−{money(data.paidCents)}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-border font-bold text-foreground text-base">
                    <span>{data.isDeposit ? "Deposit due now" : "Due now"}</span>
                    <span>{money(data.requestCents)}</span>
                  </div>
                  {data.isDeposit && (
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>Remaining balance (pay later)</span>
                      <span>{money(data.dueCents - data.requestCents)}</span>
                    </div>
                  )}
                </div>
              </div>

              {data.paymentsAvailable ? (
                <>
                  <div className="mt-6">
                    <PaypalWallet
                      amount={data.dueCents / 100}
                      label={data.tourTitle || "Tuk Tuk 24 tour"}
                      disabled={busy}
                      createOrder={startWalletOrder}
                      onPaid={finishWalletOrder}
                    />
                  </div>
                  <button
                    onClick={pay}
                    disabled={busy}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-full border border-border bg-transparent px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Other ways to pay {money(data.dueCents)}
                  </button>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Secure checkout · PayPal, Google Pay, Apple Pay and cards
                  </p>
                </>

              ) : (
                <div className="mt-6 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                  {data.paymentsMessage}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-destructive text-center">{error}</p>
              )}

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Prefer another way? Just reply to your booking email or message us on WhatsApp.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
