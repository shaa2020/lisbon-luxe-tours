import { supabase } from "@/integrations/supabase/client";

export async function uploadMediaFile(
  folder: "tours" | "blog",
  slug: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "untitled";
  const path = `${folder}/${safeSlug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
