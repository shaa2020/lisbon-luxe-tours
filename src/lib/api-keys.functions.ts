import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

export const API_SCOPE_LIST = [
  "READ_TOURS",
  "READ_AVAILABILITY",
  "READ_BUSINESS",
  "CREATE_LEAD",
  "CREATE_BOOKING_REQUEST",
  "READ_CUSTOMERS",
  "WRITE_CUSTOMERS",
  "READ_CONVERSATIONS",
  "WRITE_CONVERSATIONS",
] as const;

const scopeSchema = z.enum(API_SCOPE_LIST);

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApiKeyRow[]> => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, key_prefix, scopes, active, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ApiKeyRow[];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(scopeSchema).min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateApiKey } = await import("./api/core.server");

    const { token, prefix, hash } = generateApiKey();
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        name: data.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: data.scopes,
        created_by: context.userId,
      })
      .select("id, name, key_prefix, scopes, active, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw new Error(error.message);

    // The plaintext token is returned exactly once and never stored.
    return { key: row as ApiKeyRow, token };
  });

export const setApiKeyActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("api_keys")
      .update({ active: data.active, revoked_at: data.active ? null : new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const rotateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateApiKey } = await import("./api/core.server");

    const { token, prefix, hash } = generateApiKey();
    const { data: row, error } = await supabaseAdmin
      .from("api_keys")
      .update({ key_prefix: prefix, key_hash: hash, active: true, revoked_at: null, last_used_at: null })
      .eq("id", data.id)
      .select("id, name, key_prefix, scopes, active, created_at, last_used_at, revoked_at")
      .single();
    if (error) throw new Error(error.message);
    return { key: row as ApiKeyRow, token };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listApiRequestLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "api.manage");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("api_request_logs")
      .select("id, key_prefix, method, path, status, ip, error, duration_ms, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
