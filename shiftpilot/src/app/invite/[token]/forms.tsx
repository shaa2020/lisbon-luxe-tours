"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { signUpFromInvitationAction, type FormState } from "@/app/(auth)/actions";
import { acceptInvitationAction } from "./actions";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvitationAction, {});
  return (
    <form action={action} className="space-y-3">
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <SubmitButton className="w-full" pendingLabel="Accepting…">
        Accept invitation
      </SubmitButton>
    </form>
  );
}

export function InvitationSignUpForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState<FormState, FormData>(signUpFromInvitationAction, {});
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="email" value={email} />
      <FormField id="fullName" label="Full name" error={state.errors?.fullName} required>
        <Input name="fullName" autoComplete="name" />
      </FormField>
      <FormField id="password" label="Create a password" hint="At least 12 characters." error={state.errors?.password} required>
        <Input name="password" type="password" autoComplete="new-password" />
      </FormField>
      <SubmitButton className="w-full" pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
