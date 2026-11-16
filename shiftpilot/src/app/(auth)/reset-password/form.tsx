"use client";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import { updatePasswordAction, type FormState } from "../actions";

export function NewPasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="danger">{state.message}</Alert>}
      <FormField id="password" label="New password" error={state.errors?.password} required>
        <Input name="password" type="password" autoComplete="new-password" />
      </FormField>
      <FormField id="confirm" label="Confirm new password" error={state.errors?.confirm} required>
        <Input name="confirm" type="password" autoComplete="new-password" />
      </FormField>
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
