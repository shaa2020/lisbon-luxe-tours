import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DiscountCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  value: number;
  min_guests: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function useDiscountCodes() {
  return useQuery({
    queryKey: ["admin-discount-codes"],
    queryFn: async (): Promise<DiscountCode[]> => {
      const { data, error } = await supabase
        .from("discount_codes" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DiscountCode[];
    },
  });
}

export function useSaveDiscountCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<DiscountCode> & { code: string }) => {
      const payload = { ...row, code: row.code.trim().toUpperCase() };
      const { error } = row.id
        ? await supabase.from("discount_codes" as never).update(payload as never).eq("id", row.id)
        : await supabase.from("discount_codes" as never).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discount-codes"] }),
  });
}

export function useDeleteDiscountCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-discount-codes"] }),
  });
}

export function useDiscountRedemptions() {
  return useQuery({
    queryKey: ["admin-discount-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_redemptions" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        code: string;
        amount_cents: number;
        booking_id: string | null;
        created_at: string;
      }[];
    },
  });
}
