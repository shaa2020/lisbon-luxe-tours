import { useEffect, useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Swaps the page manifest / apple metadata to the admin app profile while the
 * admin panel is mounted, and offers an install affordance.
 */
export function useAdminInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Point the browser at the admin-only manifest.
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previous = link?.getAttribute("href") ?? null;
    if (link) link.setAttribute("href", "/admin.webmanifest");

    const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    const previousTitle = appleTitle?.getAttribute("content") ?? null;
    if (appleTitle) appleTitle.setAttribute("content", "TT24 Admin");

    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const previousIcon = appleIcon?.getAttribute("href") ?? null;
    if (appleIcon) appleIcon.setAttribute("href", "/admin-icon-192.png");

    const ua = window.navigator.userAgent;
    const iosLike = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
    setIsIos(iosLike && !/CriOS|FxiOS|EdgiOS/.test(ua) ? true : iosLike);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (link && previous) link.setAttribute("href", previous);
      if (appleTitle && previousTitle) appleTitle.setAttribute("content", previousTitle);
      if (appleIcon && previousIcon) appleIcon.setAttribute("href", previousIcon);
    };
  }, []);

  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
    return choice.outcome === "accepted";
  };

  return { canPrompt: !!deferred, installed, isIos, install };
}

export function InstallAppButton({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { canPrompt, installed, isIos, install } = useAdminInstall();
  const [showHelp, setShowHelp] = useState(false);

  if (installed) return null;
  if (!canPrompt && !isIos) return null;

  const onClick = () => {
    if (canPrompt) void install();
    else setShowHelp(true);
  };

  return (
    <>
      {variant === "full" ? (
        <button
          onClick={onClick}
          className="w-full flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-accent"
        >
          <Download className="w-4 h-4 text-primary" /> Install admin app
        </button>
      ) : (
        <button
          onClick={onClick}
          title="Install admin app"
          aria-label="Install admin app"
          className="grid w-10 h-10 place-items-center rounded-xl text-primary hover:bg-accent"
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      {showHelp && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-6"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="font-semibold text-base">Add the admin app</h3>
              <button onClick={() => setShowHelp(false)} aria-label="Close" className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Share className="w-4 h-4 text-primary shrink-0" /> Tap the <b className="text-foreground">Share</b> button in Safari.
              </li>
              <li className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary shrink-0" /> Choose <b className="text-foreground">Add to Home Screen</b>.
              </li>
              <li className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary shrink-0" /> Confirm — it opens straight into the admin panel.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
