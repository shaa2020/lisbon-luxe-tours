import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useSiteBrand } from "@/lib/brand";

export function Footer() {
  const { brandName, business } = useSiteBrand();
  const waHref = `https://wa.me/${(business.whatsappPhone || "").replace(/[^\d]/g, "")}`;

  return (
    <footer className="bg-white border-t border-border">
      {/* Newsletter strip */}
      <div className="bg-cloud/70">
        <div className="container-x py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2bb6f7" strokeWidth="1.5">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <path d="M22 2 12 12" strokeLinecap="round" />
            </svg>
            <div>
              <p className="font-display font-bold text-ink text-lg">Stay in the loop.</p>
              <p className="text-body text-sm">Curated stories from Portugal — once a month, no noise.</p>
            </div>
          </div>
          <form className="flex w-full md:w-auto">
            <input
              type="email"
              placeholder="Your e-mail"
              className="h-[46px] px-4 rounded-l-full bg-white text-ink placeholder:text-ink/40 outline-none text-sm border border-border focus:border-gold transition flex-1 md:w-72"
            />
            <button className="h-[46px] px-6 rounded-r-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className="container-x py-16 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <div className="mb-5">
            <BrandLogo wordmarkClassName="text-2xl text-ink" />
          </div>
          <p className="text-sm text-body leading-relaxed mb-6 max-w-xs">
            Boutique private tours of Lisboa, Sintra and the Atlantic coast — built day by day,
            guest by guest, by a small team that lives here.
          </p>
          <p className="eyebrow text-ink/40">© {new Date().getFullYear()} {brandName} · Lisboa, Portugal</p>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Address</h4>
          <address className="not-italic text-sm text-body leading-relaxed space-y-2">
            <div>{business.addressLine1}<br />{business.addressLine2}</div>
            <div><a href={`mailto:${business.contactEmail}`} className="hover:text-gold transition-colors">{business.contactEmail}</a></div>
            <div><a href={`tel:${business.contactPhone.replace(/\s+/g, "")}`} className="hover:text-gold transition-colors">{business.contactPhone}</a></div>
          </address>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Useful Links</h4>
          <ul className="space-y-3 text-sm text-body">
            <li><Link to="/" className="hover:text-gold transition-colors">Home</Link></li>
            <li><Link to="/tours" className="hover:text-gold transition-colors">Tours</Link></li>
            <li><Link to="/tours" className="hover:text-gold transition-colors">Destinations</Link></li>
            <li><Link to="/about" className="hover:text-gold transition-colors">Privacy Policy</Link></li>
            <li><Link to="/journal" className="hover:text-gold transition-colors">Latest News</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Contact</h4>
          <ul className="space-y-3 text-sm text-body">
            <li><Link to="/about" className="hover:text-gold transition-colors">About Us</Link></li>
            <li><Link to="/tours" className="hover:text-gold transition-colors">Shop</Link></li>
            <li><Link to="/journal" className="hover:text-gold transition-colors">Journal</Link></li>
            <li><Link to="/faq" className="hover:text-gold transition-colors">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-gold transition-colors">Get in touch</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Follow Us</h4>
          <div className="flex gap-3">
            {[
              { label: "Fb", href: business.facebookUrl },
              { label: "Ig", href: business.instagramUrl },
              { label: "Tw", href: business.twitterUrl },
              { label: "Wa", href: waHref },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                className="w-10 h-10 rounded-full bg-cloud text-ink flex items-center justify-center text-[11px] font-semibold hover:bg-gold hover:text-white transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-x py-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-body">
            © {new Date().getFullYear()} {brandName} · All Rights Reserved{business.footerLegal ? ` · ${business.footerLegal}` : ""}
          </p>
          <div className="flex gap-6 text-[12px] text-body">
            <a href="#" className="hover:text-gold transition-colors">Privacy</a>
            <a href="#" className="hover:text-gold transition-colors">Terms</a>
            <a href="#" className="hover:text-gold transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
