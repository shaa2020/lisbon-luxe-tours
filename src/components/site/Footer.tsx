import { Link } from "@tanstack/react-router";

export function Footer() {
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
          <div className="flex items-center gap-2 mb-5">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <path
                d="M6 28c4-2 8-2 12 0s8 2 12 0M8 22l8-12 6 8 4-4 6 8"
                stroke="#2bb6f7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="32" cy="10" r="2" fill="#2bb6f7" />
            </svg>
            <span className="font-display font-bold text-2xl text-ink">Saudade</span>
          </div>
          <p className="text-sm text-body leading-relaxed mb-6 max-w-xs">
            Travels many varieties of changes of lorem ipsum available, but the majority have
            suffered alteration in form by injected humor.
          </p>
          <p className="eyebrow text-ink/40">Designed by Saudade · 2026</p>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Address</h4>
          <address className="not-italic text-sm text-body leading-relaxed space-y-2">
            <div>Largo da Graça 12<br />1100-265 Lisboa, Portugal</div>
            <div><a href="mailto:concierge@lusitano.pt" className="hover:text-gold transition-colors">concierge@lusitano.pt</a></div>
            <div><a href="tel:+351912345678" className="hover:text-gold transition-colors">+351 912 345 678</a></div>
          </address>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Useful Links</h4>
          <ul className="space-y-3 text-sm text-body">
            <li><Link to="/" className="hover:text-gold transition-colors">Home</Link></li>
            <li><Link to="/tours" className="hover:text-gold transition-colors">Tours</Link></li>
            <li><Link to="/tours" className="hover:text-gold transition-colors">Destinations</Link></li>
            <li><a href="#" className="hover:text-gold transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">Latest News</a></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Contact</h4>
          <ul className="space-y-3 text-sm text-body">
            <li><Link to="/about" className="hover:text-gold transition-colors">About Us</Link></li>
            <li><a href="#" className="hover:text-gold transition-colors">Shop</a></li>
            <li><a href="#" className="hover:text-gold transition-colors">Blog</a></li>
            <li><Link to="/contact" className="hover:text-gold transition-colors">Get in touch</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-display font-semibold text-ink mb-5">Follow Us</h4>
          <div className="flex gap-3">
            {[
              { label: "Fb", href: "https://facebook.com" },
              { label: "Ig", href: "https://instagram.com" },
              { label: "Tw", href: "https://twitter.com" },
              { label: "Wa", href: "https://wa.me/351912345678" },
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
            © {new Date().getFullYear()} Saudade · All Rights Reserved · RNAAT 1042 · NIF 514 832 109
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
