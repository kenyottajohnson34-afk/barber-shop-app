import { MapPin, Phone, Instagram } from "lucide-react";
import { SHOP } from "../lib/api";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_cuts-and-care/artifacts/6c9hyyw2_IMG-20260615-WA0073.jpg";

export default function Footer() {
  return (
    <footer
      id="contact"
      data-testid="site-footer"
      className="relative border-t border-white/5 bg-background"
    >
      <div className="purple-glow w-[500px] h-[500px] -left-32 -bottom-32 opacity-50" />
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-20 grid lg:grid-cols-3 gap-12 relative">
        <div>
          <img src={LOGO_URL} alt="C&C Barbería & Spa" className="h-28 w-auto object-contain mb-6" />
          <p className="text-muted-foreground text-sm max-w-sm leading-relaxed italic">
            “{SHOP.motto}”
          </p>
          <p className="text-muted-foreground text-xs mt-4 tracking-widest uppercase">
            Barbershop · Spa · Lounge
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <div className="overline mb-3">Contact</div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span>{SHOP.address}<br/>{SHOP.country}</span>
          </div>
          <a
            href={`tel:${SHOP.phone.replace(/\s|-/g, "")}`}
            data-testid="footer-phone"
            className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
          >
            <Phone className="w-4 h-4 text-primary" />
            <span>{SHOP.phone}</span>
          </a>
          <a
            href={`https://instagram.com/${SHOP.instagram.replace("@","")}`}
            target="_blank"
            rel="noreferrer"
            data-testid="footer-instagram"
            className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
          >
            <Instagram className="w-4 h-4 text-primary" />
            <span>{SHOP.instagram}</span>
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <div className="overline mb-3">Opening Hours</div>
          {[
            ["Monday", "Closed"],
            ["Tue — Thu", "09:00 — 17:00"],
            ["Fri — Sat", "09:00 — 19:00"],
            ["Sunday", "10:00 — 14:00"],
          ].map(([d, h]) => (
            <div key={d} className="flex justify-between text-muted-foreground border-b border-white/5 pb-2">
              <span>{d}</span><span className="gold-text">{h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {SHOP.name} — All rights reserved.</span>
          <span className="tracking-widest uppercase">{SHOP.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
