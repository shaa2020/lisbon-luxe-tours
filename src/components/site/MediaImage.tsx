import { useEffect, useState } from "react";

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
}: MediaImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
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
          src={src}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          sizes={sizes}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
