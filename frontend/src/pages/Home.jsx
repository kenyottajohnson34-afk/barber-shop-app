import { Link } from "react-router-dom";
import { CATEGORIES, SHOP } from "../lib/api";
import { ArrowRight, Scissors, Sparkles, Award, Clock, Check } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_cuts-and-care/artifacts/6c9hyyw2_IMG-20260615-WA0073.jpg";

const QR_URL_PUBLIC = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
  (typeof window !== "undefined" ? window.location.origin : "") + "/book"
)}&color=D4AF37&bgcolor=0A140E&qzone=2`;

export default function Home() {
  return (
    <div data-testid="home-page" className="bg-background text-foreground">
      {/* HERO — giant centered logo banner */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center overflow-hidden pt-28 pb-20 text-center">
        <div className="purple-glow w-[700px] h-[700px] -right-40 -top-40" />
        <div className="purple-glow w-[600px] h-[600px] -left-32 bottom-0 opacity-60" />

        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url(https://images.pexels.com/photos/5812313/pexels-photo-5812313.jpeg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />

        <div className="relative max-w-5xl mx-auto px-6 lg:px-10 w-full flex flex-col items-center">
          {/* Giant logo banner */}
          <img
            src={LOGO_URL}
            alt="C&C Barbería & Spa"
            data-testid="hero-logo-banner"
            className="w-auto h-[45vh] sm:h-[55vh] lg:h-[60vh] max-h-[640px] object-contain fade-up drop-shadow-[0_30px_80px_rgba(212,175,55,0.25)]"
          />

          <div className="overline mt-10 mb-4 fade-up" style={{ animationDelay: "0.1s" }}>
            {SHOP.tagline} · Costambar, Puerto Plata
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tighter mb-6 fade-up" style={{ animationDelay: "0.15s" }}>
            Welcome to our <span className="gold-text">Barber Shop</span>
          </h1>

          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-10 leading-relaxed font-light fade-up" style={{ animationDelay: "0.2s" }}>
            Barbería, uñas, masajes y lounge — todo bajo un techo, en Costambar.
          </p>

          <div className="flex flex-wrap gap-4 items-center justify-center fade-up" style={{ animationDelay: "0.25s" }}>
            <Link
              to="/book"
              data-testid="hero-book-btn"
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-sm tracking-wide"
            >
              Book an Appointment
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#services"
              data-testid="hero-services-link"
              className="px-7 py-3.5 border border-white/15 hover:border-primary/60 hover:text-primary transition-colors rounded-sm tracking-wide"
            >
              Explore Services
            </a>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 sm:gap-16 fade-up" style={{ animationDelay: "0.3s" }}>
            {[
              ["12+", "Years"],
              ["4", "Stylists"],
              ["1.2k", "Five-star reviews"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-serif text-3xl gold-text">{n}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Scroll
        </div>
      </section>

      {/* WHY US strip */}
      <section className="border-y border-white/5 bg-card/40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            [Scissors, "Master Stylists", "12+ years on average"],
            [Sparkles, "Sterile Tools", "Hospital-grade sanitation"],
            [Award, "Premium Products", "Curated brands only"],
            [Clock, "On-time Service", "Respect for your schedule"],
          ].map(([Icon, t, d]) => (
            <div key={t} className="flex items-start gap-4">
              <Icon className="w-5 h-5 text-primary mt-1" />
              <div>
                <div className="font-medium">{t}</div>
                <div className="text-sm text-muted-foreground mt-1">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="relative py-28">
        <div className="purple-glow w-[600px] h-[600px] -right-40 top-20 opacity-50" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 relative">
          <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
            <div>
              <div className="overline mb-4">Our Menu</div>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl tracking-tighter">
                Cuts. Nails. Massage.<br/><span className="gold-text">A full ritual.</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Four worlds under one roof — barbería, uñas, masajes y lounge.
              Choose your service, choose your stylist, and let us take care of the rest.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {CATEGORIES.map((c, i) => (
              <div
                key={c.slug}
                data-testid={`category-card-${c.slug}`}
                className="group bg-card border border-white/5 hover:border-primary/40 transition-all duration-500 rounded-sm overflow-hidden flex flex-col"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="overline mb-2">{c.subtitle}</div>
                  <h3 className="font-serif text-3xl mb-3 gold-text">{c.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{c.description}</p>

                  <ul className="space-y-1.5 text-sm text-foreground/85 mb-6 flex-1">
                    {c.services.slice(0, 6).map((s) => (
                      <li key={s} className="flex items-start gap-2">
                        <Check className="w-3 h-3 text-primary mt-1.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                    {c.services.length > 6 && (
                      <li className="text-xs text-muted-foreground/80 pl-5 pt-1">
                        + {c.services.length - 6} more
                      </li>
                    )}
                  </ul>

                  {c.notBookable ? (
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Walk-in only
                    </span>
                  ) : (
                    <Link
                      to={`/book?category=${c.slug}`}
                      data-testid={`book-${c.slug}-btn`}
                      className="text-primary hover:text-foreground transition-colors inline-flex items-center gap-1 text-xs uppercase tracking-widest"
                    >
                      Book {c.name} <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <div>
              <div className="overline mb-4">Inside C&amp;C</div>
              <h2 className="font-serif text-4xl sm:text-5xl tracking-tighter">A space designed to slow you down.</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200", alt: "Black gentleman getting a fresh fade", big: true },
              { src: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900", alt: "Manicure detail" },
              { src: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=900", alt: "Spa massage on table" },
              { src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900", alt: "Fresh haircut detail" },
            ].map((g, i) => (
              <div
                key={g.alt + i}
                className={`overflow-hidden ${g.big ? "row-span-2 col-span-2 aspect-square" : "aspect-square"}`}
              >
                <img src={g.src} alt={g.alt} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QR CTA (mobile + secondary) */}
      <section className="relative py-24 border-t border-white/5">
        <div className="purple-glow w-[500px] h-[500px] left-1/2 -translate-x-1/2 top-0 opacity-40" />
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <div className="overline mb-4">Quick Book</div>
          <h2 className="font-serif text-4xl sm:text-5xl tracking-tighter mb-6">Scan. Pick a time. Done.</h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto">
            Point your phone camera at the QR. We'll take it from there.
          </p>
          <div className="inline-block bg-card p-6 border border-primary/30 gold-glow rounded-sm">
            <div className="bg-background p-2 inline-block">
              <img
                src={QR_URL_PUBLIC}
                alt="Booking QR code"
                data-testid="booking-qr-code"
                className="w-[240px] h-[240px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
