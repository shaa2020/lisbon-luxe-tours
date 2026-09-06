export type SeoFormValue = {
  seo_title: string;
  meta_description: string;
  primary_keyword: string;
  secondary_keywords: string;
  canonical_url: string;
  og_image_url: string;
  image_alt: string;
  noindex: boolean;
};

export const emptySeo: SeoFormValue = {
  seo_title: "",
  meta_description: "",
  primary_keyword: "",
  secondary_keywords: "",
  canonical_url: "",
  og_image_url: "",
  image_alt: "",
  noindex: false,
};

/** Turns a database row into the form value. */
export function seoFromRow(row: Record<string, unknown> | null | undefined): SeoFormValue {
  if (!row) return { ...emptySeo };
  const list = row['secondary_keywords'];
  return {
    seo_title: (row['seo_title'] as string) ?? "",
    meta_description: (row['meta_description'] as string) ?? "",
    primary_keyword: (row['primary_keyword'] as string) ?? "",
    secondary_keywords: Array.isArray(list) ? (list as string[]).join(", ") : "",
    canonical_url: (row['canonical_url'] as string) ?? "",
    og_image_url: (row['og_image_url'] as string) ?? "",
    image_alt: (row['image_alt'] as string) ?? "",
    noindex: row['noindex'] === true,
  };
}

/** Turns the form value into a database payload. Empty text becomes null. */
export function seoToPayload(v: SeoFormValue) {
  const t = (s: string) => {
    const trimmed = s.trim();
    return trimmed.length > 0 ? trimmed : null;
  };
  const keywords = v.secondary_keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  return {
    seo_title: t(v.seo_title),
    meta_description: t(v.meta_description),
    primary_keyword: t(v.primary_keyword),
    secondary_keywords: keywords.length > 0 ? keywords : null,
    canonical_url: t(v.canonical_url),
    og_image_url: t(v.og_image_url),
    image_alt: t(v.image_alt),
    noindex: v.noindex,
  };
}

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Counter({ value, max, ideal }: { value: string; max: number; ideal: string }) {
  const len = value.trim().length;
  const over = len > max;
  return (
    <p className={`text-xs mt-1 ${over ? "text-destructive" : "text-muted-foreground"}`}>
      {len}/{max} characters · {ideal}
      {over ? " · too long, Google will cut it off" : ""}
    </p>
  );
}

export function SeoFieldsEditor({
  value,
  onChange,
  previewUrl,
  fallbackTitle,
  fallbackDescription,
}: {
  value: SeoFormValue;
  onChange: (patch: Partial<SeoFormValue>) => void;
  previewUrl?: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}) {
  const shownTitle = value.seo_title.trim() || fallbackTitle || "";
  const shownDesc = value.meta_description.trim() || fallbackDescription || "";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Search &amp; social
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Leave anything empty and the page keeps the text it shows today.
        </p>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
          Google preview
        </p>
        <p className="text-[13px] text-blue-700 dark:text-blue-400 line-clamp-1">
          {shownTitle || "Your page title"}
        </p>
        {previewUrl && <p className="text-[11px] text-emerald-700 dark:text-emerald-500">{previewUrl}</p>}
        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">
          {shownDesc || "Your page description appears here."}
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-medium mb-1 block">Search title</span>
        <input
          value={value.seo_title}
          onChange={(e) => onChange({ seo_title: e.target.value })}
          placeholder={fallbackTitle}
          className={input}
        />
        <Counter value={value.seo_title} max={60} ideal="aim for 50–60" />
      </label>

      <label className="block">
        <span className="text-xs font-medium mb-1 block">Search description</span>
        <textarea
          rows={3}
          value={value.meta_description}
          onChange={(e) => onChange({ meta_description: e.target.value })}
          placeholder={fallbackDescription}
          className={input}
        />
        <Counter value={value.meta_description} max={158} ideal="aim for 140–158" />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium mb-1 block">Main keyword</span>
          <input
            value={value.primary_keyword}
            onChange={(e) => onChange({ primary_keyword: e.target.value })}
            placeholder="lisbon tuk tuk tour"
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block">Other keywords (comma separated)</span>
          <input
            value={value.secondary_keywords}
            onChange={(e) => onChange({ secondary_keywords: e.target.value })}
            placeholder="alfama tour, private tuk tuk lisbon"
            className={input}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium mb-1 block">Image description (alt text)</span>
        <input
          value={value.image_alt}
          onChange={(e) => onChange({ image_alt: e.target.value })}
          placeholder="Electric tuk-tuk parked in front of Alfama's viewpoint"
          className={input}
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium mb-1 block">Share image URL (optional)</span>
          <input
            value={value.og_image_url}
            onChange={(e) => onChange({ og_image_url: e.target.value })}
            placeholder="https://…"
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block">Canonical URL (optional)</span>
          <input
            value={value.canonical_url}
            onChange={(e) => onChange({ canonical_url: e.target.value })}
            placeholder={previewUrl}
            className={input}
          />
        </label>
      </div>

      <label className="flex items-center justify-between text-sm">
        <span>
          Hide from Google
          <span className="block text-xs text-muted-foreground">
            Page stays live but is left out of search and the sitemap.
          </span>
        </span>
        <input
          type="checkbox"
          checked={value.noindex}
          onChange={(e) => onChange({ noindex: e.target.checked })}
        />
      </label>
    </div>
  );
}
