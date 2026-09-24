import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2, UserPlus, ShieldCheck, KeyRound, Bell, BellOff } from "lucide-react";
import { AdminShell, AdminPageHeader, AdminCard } from "@/components/admin/AdminShell";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type StaffRole } from "@/lib/permissions";
import { useAuth } from "@/lib/auth";
import {
  listTeam,
  inviteTeamMember,
  setTeamRole,
  removeTeamMember,
  sendTeamPasswordReset,
  setTeamEmailAlerts,
} from "@/lib/team.functions";

export const Route = createFileRoute("/admin/team")({
  head: () => ({ meta: [{ title: "Team & roles — Admin" }] }),
  component: TeamPage,
});

const ROLES: StaffRole[] = ["owner", "manager", "staff"];

function TeamPage() {
  return (
    <AdminShell requires="team.manage">
      <TeamBody />
    </AdminShell>
  );
}

function TeamBody() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchTeam = useServerFn(listTeam);
  const invite = useServerFn(inviteTeamMember);
  const setRole = useServerFn(setTeamRole);
  const remove = useServerFn(removeTeamMember);
  const resetPw = useServerFn(sendTeamPasswordReset);
  const setAlerts = useServerFn(setTeamEmailAlerts);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setNewRole] = useState<StaffRole>("staff");

  const team = useQuery({ queryKey: ["admin-team"], queryFn: () => fetchTeam({}) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-team"] });

  const origin = typeof window === "undefined" ? undefined : window.location.origin;

  const resetM = useMutation({
    mutationFn: (memberEmail: string) => resetPw({ data: { email: memberEmail, origin } }),
    onSuccess: () => toast.success("Password link sent"),
    onError: (e: Error) => toast.error(e.message),
  });

  const alertsM = useMutation({
    mutationFn: (v: { userId: string; enabled: boolean }) => setAlerts({ data: v }),
    onSuccess: (_r, v) =>
      toast.success(v.enabled ? "Email alerts turned on" : "Email alerts turned off"),
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-team"] }),
  });


  const inviteM = useMutation({
    mutationFn: () => invite({ data: { email, fullName: fullName || undefined, role, origin } }),
    onSuccess: () => {
      toast.success("Invitation sent");
      setEmail("");
      setFullName("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const roleM = useMutation({
    mutationFn: (v: { userId: string; role: StaffRole }) => setRole({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeM = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Member removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <AdminPageHeader
        eyebrow="Access"
        title="Team & roles"
        description="Invite people and decide exactly what each of them can reach."
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] items-start">
        <AdminCard className="p-5">
          <p className="text-sm font-semibold mb-3">Members</p>
          {team.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (team.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(team.data ?? []).map((m) => (
                <li key={m.userId} className="py-3 flex flex-wrap items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(m.email || "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.fullName || m.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.email}
                      {m.userId === user?.id ? " · you" : ""}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.lastSignInAt
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {m.lastSignInAt ? "Active" : "Invited — not signed in yet"}
                    </span>
                    <label className="mt-2 flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={m.emailAlerts}
                        disabled={alertsM.isPending || !m.email}
                        onChange={(e) =>
                          alertsM.mutate({ userId: m.userId, enabled: e.target.checked })
                        }
                      />
                      {m.emailAlerts ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                          <Bell className="h-3.5 w-3.5" /> Gets booking emails
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <BellOff className="h-3.5 w-3.5" /> No booking emails
                        </span>
                      )}
                    </label>
                  </div>
                  <select
                    value={m.role ?? "staff"}
                    disabled={roleM.isPending}
                    onChange={(e) => roleM.mutate({ userId: m.userId, role: e.target.value as StaffRole })}
                    className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => resetM.mutate(m.email)}
                    disabled={resetM.isPending || !m.email}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground disabled:opacity-40"
                    aria-label="Send password link"
                    title={m.lastSignInAt ? "Send password reset link" : "Resend set-password link"}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${m.email} from the team?`)) removeM.mutate(m.userId);
                    }}
                    disabled={m.userId === user?.id}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-border text-destructive disabled:opacity-40"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <div className="space-y-6">
          <AdminCard className="p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <UserPlus className="h-4 w-4 text-primary" /> Invite a member
            </p>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                inviteM.mutate();
              }}
            >
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                placeholder="Full name (optional)"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <select
                value={role}
                onChange={(e) => setNewRole(e.target.value as StaffRole)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={inviteM.isPending}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {inviteM.isPending ? "Sending…" : "Send invitation"}
              </button>
            </form>
          </AdminCard>

          <AdminCard className="p-5 space-y-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> What each role can do
            </p>
            {ROLES.map((r) => (
              <div key={r} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold">{ROLE_LABELS[r]}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </AdminCard>
        </div>
      </div>
    </>
  );
}
