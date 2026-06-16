import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listAllReviewsAdmin } from "./reviews.functions";

export type Review = {
  id: string;
  tour_id: string | null;
  tour_slug: string | null;
  author_name: string;
  author_email: string | null;
  rating: number;
  title: string | null;
  body: string;
  travel_date: string | null;
  status: "pending" | "approved" | "hidden";
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ReviewStats = {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function aggregateReviews(reviews: Review[]): ReviewStats {
  const approved = reviews.filter((r) => r.status === "approved");
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewStats["distribution"];
  let total = 0;
  for (const r of approved) {
    const key = Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[key] += 1;
    total += r.rating;
  }
  const count = approved.length;
  return {
    count,
    average: count ? total / count : 0,
    distribution,
  };
}

export function useTourReviews(slug: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "tour", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select("*")
        .eq("tour_slug", slug!)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });
}

export function useFeaturedReviews(limit = 6) {
  return useQuery({
    queryKey: ["reviews", "featured", limit],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select("*")
        .eq("status", "approved")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });
}

export function useAllReviewsAdmin() {
  return useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });
}

export type SubmitReviewInput = {
  tour_id?: string | null;
  tour_slug?: string | null;
  author_name: string;
  author_email?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  travel_date?: string | null;
};

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitReviewInput) => {
      const name = input.author_name.trim();
      const body = input.body.trim();
      const title = (input.title ?? "").trim() || null;
      const email = (input.author_email ?? "").trim() || null;
      if (name.length < 2 || name.length > 80) {
        throw new Error("Please enter your name (2–80 characters).");
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Please enter a valid email address.");
      }
      if (input.rating < 1 || input.rating > 5) {
        throw new Error("Please pick a rating between 1 and 5 stars.");
      }
      if (body.length < 10 || body.length > 4000) {
        throw new Error("Review must be 10–4000 characters.");
      }
      if (title && title.length > 140) {
        throw new Error("Title must be 140 characters or less.");
      }
      const { error } = await supabase.from("reviews" as never).insert({
        tour_id: input.tour_id ?? null,
        tour_slug: input.tour_slug ?? null,
        author_name: name,
        author_email: email,
        rating: input.rating,
        title,
        body,
        travel_date: input.travel_date ?? null,
        status: "pending",
        featured: false,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["reviews", "tour", vars.tour_slug] });
    },
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<Review, "status" | "featured" | "title" | "body" | "rating">>;
    }) => {
      const { error } = await supabase
        .from("reviews" as never)
        .update(input.patch as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-count", "reviews"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-count", "reviews"] });
    },
  });
}
