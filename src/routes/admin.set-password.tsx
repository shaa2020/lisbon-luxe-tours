import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteBrand } from "@/lib/brand";

export const Route = createFileRoute("/admin/set-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set your password — Tuk Tuk 24 Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const { brandName } = useSiteBrand();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const check = async () => {
      // Invite / recovery links deliver the session either in the URL hash
      // (implicit flow) or via a ?code= exchange (PKCE flow).
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          /* handled by the session check below */
        }
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setReady(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    void check();
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password saved — you're signed in.");
    navigate({ to: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to site
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground mt-4 mb-1">
          Choose your password
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Set the password you'll use for the {brandName} admin panel.
        </p>

        {!ready ? (
          <p className="text-sm text-muted-foreground">Checking your link…</p>
        ) : !hasSession ? (
          <div className="space-y-4">
            <div className="text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-3">
              This link is invalid or has already been used. Invitation and reset links
              can only be opened once, and expire after a while.
            </div>
            <Link
              to="/admin/login"
              search={{ redirect: "/admin" }}
              className="block w-full text-center rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">New password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Repeat password</label>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
