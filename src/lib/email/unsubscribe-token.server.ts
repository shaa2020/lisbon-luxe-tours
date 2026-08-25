type SupabaseLike = {
  from: (table: string) => any;
};

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateUnsubscribeToken(supabase: SupabaseLike, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: existing, error: lookupError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token,used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (lookupError) throw new Error("Could not prepare the recipient's email preferences");
  if (existing?.used_at) return { token: null, suppressed: true as const };
  if (existing?.token) return { token: existing.token as string, suppressed: false as const };

  const candidate = createToken();
  const { error: insertError } = await supabase
    .from("email_unsubscribe_tokens")
    .upsert({ token: candidate, email: normalizedEmail }, { onConflict: "email", ignoreDuplicates: true });
  if (insertError) throw new Error("Could not prepare the recipient's email preferences");

  const { data: stored, error: readError } = await supabase
    .from("email_unsubscribe_tokens")
    .select("token,used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (readError || !stored?.token) throw new Error("Could not confirm the recipient's email preferences");
  return { token: stored.token as string, suppressed: Boolean(stored.used_at) };
}