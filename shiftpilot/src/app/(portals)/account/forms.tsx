"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { Input, NativeSelect } from "@/components/ui/input";
import { SubmitButton } from "@/components/forms/submit-button";
import type { FormState } from "@/app/(auth)/actions";
import { changePasswordAction, updateProfileAction } from "./actions";

function useToast(state: FormState) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
}

export function ProfileForm({ profile }: { profile: { full_name: string | null; phone: string | null; locale: string; email: string } }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  useToast(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <FormField id="email" label="Email" hint="Contact your agency to change your sign-in email.">
        <Input value={profile.email} readOnly disabled />
      </FormField>
      <FormField id="full_name" label="Full name" error={state.errors?.full_name} required>
        <Input name="full_name" defaultValue={profile.full_name ?? ""} autoComplete="name" />
      </FormField>
      <FormField id="phone" label="Phone" error={state.errors?.phone}>
        <Input name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" />
      </FormField>
      <FormField id="locale" label="Language">
        <NativeSelect name="locale" defaultValue={profile.locale}>
          <option value="nl">Nederlands</option>
          <option value="en">English</option>
        </NativeSelect>
      </FormField>
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  useToast(state);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}
      <FormField id="password" label="New password" error={state.errors?.password} required>
        <Input name="password" type="password" autoComplete="new-password" />
      </FormField>
      <FormField id="confirm" label="Confirm new password" error={state.errors?.confirm} required>
        <Input name="confirm" type="password" autoComplete="new-password" />
      </FormField>
      <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}
