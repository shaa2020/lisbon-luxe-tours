import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: UnsubscribePage,
  head: () => ({
    meta: [
      { title: "Email preferences · Tuk Tuk 24" },
      { name: "description", content: "Manage the emails you receive from Tuk Tuk 24 Lisbon." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Email preferences · Tuk Tuk 24" },
      { property: "og:description", content: "Manage the emails you receive from Tuk Tuk 24 Lisbon." },
    ],
  }),
  errorComponent: () => <Shell title="Something went wrong" body="Please try the link again later." />,
  notFoundComponent: () => <Shell title="Not found" body="This page does not exist." />,
});

function Shell({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-cloud/40 p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl p-10 text-center shadow-sm">
        <h1 className="font-display text-2xl text-ink mb-2">{title}</h1>
        {body && <p className="text-body text-sm">{body}</p>}
        {children}
      </div>
    </div>
  );
}

function UnsubscribePage() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"loading" | "valid" | "used" | "invalid" | "done" | "error">("loading");

  useEffect(() => {
    if (!token) return setState("invalid");
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (data.used || data.already_unsubscribed) return setState("used");
        setState(data.valid === false ? "invalid" : "valid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setState("loading");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "loading") return <Shell title="One moment…" />;
  if (state === "invalid") return <Shell title="Link not valid" body="This unsubscribe link is invalid or has expired." />;
  if (state === "used") return <Shell title="Already unsubscribed" body="You will not receive further emails from us." />;
  if (state === "done") return <Shell title="You're unsubscribed" body="We won't email you again. Safe travels!" />;
  if (state === "error") return <Shell title="Something went wrong" body="Please try again in a moment." />;

  return (
    <Shell title="Unsubscribe" body="Stop receiving emails from Tuk Tuk 24 Lisbon?">
      <button
        onClick={confirm}
        className="mt-6 inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-gold transition"
      >
        Confirm unsubscribe
      </button>
    </Shell>
  );
}
