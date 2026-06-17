import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { useSiteBrand } from "@/lib/brand";

export function Nav({ overlay = false }: { overlay?: boolean }) {
  // overlay kept for API compat but ignored — header is always visible & solid
  void overlay;
  const [mobileOpen, setMobileOpen] = useState(false);
  const { brandName } = useSiteBrand();

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const links = [
    { to: "/", label: "Home" },
    { to: "/tours", label: "Tours" },
    { to: "/tours/custom", label: "Build Your Tour" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ] as const;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-[0_2px_20px_rgba(30,58,95,0.06)]">
      {/* Top utility strip — desktop only */}
      <div className="hidden md:block bg-ink text-white">
        <div className="container-x flex items-center justify-between h-9 text-[11px]">
          <div className="flex items-center gap-6">
            <a href="tel:+351922024690" className="flex items-center gap-2 hover:text-gold transition-colors">
              <PhoneIcon /> +351 922 024 690
            </a>
            <span className="flex items-center gap-2 text-white/70">
              <PinIcon /> Largo da Graça 12, Lisboa
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com" aria-label="Instagram" className="hover:text-gold transition-colors"><IgIcon /></a>
            <a href="https://facebook.com" aria-label="Facebook" className="hover:text-gold transition-colors"><FbIcon /></a>
            <span className="opacity-30">|</span>
            <span className="text-white/70">EN · PT · ES</span>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container-x flex items-center justify-between h-[68px] md:h-[78px]">
        <Link to="/" className="group shrink-0" aria-label={`${brandName} home`}>
          <BrandLogo
            showTagline
            className="pointer-events-none"
            wordmarkClassName="text-[22px] md:text-[26px] text-ink group-hover:text-gold transition-colors"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l, i) => (
            <Link
              key={`${l.label}-${i}`}
              to={l.to}
              className="text-[13px] font-semibold uppercase tracking-wider text-ink hover:text-gold transition-colors"
              activeProps={{ className: "text-gold" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/contact"
            className="hidden md:inline-flex items-center px-5 lg:px-6 py-2.5 lg:py-3 rounded-full bg-gold text-white text-[11px] lg:text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.35)] transition-all"
          >
            Inquiry
          </Link>
          <button
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="lg:hidden p-2 rounded-md text-ink hover:text-gold transition-colors"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M4 7h16" strokeLinecap="round" />
                  <path d="M4 12h16" strokeLinecap="round" />
                  <path d="M4 17h16" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-border shadow-lg max-h-[calc(100vh-68px)] overflow-y-auto">
          <div className="container-x py-5 flex flex-col gap-1">
            {links.map((l, i) => (
              <Link
                key={`${l.label}-${i}`}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="py-3.5 text-[14px] font-semibold uppercase tracking-wider text-ink hover:text-gold transition-colors border-b border-border last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-4 inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)]"
            >
              Send Inquiry
            </Link>
            <a
              href="tel:+351922024690"
              className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-border text-ink text-[12px] font-semibold uppercase tracking-widest"
            >
              <PhoneIcon /> +351 922 024 690
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function FbIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-8h3l1-4h-4V7.5C13 6.4 13.3 6 14.5 6H17V2.2C16.5 2.1 15.2 2 13.8 2 10.9 2 9 3.7 9 6.7V10H6v4h3v8h4z"/></svg>;
}
function IgIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
    </svg>
  );
}
