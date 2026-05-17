import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Nav({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = overlay && !scrolled;

  const links = [
    { to: "/", label: "Home" },
    { to: "/tours", label: "Tour" },
    { to: "/tours", label: "Destination" },
    { to: "/tours", label: "Travel Styles" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ] as const;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-white shadow-[0_2px_20px_rgba(30,58,95,0.08)]"
      }`}
    >
      {/* Top utility strip */}
      <div
        className={`hidden md:block transition-colors ${
          transparent ? "bg-ink/30 backdrop-blur-sm text-white" : "bg-cloud text-ink"
        }`}
      >
        <div className="container-x flex items-center justify-between h-9 text-[12px]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <PhoneIcon /> +351 912 345 678
            </span>
            <span className="flex items-center gap-2">
              <PinIcon /> Largo da Graça 12, Lisboa
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://facebook.com" aria-label="Facebook" className="hover:text-gold transition-colors"><FbIcon /></a>
            <a href="https://instagram.com" aria-label="Instagram" className="hover:text-gold transition-colors"><IgIcon /></a>
            <a href="https://twitter.com" aria-label="Twitter" className="hover:text-gold transition-colors"><TwIcon /></a>
            <span className="opacity-30">|</span>
            <button className="hover:text-gold transition-colors font-medium">Sign in</button>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container-x flex items-center justify-between h-[78px]">
        <Link to="/" className="flex items-center gap-2 group">
          <LogoMark color={transparent ? "#ffffff" : "#2bb6f7"} />
          <span
            className={`font-display font-bold text-2xl tracking-tight ${
              transparent ? "text-white" : "text-ink"
            }`}
          >
            Lusitano
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              className={`text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                transparent ? "text-white/90 hover:text-gold" : "text-ink hover:text-gold"
              }`}
              activeProps={{ className: "text-gold" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className="hidden md:inline-flex items-center px-6 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.35)] transition-all"
          >
            Inquiry
          </Link>
          <button
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Menu"
            className={`lg:hidden p-2 rounded-md ${transparent ? "text-white" : "text-ink"}`}
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
        <div className="lg:hidden bg-white border-t border-border shadow-lg">
          <div className="container-x py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="py-3 text-[14px] font-semibold uppercase tracking-wider text-ink hover:text-gold transition-colors border-b border-border last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="mt-3 inline-flex items-center justify-center px-6 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest"
            >
              Inquiry
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function LogoMark({ color }: { color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
      <path
        d="M6 28c4-2 8-2 12 0s8 2 12 0M8 22l8-12 6 8 4-4 6 8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="10" r="2" fill={color} />
    </svg>
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
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 22v-8h3l1-4h-4V7.5C13 6.4 13.3 6 14.5 6H17V2.2C16.5 2.1 15.2 2 13.8 2 10.9 2 9 3.7 9 6.7V10H6v4h3v8h4z"/></svg>
  );
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
function TwIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M22 5.8c-.7.3-1.5.6-2.3.7.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1A4.1 4.1 0 0 0 11.8 9 11.6 11.6 0 0 1 3.4 4.7a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.9-.5v.1c0 2 1.4 3.6 3.3 4-.6.2-1.3.2-2 .1.6 1.7 2.1 2.9 4 2.9A8.3 8.3 0 0 1 2 18.5 11.7 11.7 0 0 0 8.3 20c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.5-1.3 2.1-2.1z"/></svg>
  );
}
