import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, BellOff, Send, Loader2 } from "lucide-react";
import {
  getPushPublicKey,
  savePushDevice,
  removePushDevice,
  sendTestPush,
} from "@/lib/push.functions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type State = "loading" | "unsupported" | "blocked" | "off" | "on";

/**
 * Pairs this phone / computer for real lock-screen alerts (new bookings,
 * payments). Uses a dedicated messaging service worker — no page caching.
 */
export function PushNotifications({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchKey = useServerFn(getPushPublicKey);
  const save = useServerFn(savePushDevice);
  const remove = useServerFn(removePushDevice);
  const test = useServerFn(sendTestPush);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw-admin.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        toast.error("Notifications were not allowed on this device.");
        return;
      }

      const { key } = await fetchKey({});
      if (!key) {
        toast.error("Notifications are not configured yet.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw-admin.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));

      await save({
        data: {
          endpoint: sub.endpoint,
          p256dh: bufToBase64Url(sub.getKey("p256dh")),
          auth: bufToBase64Url(sub.getKey("auth")),
          user_agent: navigator.userAgent.slice(0, 380),
          label: /iPhone|iPad|Android/i.test(navigator.userAgent) ? "Phone" : "Computer",
        },
      });

      setState("on");
      toast.success("Alerts are on for this device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn on alerts.");
    } finally {
      setBusy(false);
    }
  }, [fetchKey, save]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-admin.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await remove({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState("off");
      toast.success("Alerts are off for this device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn off alerts.");
    } finally {
      setBusy(false);
    }
  }, [remove]);

  const runTest = useCallback(async () => {
    setTesting(true);
    try {
      const res = await test({});
      if (res.sent > 0) toast.success("Test alert sent — check your device.");
      else toast.error("No alert could be delivered. Try turning alerts off and on again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed.");
    } finally {
      setTesting(false);
    }
  }, [test]);

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="text-xs text-muted-foreground">
        This browser cannot show alerts. On iPhone, add the admin app to your Home Screen first.
      </p>
    );
  }

  if (state === "blocked") {
    return (
      <p className="text-xs text-muted-foreground">
        Alerts are blocked for this site. Allow notifications in your browser settings, then reload.
      </p>
    );
  }

  const on = state === "on";

  return (
    <div className={compact ? "space-y-2" : "rounded-xl border border-border bg-card p-4 space-y-3"}>
      {!compact && (
        <div>
          <h3 className="text-sm font-semibold">Alerts on this device</h3>
          <p className="text-xs text-muted-foreground">
            Get a buzz on your lock screen for new bookings and payments, even when the app is closed.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={on ? disable : enable}
          disabled={busy}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
            on
              ? "border border-border hover:bg-accent"
              : "bg-primary text-primary-foreground hover:opacity-90"
          }`}
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : on ? (
            <BellOff className="w-3.5 h-3.5" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
          {on ? "Turn off alerts" : "Turn on alerts"}
        </button>

        {on && (
          <button
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send test
          </button>
        )}
      </div>

      {compact && (
        <p className="text-[11px] text-muted-foreground">
          {on ? "This device buzzes for new bookings and payments." : "Get alerts even when the app is closed."}
        </p>
      )}
    </div>
  );
}
