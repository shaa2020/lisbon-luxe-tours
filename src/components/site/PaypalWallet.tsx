/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPaypalPublicConfig } from "@/lib/paypal.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Props = {
  /** Total charged now, in euros. */
  amount: number;
  label: string;
  disabled?: boolean;
  /** Creates the booking + PayPal order server-side, returns the order id. */
  createOrder: () => Promise<string | null>;
  /** Called once PayPal reports the order approved/captured. */
  onPaid: (orderId: string) => void;
};

const SDK_ID = "paypal-sdk";

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset["loaded"] === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("script failed")));
      }
      return;
    }
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.addEventListener("load", () => {
      s.dataset["loaded"] = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error("script failed")));
    document.head.appendChild(s);
  });
}

export function PaypalWallet({ amount, label, disabled, createOrder, onPaid }: Props) {
  const configFn = useServerFn(getPaypalPublicConfig);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const applePayRef = useRef<HTMLDivElement>(null);
  const googlePayRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep the latest props reachable from SDK callbacks without re-rendering buttons.
  const state = useRef({ amount, label, disabled, createOrder, onPaid });
  state.current = { amount, label, disabled, createOrder, onPaid };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const cfg = await configFn();
      if (cancelled || !cfg.enabled || !cfg.clientId) return;
      setAvailable(true);

      const params = new URLSearchParams({
        "client-id": cfg.clientId,
        currency: "EUR",
        intent: "capture",
        components: "buttons,applepay,googlepay",
        "enable-funding": "paylater,card",
        "disable-funding": "credit",
      });
      await loadScript(`https://www.paypal.com/sdk/js?${params.toString()}`, SDK_ID);
      const paypal = (window as any).paypal;
      if (cancelled || !paypal) return;

      const beginOrder = async () => {
        const id = await state.current.createOrder();
        if (!id) throw new Error("Could not start the payment.");
        return id;
      };

      /* ---------- PayPal + card buttons ---------- */
      if (buttonsRef.current && paypal.Buttons) {
        buttonsRef.current.innerHTML = "";
        paypal
          .Buttons({
            style: { layout: "vertical", shape: "rect", height: 46, label: "paypal" },
            onClick: (_d: unknown, actions: any) =>
              state.current.disabled ? actions.reject() : actions.resolve(),
            createOrder: () => beginOrder(),
            onApprove: async (data: any) => state.current.onPaid(data.orderID),
            onError: (err: any) => toast.error(String(err?.message || "PayPal could not process the payment.")),
          })
          .render(buttonsRef.current)
          .catch(() => undefined);
      }

      /* ---------- Apple Pay ---------- */
      try {
        const AP = (window as any).ApplePaySession;
        if (AP && AP.supportsVersion(4) && AP.canMakePayments() && paypal.Applepay) {
          const applepay = paypal.Applepay();
          const apCfg = await applepay.config();
          if (!cancelled && apCfg?.isEligible && applePayRef.current) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("aria-label", "Pay with Apple Pay");
            btn.className =
              "w-full h-[46px] rounded-[2px] bg-black text-white text-sm font-medium tracking-wide";
            btn.textContent = " Pay";
            btn.onclick = async () => {
              if (state.current.disabled) return;
              try {
                setBusy(true);
                const orderId = await beginOrder();
                const session = new AP(4, {
                  countryCode: apCfg.countryCode,
                  currencyCode: apCfg.currencyCode || "EUR",
                  merchantCapabilities: apCfg.merchantCapabilities,
                  supportedNetworks: apCfg.supportedNetworks,
                  requiredBillingContactFields: ["postalAddress", "name"],
                  total: {
                    label: state.current.label,
                    amount: state.current.amount.toFixed(2),
                    type: "final",
                  },
                });
                session.onvalidatemerchant = async (event: any) => {
                  try {
                    const payload = await applepay.validateMerchant({
                      validationUrl: event.validationURL,
                      displayName: state.current.label,
                    });
                    session.completeMerchantValidation(payload.merchantSession);
                  } catch {
                    session.abort();
                    setBusy(false);
                  }
                };
                session.onpaymentauthorized = async (event: any) => {
                  try {
                    await applepay.confirmOrder({
                      orderId,
                      token: event.payment.token,
                      billingContact: event.payment.billingContact,
                    });
                    session.completePayment(AP.STATUS_SUCCESS);
                    state.current.onPaid(orderId);
                  } catch (e) {
                    session.completePayment(AP.STATUS_FAILURE);
                    toast.error((e as Error).message || "Apple Pay could not be completed.");
                    setBusy(false);
                  }
                };
                session.oncancel = () => setBusy(false);
                session.begin();
              } catch (e) {
                setBusy(false);
                toast.error((e as Error).message || "Apple Pay is unavailable right now.");
              }
            };
            applePayRef.current.innerHTML = "";
            applePayRef.current.appendChild(btn);
          }
        }
      } catch {
        /* Apple Pay simply stays hidden */
      }

      /* ---------- Google Pay ---------- */
      try {
        if (paypal.Googlepay) {
          const googlepay = paypal.Googlepay();
          const gpCfg = await googlepay.config();
          if (!cancelled && gpCfg?.isEligible) {
            await loadScript("https://pay.google.com/gp/p/js/pay.js", "google-pay-sdk");
            const google = (window as any).google;
            if (google?.payments?.api && googlePayRef.current) {
              const client = new google.payments.api.PaymentsClient({
                environment: cfg.env === "live" ? "PRODUCTION" : "TEST",
              });
              const isReady = await client.isReadyToPay({
                apiVersion: gpCfg.apiVersion,
                apiVersionMinor: gpCfg.apiVersionMinor,
                allowedPaymentMethods: gpCfg.allowedPaymentMethods,
              });
              if (isReady?.result && googlePayRef.current) {
                const onClick = async () => {
                  if (state.current.disabled) return;
                  try {
                    setBusy(true);
                    const orderId = await beginOrder();
                    const paymentData = await client.loadPaymentData({
                      apiVersion: gpCfg.apiVersion,
                      apiVersionMinor: gpCfg.apiVersionMinor,
                      allowedPaymentMethods: gpCfg.allowedPaymentMethods,
                      merchantInfo: gpCfg.merchantInfo,
                      transactionInfo: {
                        countryCode: gpCfg.countryCode || "PT",
                        currencyCode: "EUR",
                        totalPriceStatus: "FINAL",
                        totalPrice: state.current.amount.toFixed(2),
                      },
                    });
                    const res = await googlepay.confirmOrder({
                      orderId,
                      paymentMethodData: paymentData.paymentMethodData,
                    });
                    if (res?.status === "APPROVED" || res?.status === "PAYER_ACTION_REQUIRED") {
                      state.current.onPaid(orderId);
                    } else {
                      setBusy(false);
                      toast.error("Google Pay could not be completed.");
                    }
                  } catch (e) {
                    setBusy(false);
                    const msg = (e as any)?.statusCode === "CANCELED" ? "" : (e as Error).message;
                    if (msg) toast.error(msg || "Google Pay is unavailable right now.");
                  }
                };
                const btn = client.createButton({
                  onClick,
                  buttonSizeMode: "fill",
                  buttonType: "pay",
                  buttonColor: "black",
                });
                googlePayRef.current.innerHTML = "";
                googlePayRef.current.appendChild(btn);
              }
            }
          }
        }
      } catch {
        /* Google Pay simply stays hidden */
      }

      if (!cancelled) setReady(true);
    };

    start().catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // Mount once — live values are read through the `state` ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!available) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-ink/10" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-body">Express checkout</span>
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <div className={disabled ? "opacity-40 pointer-events-none" : undefined}>
        <div ref={applePayRef} className="[&>button]:w-full" />
        <div ref={googlePayRef} className="mt-2 [&>*]:w-full" />
        <div ref={buttonsRef} className="mt-2" />
      </div>
      {(!ready || busy) && (
        <p className="flex items-center justify-center gap-2 text-[11px] text-body">
          <Loader2 className="w-3 h-3 animate-spin" /> {busy ? "Processing…" : "Loading payment options…"}
        </p>
      )}
    </div>
  );
}
