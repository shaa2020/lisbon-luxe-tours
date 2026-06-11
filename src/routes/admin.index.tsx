import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, BookOpen, CalendarCheck, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { BrandLogo } from "@/components/site/BrandLogo";
import { uploadMediaFile } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function useCount(table: "tours" | "blog_posts" | "bookings" | "contact_messages") {
  return useQuery({
    queryKey: ["admin-count", table],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

function AdminDashboard() {
  const qc = useQueryClient();
  const tours = useCount("tours");
  const posts = useCount("blog_posts");
  const bookings = useCount("bookings");
  const messages = useCount("contact_messages");

  const brand = useQuery({
    queryKey: ["site-brand-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", true)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  const [brandName, setBrandName] = useState("Tuk Tuk 24");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
  });
  const [savingBiz, setSavingBiz] = useState(false);

  useEffect(() => {
    if (brand.data) {
      const d: any = brand.data;
      setBrandName(d.brand_name || "Tuk Tuk 24");
      setLogoUrl(d.logo_url ?? null);
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
      });
    }
  }, [brand.data]);

  const saveBrand = async () => {
    setSavingBrand(true);
    const { error } = await supabase.from("site_settings").upsert({
      id: true,
      brand_name: brandName.trim() || "Tuk Tuk 24",
      logo_url: logoUrl,
    });
    setSavingBrand(false);
    if (error) return toast.error(error.message);
    toast.success("Brand updated");
    qc.invalidateQueries({ queryKey: ["site-brand"] });
    qc.invalidateQueries({ queryKey: ["site-brand-admin"] });
  };

  const saveBiz = async () => {
    setSavingBiz(true);
    const { error } = await supabase.from("site_settings").upsert({ id: true, ...biz } as any);
    setSavingBiz(false);
    if (error) return toast.error(error.message);
    toast.success("Business info updated");
    qc.invalidateQueries({ queryKey: ["site-brand"] });
    qc.invalidateQueries({ queryKey: ["site-brand-admin"] });
  };

  const onBrandLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const url = await uploadMediaFile("brand", "luz-de-logo", file);
      setLogoUrl(url);
      toast.success("Logo uploaded");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const cards = [
    { to: "/admin/tours", label: "Tours", count: tours.data, desc: "Create, edit and publish tour pages.", Icon: Map },
    { to: "/admin/blog", label: "Journal", count: posts.data, desc: "Write and publish stories.", Icon: BookOpen },
    { to: "/admin", label: "Bookings", count: bookings.data, desc: "Booking requests inbox (coming soon).", Icon: CalendarCheck },
    { to: "/admin", label: "Messages", count: messages.data, desc: "Contact messages inbox (coming soon).", Icon: Mail },
  ] as const;

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Overview</p>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">A quick look at what's happening on the site.</p>
      </div>
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group block rounded-xl border border-border bg-card p-5 hover:border-primary hover:shadow-[0_10px_30px_rgba(30,58,95,0.08)] transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <c.Icon className="w-5 h-5" />
              </div>
              <p className="font-display text-3xl font-bold text-primary tabular-nums">
                {c.count ?? "—"}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{c.label}</p>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </Link>
        ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Brand settings</p>
            <p className="text-xs text-muted-foreground">Update the public company name and logo.</p>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <BrandLogo brandName={brandName} logoUrl={logoUrl} showTagline />
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-medium text-foreground">Company name</span>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-foreground">Logo image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onBrandLogo(e.target.files[0])}
              className="block w-full text-xs text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveBrand}
                disabled={savingBrand || uploadingLogo}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
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
            {(uploadingLogo || brand.isLoading) && <p className="text-xs text-muted-foreground">Updating…</p>}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Business information</p>
          <p className="text-xs text-muted-foreground">Email, phone, address and social links shown across the website.</p>
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={saveBiz}
          disabled={savingBiz}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {savingBiz ? "Saving…" : "Save business info"}
        </button>
      </section>

    </AdminShell>
  );
}
