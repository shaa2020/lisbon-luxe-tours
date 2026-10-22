import { useEffect, useRef, useState } from "react";

type MediaImageProps = {
  /** Current image URL from the database. Empty/null renders a skeleton. */
  src?: string | null;
  alt: string;
  className?: string;
  /** Wrapper class; the wrapper also hosts the skeleton. */
  wrapperClassName?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  /** Intrinsic pixel size — sets width/height so the browser reserves space (no layout shift). */
  width?: number;
  height?: number;
};

/**
 * Image with a skeleton placeholder.
 *
 * The database URL is the single source of truth: no bundled fallback is ever
 * shown, and changing `src` resets the loaded state (via `key`) so the previous
 * image is never left on screen while the new one downloads.
 */
export function MediaImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
  loading = "lazy",
  fetchPriority,
  sizes,
  width,
  height,
}: MediaImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const loaded = Boolean(src && loadedSrc === src);
  const failed = Boolean(src && failedSrc === src);

  // SSR/cached images can finish loading before React attaches onLoad,
  // which would leave the image invisible forever. Detect that on mount.
  useEffect(() => {
    const img = imgRef.current;
    if (img && src && img.complete && img.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  }, [src]);

  const showSkeleton = !src || failed || !loaded;

  return (
    <span
      className={`block overflow-hidden ${/\b(absolute|fixed|sticky)\b/.test(wrapperClassName) ? "" : "relative"} ${wrapperClassName}`}
    >
      {showSkeleton && (
        <span
          aria-hidden="true"
          className="absolute inset-0 block bg-gradient-to-br from-cloud via-cloud/60 to-cloud animate-pulse"
        />
      )}
      {src && !failed && (
        <img
          key={src}
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          sizes={sizes}
          width={width}
          height={height}
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={`${className} relative`}
        />
      )}
    </span>
  );
}
