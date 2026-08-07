import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandLogo } from "@/components/site/BrandLogo";
import { uploadMediaFile } from "@/lib/admin-helpers";
import { gatewayCredentialStatus, testGatewayConnection } from "@/lib/gateways.functions";
import { toast } from "sonner";
import { CheckCircle2, XCircle, CreditCard, Wallet, Banknote, HandCoins } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
  head: () => ({ meta: [{ title: "Settings · Admin" }] }),
});

type TabId = "brand" | "contact" | "homepage" | "booking" | "payments";

const TABS: { id: TabId; label: string; desc: string }[] = [
  { id: "brand", label: "Brand", desc: "Name and logo" },
  { id: "contact", label: "Contact", desc: "Email, phone, socials" },
  { id: "homepage", label: "Homepage", desc: "Images and slideshow" },
  { id: "booking", label: "Booking rules", desc: "Fees and capacity" },
  { id: "payments", label: "Payments", desc: "Gateways and maintenance" },
];

type HeroSlideRow = { label: string; image_url: string | null };

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";
const card = "rounded-xl border border-border bg-card p-5 space-y-4";
const btn = "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";

function AdminSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("brand");

  const brand = useQuery({
    queryKey: ["site-brand-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", true).single();
      if (error) throw error;
      return data as any;
    },
  });

  const [brandName, setBrandName] = useState("Tuk Tuk 24");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [aboutImage, setAboutImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [heroSlides, setHeroSlides] = useState<HeroSlideRow[]>([]);
  const [savingBiz, setSavingBiz] = useState(false);
  const [biz, setBiz] = useState({
    contact_email: "",
    contact_phone: "",
    whatsapp_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    country: "",
    instagram_url: "",
    facebook_url: "",
    twitter_url: "",
    footer_legal: "",
    hotel_pickup_fee_cents: 2000,
    daily_slot_capacity: 3,
    payments_enabled: true,
    payments_maintenance_message: "",
  });

  useEffect(() => {
    const d: any = brand.data;
    if (!d) return;
    setBrandName(d.brand_name || "Tuk Tuk 24");
    setLogoUrl(d.logo_url ?? null);
    setHeroImage(d.hero_image_url ?? null);
    setAboutImage(d.about_image_url ?? null);
    setHeroSlides(Array.isArray(d.hero_slides) ? (d.hero_slides as HeroSlideRow[]) : []);
    setBiz({
      contact_email: d.contact_email ?? "",
      contact_phone: d.contact_phone ?? "",
      whatsapp_phone: d.whatsapp_phone ?? "",
      address_line1: d.address_line1 ?? "",
      address_line2: d.address_line2 ?? "",
      city: d.city ?? "",
      country: d.country ?? "",
      instagram_url: d.instagram_url ?? "",
      facebook_url: d.facebook_url ?? "",
      twitter_url: d.twitter_url ?? "",
      footer_legal: d.footer_legal ?? "",
      hotel_pickup_fee_cents: Number(d.hotel_pickup_fee_cents ?? 2000) || 0,
      daily_slot_capacity: Number(d.daily_slot_capacity ?? 3) || 1,
      payments_enabled: d.payments_enabled !== false,
      payments_maintenance_message: d.payments_maintenance_message ?? "",
    });
  }, [brand.data]);

  const refreshBrand = () => {
    qc.invalidateQueries({ queryKey: ["site-brand"] });
    qc.invalidateQueries({ queryKey: ["site-brand-admin"] });
  };

  const saveBrand = async () => {
    setSavingBrand(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: true, brand_name: brandName.trim() || "Tuk Tuk 24", logo_url: logoUrl });
    setSavingBrand(false);
    if (error) return toast.error(error.message);
    toast.success("Brand updated");
    refreshBrand();
  };

  const saveBiz = async () => {
    setSavingBiz(true);
    const { error } = await supabase.from("site_settings").upsert({ id: true, ...biz } as any);
    setSavingBiz(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    refreshBrand();
  };

  const onBrandLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadMediaFile("brand", "logo", file);
      setLogoUrl(url);
      const { error } = await supabase.from("site_settings").upsert({ id: true, logo_url: url });
      if (error) throw error;
      refreshBrand();
      toast.success("Logo uploaded & saved");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSiteImage = async (
    column: "hero_image_url" | "about_image_url",
    setter: (v: string | null) => void,
    file: File | null,
  ) => {
    setUploadingImage(column);
    try {
      const url = file ? await uploadMediaFile("site", column, file) : null;
      const { error } = await supabase.from("site_settings").upsert({ id: true, [column]: url } as any);
      if (error) throw error;
      setter(url);
      refreshBrand();
      toast.success(file ? "Image uploaded & saved" : "Reset to built-in image");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploadingImage(null);
    }
  };

  const saveSlides = async (next: HeroSlideRow[]) => {
    setHeroSlides(next);
    const { error } = await supabase.from("site_settings").upsert({ id: true, hero_slides: next } as any);
    if (error) return toast.error(error.message);
    refreshBrand();
    toast.success("Homepage slideshow updated");
  };

  const onSlideImage = async (index: number, file: File) => {
    setUploadingImage(`slide-${index}`);
    try {
      const url = await uploadMediaFile("site", `hero-slide-${index}`, file);
      await saveSlides(heroSlides.map((s, i) => (i === index ? { ...s, image_url: url } : s)));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploadingImage(null);
    }
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Configuration</p>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Everything about how the website looks, charges and takes payments.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-md px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brand" && (
        <section className={`${card} max-w-xl`}>
          <div>
            <p className="text-sm font-semibold text-foreground">Brand</p>
            <p className="text-xs text-muted-foreground">Public company name and logo.</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <BrandLogo brandName={brandName} logoUrl={logoUrl} showTagline />
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-medium text-foreground">Company name</span>
            <input value={brandName} onChange={(e) => setBrandName(e.target.value)} className={input} />
          </label>
          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Logo image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onBrandLogo(e.target.files[0])}
              className="block w-full text-xs text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveBrand} disabled={savingBrand || uploadingLogo} className={btn}>
              {savingBrand ? "Saving…" : "Save brand"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground"
              >
                Use built-in logo
              </button>
            )}
          </div>
        </section>
      )}

      {tab === "contact" && (
        <section className={card}>
          <div>
            <p className="text-sm font-semibold text-foreground">Business information</p>
            <p className="text-xs text-muted-foreground">
              Email, phone, address and social links shown across the website.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { k: "contact_email", label: "Contact email" },
              { k: "contact_phone", label: "Phone (displayed)" },
              { k: "whatsapp_phone", label: "WhatsApp number (digits only ok)" },
              { k: "address_line1", label: "Address line 1" },
              { k: "address_line2", label: "Address line 2 / Postal & city" },
              { k: "city", label: "City" },
              { k: "country", label: "Country" },
              { k: "instagram_url", label: "Instagram URL" },
              { k: "facebook_url", label: "Facebook URL" },
              { k: "twitter_url", label: "Twitter / X URL" },
              { k: "footer_legal", label: "Footer legal line (RNAAT / NIF)" },
            ].map((f) => (
              <label key={f.k} className="block space-y-1">
                <span className="text-xs font-medium text-foreground">{f.label}</span>
                <input
                  value={(biz as any)[f.k] ?? ""}
                  onChange={(e) => setBiz((b) => ({ ...b, [f.k]: e.target.value }))}
                  className={input}
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={saveBiz} disabled={savingBiz} className={btn}>
            {savingBiz ? "Saving…" : "Save contact info"}
          </button>
        </section>
      )}

      {tab === "homepage" && (
        <div className="space-y-6">
          <section className={card}>
            <div>
              <p className="text-sm font-semibold text-foreground">Website images</p>
              <p className="text-xs text-muted-foreground">
                Homepage background and About page photo. Uploads are optimised automatically.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {[
                { key: "hero_image_url" as const, label: "Homepage background", value: heroImage, set: setHeroImage },
                { key: "about_image_url" as const, label: "About page image", value: aboutImage, set: setAboutImage },
              ].map((f) => (
                <div key={f.key} className="space-y-2">
                  <span className="text-xs font-medium text-foreground">{f.label}</span>
                  <div className="h-36 rounded-lg border border-border bg-background overflow-hidden flex items-center justify-center">
                    {f.value ? (
                      <img src={f.value} alt={f.label} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Using built-in image</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage === f.key}
                    onChange={(e) => e.target.files?.[0] && onSiteImage(f.key, f.set, e.target.files[0])}
                    className="block w-full text-xs text-muted-foreground"
                  />
                  {f.value && (
                    <button
                      type="button"
                      onClick={() => onSiteImage(f.key, f.set, null)}
                      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      Reset to built-in
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className={card}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Homepage slideshow</p>
                <p className="text-xs text-muted-foreground">
                  Each slide shows a destination name and its own photo. Slides rotate every 5.5s.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveSlides([...heroSlides, { label: "Lisboa", image_url: null }])}
                className="shrink-0 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                Add slide
              </button>
            </div>

            {heroSlides.length === 0 ? (
              <p className="text-xs text-muted-foreground">No slides yet — add one to start the slideshow.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {heroSlides.map((s, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="h-32 rounded-md bg-background overflow-hidden flex items-center justify-center">
                      {s.image_url ? (
                        <img src={s.image_url} alt={s.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Using homepage background</span>
                      )}
                    </div>
                    <input
                      value={s.label}
                      onChange={(e) =>
                        setHeroSlides(heroSlides.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                      }
                      onBlur={() => saveSlides(heroSlides)}
                      placeholder="Destination name"
                      className={input}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingImage === `slide-${i}`}
                      onChange={(e) => e.target.files?.[0] && onSlideImage(i, e.target.files[0])}
                      className="block w-full text-xs text-muted-foreground"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const n = [...heroSlides];
                          [n[i - 1], n[i]] = [n[i], n[i - 1]];
                          saveSlides(n);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === heroSlides.length - 1}
                        onClick={() => {
                          const n = [...heroSlides];
                          [n[i + 1], n[i]] = [n[i], n[i + 1]];
                          saveSlides(n);
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs text-foreground disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => saveSlides(heroSlides.filter((_, j) => j !== i))}
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "booking" && (
        <section className={`${card} max-w-xl`}>
          <div>
            <p className="text-sm font-semibold text-foreground">Booking rules</p>
            <p className="text-xs text-muted-foreground">Fees and daily capacity used across the booking flow.</p>
          </div>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">Hotel pickup &amp; drop-off fee (€)</span>
            <input
              type="number"
              min={0}
              step="1"
              value={Math.round((biz.hotel_pickup_fee_cents ?? 0) / 100)}
              onChange={(e) =>
                setBiz((b) => ({
                  ...b,
                  hotel_pickup_fee_cents: Math.max(0, Math.round(Number(e.target.value) || 0) * 100),
                }))
              }
              className={input}
            />
            <span className="block text-[11px] text-muted-foreground">
              Added to the total when guests opt in. Set to 0 to hide the option.
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-foreground">Tuk tuks available per time slot</span>
            <input
              type="number"
              min={1}
              step="1"
              value={biz.daily_slot_capacity}
              onChange={(e) =>
                setBiz((b) => ({ ...b, daily_slot_capacity: Math.max(1, Math.round(Number(e.target.value) || 1)) }))
              }
              className={input}
            />
            <span className="block text-[11px] text-muted-foreground">
              Controls the live availability shown on tour pages.
            </span>
          </label>
          <button type="button" onClick={saveBiz} disabled={savingBiz} className={btn}>
            {savingBiz ? "Saving…" : "Save booking rules"}
          </button>
        </section>
      )}

      {tab === "payments" && (
        <PaymentsSettings
          maintenanceEnabled={biz.payments_enabled}
          maintenanceMessage={biz.payments_maintenance_message}
          onChange={(patch) => setBiz((b) => ({ ...b, ...patch }))}
          onSave={saveBiz}
          saving={savingBiz}
        />
      )}
    </AdminShell>
  );
}

/* ============================ Payments tab ============================ */

type GatewayRow = {
  id: string;
  provider: "stripe" | "mollie" | "paypal" | "manual";
  label: string;
  installed: boolean;
  is_active: boolean;
  mode: "test" | "live";
  sort_order: number;
  last_check_ok: boolean | null;
  last_check_message: string | null;
  last_checked_at: string | null;
};

const PROVIDER_META: Record<
  GatewayRow["provider"],
  { blurb: string; keys: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  stripe: {
    blurb: "Cards, Apple Pay and Google Pay. Already built in — no keys needed.",
    keys: "Managed by Lovable payments",
    Icon: CreditCard,
  },
  mollie: {
    blurb: "European favourite: iDEAL, Bancontact, cards, MB WAY.",
    keys: "Needs MOLLIE_API_KEY (live) / MOLLIE_TEST_API_KEY",
    Icon: Wallet,
  },
  paypal: {
    blurb: "PayPal balance and cards through PayPal checkout.",
    keys: "Needs PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET",
    Icon: Banknote,
  },
  manual: {
    blurb: "No online payment — guests send a request and you confirm by email or WhatsApp.",
    keys: "No keys required",
    Icon: HandCoins,
  },
};

const GATEWAY_KEY_FIELDS: Record<GatewayRow["provider"], { key: string; label: string; help: string }[]> = {
  stripe: [],
  mollie: [
    {
      key: "MOLLIE_API_KEY",
      label: "Mollie API key",
      help: "Mollie dashboard → Developers → API keys. Paste the live key (live_…) while in Live mode, the test key (test_…) while in Test mode.",
    },
  ],
  paypal: [
    { key: "PAYPAL_CLIENT_ID", label: "Client ID", help: "PayPal Developer dashboard → Apps & Credentials." },
    { key: "PAYPAL_CLIENT_SECRET", label: "Secret", help: "Shown next to the client ID in the same app." },
  ],
  manual: [],
};

function GatewayKeyForm({
  provider,
  mode,
  savedFields,
  onSaved,
}: {
  provider: GatewayRow["provider"];
  mode: "test" | "live";
  savedFields: string[];
  onSaved: () => void;
}) {
  const fields = GATEWAY_KEY_FIELDS[provider];
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await saveGatewayKeys({ data: { provider, mode, values } });
      toast.success(`${mode === "live" ? "Live" : "Test"} keys saved`);
      setValues({});
      setOpen(false);
      onSaved();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await clearGatewayKeys({ data: { provider, mode } });
      toast.success("Keys removed");
      onSaved();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">
          {mode === "live" ? "Live" : "Test"} keys
          {savedFields.length > 0 && (
            <span className="ml-1 font-normal text-muted-foreground">· {savedFields.length} saved</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-semibold text-primary underline underline-offset-2"
        >
          {open ? "Close" : savedFields.length ? "Replace keys" : "Add keys"}
        </button>
      </div>

      {open && (
        <div className="space-y-2">
          {fields.map((f) => (
            <label key={f.key} className="block space-y-1">
              <span className="text-[11px] font-medium text-foreground">
                {f.label}
                {savedFields.includes(f.key) && (
                  <span className="ml-1 text-emerald-600">· saved</span>
                )}
              </span>
              <input
                type="password"
                autoComplete="off"
                placeholder={savedFields.includes(f.key) ? "•••••••• (leave blank to keep)" : f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                className={input}
              />
              <span className="block text-[10px] text-muted-foreground">{f.help}</span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={busy} className={btn}>
              {busy ? "Saving…" : "Save keys"}
            </button>
            {savedFields.length > 0 && (
              <button
                type="button"
                onClick={clear}
                disabled={busy}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-destructive"
              >
                Remove saved keys
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function PaymentsSettings({
  maintenanceEnabled,
  maintenanceMessage,
  onChange,
  onSave,
  saving,
}: {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  onChange: (patch: { payments_enabled?: boolean; payments_maintenance_message?: string }) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const qc = useQueryClient();
  const [testing, setTesting] = useState<string | null>(null);

  const gateways = useQuery({
    queryKey: ["admin-gateways"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_gateways")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as GatewayRow[];
    },
  });

  const creds = useQuery({
    queryKey: ["admin-gateway-credentials"],
    queryFn: async () => gatewayCredentialStatus({ data: undefined as never }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-gateways"] });

  const setInstalled = async (row: GatewayRow, installed: boolean) => {
    const { error } = await supabase
      .from("payment_gateways")
      .update({ installed, ...(installed ? {} : { is_active: false }) } as never)
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(installed ? `${row.label} installed` : `${row.label} removed`);
    refresh();
  };

  const activate = async (row: GatewayRow) => {
    const off = await supabase.from("payment_gateways").update({ is_active: false } as never).neq("id", row.id);
    if (off.error) return toast.error(off.error.message);
    const on = await supabase
      .from("payment_gateways")
      .update({ is_active: true, installed: true } as never)
      .eq("id", row.id);
    if (on.error) return toast.error(on.error.message);
    const settings = await supabase
      .from("site_settings")
      .upsert({ id: true, payment_provider: row.provider } as never);
    if (settings.error) return toast.error(settings.error.message);
    toast.success(`${row.label} is now taking payments`);
    refresh();
    qc.invalidateQueries({ queryKey: ["site-brand"] });
  };

  const setMode = async (row: GatewayRow, mode: "test" | "live") => {
    const { error } = await supabase.from("payment_gateways").update({ mode } as never).eq("id", row.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const runTest = async (row: GatewayRow) => {
    setTesting(row.id);
    try {
      const result = await testGatewayConnection({ data: { provider: row.provider, mode: row.mode } });
      result.ok ? toast.success(result.message) : toast.error(result.message);
      refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className={card}>
        <div>
          <p className="text-sm font-semibold text-foreground">Payment gateways</p>
          <p className="text-xs text-muted-foreground">
            Install a gateway, test the connection and switch which one takes money. Only one can be active at a time.
          </p>
        </div>

        {gateways.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading gateways…</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {(gateways.data ?? []).map((g) => {
              const meta = PROVIDER_META[g.provider];
              const Icon = meta.Icon;
              const credOk = creds.data?.[g.provider]?.[g.mode] ?? false;
              return (
                <div
                  key={g.id}
                  className={`rounded-xl border p-4 space-y-3 ${
                    g.is_active ? "border-primary bg-primary/5" : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Icon className="w-4.5 h-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{g.label}</p>
                        <p className="text-[11px] text-muted-foreground">{meta.keys}</p>
                      </div>
                    </div>
                    {g.is_active && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">{meta.blurb}</p>

                  {g.provider !== "manual" && (
                    <div className="flex items-center gap-2">
                      {(["test", "live"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(g, m)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold border transition ${
                            g.mode === m
                              ? "bg-foreground text-background border-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m === "test" ? "Test mode" : "Live mode"}
                        </button>
                      ))}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] ${
                          credOk ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {credOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {credOk ? "Keys found" : "Keys missing"}
                      </span>
                    </div>
                  )}

                  {g.last_check_message && (
                    <p className={`text-[11px] ${g.last_check_ok ? "text-emerald-600" : "text-destructive"}`}>
                      {g.last_check_message}
                    </p>
                  )}

                  {GATEWAY_KEY_FIELDS[g.provider].length > 0 && (
                    <GatewayKeyForm
                      provider={g.provider}
                      mode={g.mode}
                      savedFields={creds.data?.[g.provider]?.fields?.[g.mode] ?? []}
                      onSaved={() => {
                        qc.invalidateQueries({ queryKey: ["admin-gateway-credentials"] });
                        refresh();
                      }}
                    />
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!g.installed ? (
                      <button type="button" onClick={() => setInstalled(g, true)} className={btn}>
                        Install
                      </button>
                    ) : (
                      <>
                        {!g.is_active && (
                          <button type="button" onClick={() => activate(g)} className={btn}>
                            Use this gateway
                          </button>
                        )}
                        {g.provider !== "manual" && (
                          <button
                            type="button"
                            onClick={() => runTest(g)}
                            disabled={testing === g.id}
                            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground disabled:opacity-50"
                          >
                            {testing === g.id ? "Testing…" : "Test connection"}
                          </button>
                        )}
                        {!g.is_active && (
                          <button
                            type="button"
                            onClick={() => setInstalled(g, false)}
                            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-destructive"
                          >
                            Remove
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Keys you save here are encrypted on the server and never shown again — only whether they are present. Each
          mode (test / live) keeps its own set of keys.
        </p>
      </section>


      <section className={`${card} max-w-xl`}>
        <div>
          <p className="text-sm font-semibold text-foreground">Checkout maintenance</p>
          <p className="text-xs text-muted-foreground">
            Turn payments off temporarily. Bookings are still saved as payment requests.
          </p>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={maintenanceEnabled}
            onChange={(e) => onChange({ payments_enabled: e.target.checked })}
            className="h-4 w-4"
          />
          <span className="text-xs font-medium text-foreground">Online payments enabled</span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-foreground">Maintenance message</span>
          <textarea
            rows={3}
            value={maintenanceMessage ?? ""}
            onChange={(e) => onChange({ payments_maintenance_message: e.target.value })}
            className={input}
          />
        </label>
        <button type="button" onClick={onSave} disabled={saving} className={btn}>
          {saving ? "Saving…" : "Save payment settings"}
        </button>
      </section>
    </div>
  );
}
