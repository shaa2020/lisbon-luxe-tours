import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export function Nav({ overlay = false }: { overlay?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !overlay || scrolled;
  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
        solid
          ? "bg-paper/85 backdrop-blur-md border-b border-ink/5 text-ink"
          : "text-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight">
          LUSITANO
        </Link>
        <div className="hidden md:flex gap-10 eyebrow font-medium">
          <Link to="/tours" className="hover:text-gold transition-colors">Collections</Link>
          <Link to="/about" className="hover:text-gold transition-colors">The Fleet</Link>
          <Link to="/contact" className="hover:text-gold transition-colors">Contact</Link>
        </div>
        <Link
          to="/tours"
          className={`px-5 py-2 rounded-full eyebrow font-medium border transition-all ${
            solid
              ? "border-ink/20 hover:bg-ink hover:text-paper"
              : "border-white/30 hover:bg-white hover:text-ink"
          }`}
        >
          Book Experience
        </Link>
      </div>
    </nav>
  );
}
