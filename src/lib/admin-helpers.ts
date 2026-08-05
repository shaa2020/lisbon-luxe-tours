import { supabase } from "@/integrations/supabase/client";

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 0.82;

/**
 * Downscale + re-encode an image in the browser before upload so visitors
 * download ~150-400KB webp files instead of multi-megabyte camera originals.
 * Falls back to the original file if anything goes wrong (or for SVG/GIF).
 */
async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const passthrough = { blob: file as Blob, ext: (file.name.split(".").pop() ?? "jpg").toLowerCase() };
  if (typeof window === "undefined") return passthrough;
  if (!file.type.startsWith("image/")) return passthrough;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return passthrough;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return passthrough;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
    if (!blob || blob.size === 0) return passthrough;
    // Keep the original if compression somehow made it bigger.
    if (blob.size >= file.size && scale === 1) return passthrough;
    return { blob, ext: "webp" };
  } catch {
    return passthrough;
  }
}

export async function uploadMediaFile(
  folder: "tours" | "blog" | "brand" | "custom",
  slug: string,
  file: File,
): Promise<string> {
  const { blob, ext } = await compressImage(file);
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "untitled";
  const path = `${folder}/${safeSlug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, blob, {
      upsert: true,
      contentType: blob.type || file.type || undefined,
      cacheControl: "31536000",
    });
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
