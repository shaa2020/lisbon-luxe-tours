import { DEFAULT_BRAND_TAGLINE, useSiteBrand } from "@/lib/brand";

type BrandLogoProps = {
  brandName?: string;
  logoUrl?: string | null;
  showTagline?: boolean;
  imageHeightClassName?: string;
  wordmarkClassName?: string;
  className?: string;
};

export function BrandLogo({
  brandName,
  logoUrl,
  showTagline = false,
  imageHeightClassName = "h-10",
  wordmarkClassName,
  className,
}: BrandLogoProps) {
  const brand = useSiteBrand();
  const resolvedBrandName = brandName ?? brand.brandName;
  const resolvedLogoUrl = logoUrl === undefined ? brand.logoUrl : logoUrl;

  if (resolvedLogoUrl) {
    return (
      <div className={`flex items-center ${className ?? ""}`.trim()}>
        <img
          src={resolvedLogoUrl}
          alt={resolvedBrandName}
          className={`${imageHeightClassName} w-auto max-w-[220px] object-contain`.trim()}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`.trim()}>
      <FallbackBrandMark />
      <span className="flex flex-col leading-none min-w-0">
        <span className={`font-display font-bold tracking-tight text-foreground ${wordmarkClassName ?? "text-[22px] md:text-[26px]"}`.trim()}>
          {resolvedBrandName}
        </span>
        {showTagline && (
          <span className="hidden sm:block text-[9px] font-semibold uppercase tracking-[0.18em] text-primary/90 mt-1">
            {DEFAULT_BRAND_TAGLINE}
          </span>
        )}
      </span>
    </div>
  );
}

export function FallbackBrandMark() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="luzde-mark" x1="6" y1="5" x2="35" y2="37" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--foreground)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="38" height="38" rx="11" fill="url(#luzde-mark)" />
      <circle cx="21" cy="21" r="9.2" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
      <path d="M21 8.5v4.5M21 29v4.5M8.5 21H13M29 21h4.5M12.5 12.5l3.2 3.2M26.3 26.3l3.2 3.2M29.5 12.5l-3.2 3.2M15.7 26.3l-3.2 3.2" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M21 11.5c2.7 3.7 4 6.6 4 8.7 0 2.7-1.8 5.1-4 5.1s-4-2.4-4-5.1c0-2.1 1.3-5 4-8.7Z" fill="white" />
      <path d="M21 14.2c1.4 2 2.1 3.6 2.1 4.9 0 1.5-0.9 2.9-2.1 2.9s-2.1-1.4-2.1-2.9c0-1.3 0.7-2.9 2.1-4.9Z" fill="var(--primary)" />
    </svg>
  );
}
