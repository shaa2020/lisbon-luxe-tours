"use client";
import { useActionState, useRef, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { inviteStaffAction, type InviteState } from "./actions";

export function InviteStaffForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [state, action] = useActionState<InviteState, FormData>(inviteStaffAction, {});
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (state.delivery === "sent") toast.success(state.message);
    }
  }, [state]);

  return (
    <div className="space-y-4">
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      {state.ok && state.manualLink && (
        <Alert tone="warning" title="Share this link">
          <p>{state.message}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1 text-xs text-foreground">{state.manualLink}</code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.manualLink!);
                setCopied(true);
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </Alert>
      )}
      <form ref={formRef} action={action} className="space-y-4" noValidate>
        <FormField id="invite-email" label="Email" error={state.errors?.email} required>
          <Input name="email" type="email" autoComplete="off" />
        </FormField>
        <FormField id="invite-role" label="Role" error={state.errors?.role_id} required>
          <NativeSelect name="role_id" defaultValue="">
            <option value="" disabled>Choose a role…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </NativeSelect>
        </FormField>
        <SubmitButton className="w-full" pendingLabel="Sending…">Send invitation</SubmitButton>
      </form>
    </div>
  );
}
