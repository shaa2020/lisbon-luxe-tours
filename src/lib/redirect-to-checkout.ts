/**
 * Send the browser to a hosted checkout page.
 *
 * Inside an embedded preview (or any iframe), assigning `window.location.href`
 * is blocked by the frame's sandbox/CSP, so the click appears to do nothing.
 * Break out to the top window first, and fall back to a new tab.
 */
export function redirectToCheckout(url: string) {
  const inIframe = typeof window !== "undefined" && window.self !== window.top;

  if (inIframe) {
    try {
      if (window.top) {
        window.top.location.href = url;
        return;
      }
    } catch {
      // cross-origin top frame — fall through to a new tab
    }
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) return;
  }

  window.location.href = url;
}
