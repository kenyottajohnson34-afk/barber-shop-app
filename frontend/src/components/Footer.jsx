import { MapPin, Phone, Mail, Instagram } from "lucide-react";

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
          <div className="overline mb-4">Visit Us</div>
          <h3 className="font-serif text-3xl mb-6">C&amp;C Barber Shop &amp; Spa</h3>
          <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
            A modern sanctuary for grooming and self-care. Two chairs, four artists,
            one obsession: timeless craft.
          </p>
        </div>

        <div className="space-y-4 text-sm">
          <div className="overline mb-3">Contact</div>
          <div className="flex items-start gap-3 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary mt-0.5" />
            <span>221B Crescent Avenue<br/>Old Town District</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Phone className="w-4 h-4 text-primary" />
            <span>+1 (555) 234 8899</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="w-4 h-4 text-primary" />
            <span>hello@candc.shop</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Instagram className="w-4 h-4 text-primary" />
            <span>@candc.barbershop</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="overline mb-3">Opening Hours</div>
          {[
            ["Mon — Fri", "09:00 — 19:00"],
            ["Saturday", "09:00 — 18:00"],
            ["Sunday", "10:00 — 16:00"],
          ].map(([d, h]) => (
            <div key={d} className="flex justify-between text-muted-foreground border-b border-white/5 pb-2">
              <span>{d}</span><span className="gold-text">{h}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} C&amp;C Barber Shop &amp; Spa — All rights reserved.</span>
          <span className="tracking-widest uppercase">Crafted with care</span>
        </div>
      </div>
    </footer>
  );
}
