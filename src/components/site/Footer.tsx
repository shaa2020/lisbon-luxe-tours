import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-[#070706] text-white border-t border-white/10">
      {/* Top CTA strip */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div>
            <p className="eyebrow text-gold mb-4">Plan your journey</p>
            <h3 className="font-serif text-4xl md:text-6xl italic leading-[0.95] max-w-2xl">
              Bem-vindo a Portugal — <span className="text-gold/90">let's begin.</span>
            </h3>
          </div>
          <Link
            to="/contact"
            className="shrink-0 px-10 py-5 rounded-full bg-gold text-ink eyebrow font-medium hover:bg-white transition-colors"
          >
            Start Planning →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-20 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <span className="font-serif text-3xl font-bold tracking-tight block mb-6">LUSITANO</span>
          <p className="text-sm text-white/60 leading-relaxed mb-8 max-w-xs">
            Private tuk-tuk and chauffeured experiences across Lisboa, Sintra,
            Belém and the Atlantic coast. Crafted by locals since 2012.
          </p>
          <address className="not-italic text-sm text-white/70 leading-relaxed">
            Largo da Graça 12<br />
            1100-265 Lisboa, Portugal<br />
            <a href="tel:+351912345678" className="hover:text-gold">+351 912 345 678</a><br />
            <a href="mailto:concierge@lusitano.pt" className="hover:text-gold">concierge@lusitano.pt</a>
          </address>
        </div>

        <div className="md:col-span-2">
          <h4 className="eyebrow mb-6 text-white/80">Destinations</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/tours" className="hover:text-gold">Lisboa</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Alfama</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Belém</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Sintra</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Cascais</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Cabo da Roca</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h4 className="eyebrow mb-6 text-white/80">Experiences</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/tours" className="hover:text-gold">Tuk-Tuk Tours</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Sintra Day</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Sunset Cabo</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Custom Itinerary</Link></li>
            <li><Link to="/tours" className="hover:text-gold">Airport Transfer</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h4 className="eyebrow mb-6 text-white/80">Company</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/about" className="hover:text-gold">Philosophy</Link></li>
            <li><Link to="/about" className="hover:text-gold">The Fleet</Link></li>
            <li><Link to="/about" className="hover:text-gold">Sustainability</Link></li>
            <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <h4 className="eyebrow mb-6 text-white/80">Follow</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><a href="https://wa.me/351912345678" className="hover:text-gold">WhatsApp</a></li>
            <li><a href="https://instagram.com" className="hover:text-gold">Instagram</a></li>
            <li><a href="https://facebook.com" className="hover:text-gold">Facebook</a></li>
            <li><a href="https://tripadvisor.com" className="hover:text-gold">Tripadvisor</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="eyebrow text-white/40">© {new Date().getFullYear()} Lusitano · RNAAT 1042 · NIF 514 832 109</p>
          <div className="flex gap-8 eyebrow text-white/40">
            <a href="#" className="hover:text-gold">Privacy</a>
            <a href="#" className="hover:text-gold">Terms</a>
            <a href="#" className="hover:text-gold">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
