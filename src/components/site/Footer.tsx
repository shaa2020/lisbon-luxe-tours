import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="py-20 px-6 md:px-10 border-t border-ink/5 bg-paper">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
        <div className="max-w-xs">
          <span className="font-serif text-3xl font-bold tracking-tight block mb-6">LUSITANO</span>
          <p className="text-sm text-ink/60 leading-relaxed">
            Crafting exceptional private experiences across the Portuguese landscape since 2012.
          </p>
          <p className="mt-6 text-sm text-ink/70">Largo da Graça 12<br />1100-265 Lisboa, Portugal</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-12 md:gap-16">
          <div>
            <h4 className="eyebrow mb-6 font-bold">Destinations</h4>
            <ul className="space-y-4 text-sm text-ink/70">
              <li><Link to="/tours" className="hover:text-gold">Lisbon</Link></li>
              <li><Link to="/tours" className="hover:text-gold">Sintra Hills</Link></li>
              <li><Link to="/tours" className="hover:text-gold">Belém</Link></li>
              <li><Link to="/tours" className="hover:text-gold">Cascais</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="eyebrow mb-6 font-bold">Company</h4>
            <ul className="space-y-4 text-sm text-ink/70">
              <li><Link to="/about" className="hover:text-gold">Philosophy</Link></li>
              <li><Link to="/about" className="hover:text-gold">The Fleet</Link></li>
              <li><Link to="/contact" className="hover:text-gold">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="eyebrow mb-6 font-bold">Connect</h4>
            <ul className="space-y-4 text-sm text-ink/70">
              <li><a href="https://wa.me/351912345678" className="hover:text-gold">WhatsApp</a></li>
              <li><a href="https://instagram.com" className="hover:text-gold">Instagram</a></li>
              <li><a href="mailto:concierge@lusitano.pt" className="hover:text-gold">Email</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-ink/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="eyebrow text-ink/40">© {new Date().getFullYear()} Lusitano Private Tours</p>
        <div className="flex gap-8 eyebrow text-ink/40">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
