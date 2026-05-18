import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteBrand } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (s) => ({ redirect: (s.redirect as string) || "/admin" }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { user, isAdmin, loading, signIn } = useAuth();
  const { brandName } = useSiteBrand();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate({ to: redirect || "/admin" });
    }
  }, [loading, user, isAdmin, navigate, redirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) toast.error(error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 shadow-sm">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to site
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground mt-4 mb-1">
{brandName} Admin
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to manage tours and stories.
        </p>

        {user && !isAdmin && (
          <div className="mb-4 text-xs rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-3">
            Signed in as {user.email}, but this account is not an admin.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
