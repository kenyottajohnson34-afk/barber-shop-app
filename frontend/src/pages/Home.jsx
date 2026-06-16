import { Link } from "react-router-dom";
import { SERVICES } from "../lib/api";
import { ArrowRight, Scissors, Sparkles, Award, Clock } from "lucide-react";

const QR_URL_PUBLIC = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
  (typeof window !== "undefined" ? window.location.origin : "") + "/book"
)}&color=D4AF37&bgcolor=0A140E&qzone=2`;

export default function Home() {
  return (
    <div data-testid="home-page" className="bg-background text-foreground">
      {/* HERO */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden pt-16">
        <div className="purple-glow w-[700px] h-[700px] -right-40 -top-40" />
        <div className="purple-glow w-[500px] h-[500px] -left-32 bottom-0 opacity-60" />

        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url(https://images.pexels.com/photos/5812313/pexels-photo-5812313.jpeg)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-12 items-center w-full">
          <div className="lg:col-span-7 fade-up">
            <div className="overline mb-6">Est. C&amp;C — Barbería &amp; Spa · Style &amp; Relax</div>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tighter mb-8">
              Timeless craft.<br />
              <span className="gold-text">Modern</span> <em className="not-italic text-foreground/90">ritual.</em>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mb-10 leading-relaxed font-light">
              Precision haircuts, immaculate manicures &amp; pedicures, and restorative spa
              treatments — under one roof, by stylists who care.
            </p>

            <div className="flex flex-wrap gap-4 items-center">
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

            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg">
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

          {/* QR card */}
          <div className="lg:col-span-5 hidden lg:flex justify-end fade-up" style={{ animationDelay: "0.15s" }}>
            <div
              data-testid="hero-qr-card"
              className="relative w-[340px] bg-card p-8 border border-white/10 gold-glow rounded-sm"
            >
              <div className="overline mb-3">Scan to Book</div>
              <div className="font-serif text-2xl mb-5 leading-tight">
                Skip the call.<br/>Book in seconds.
              </div>
              <div className="bg-background p-3 inline-block border border-primary/30">
                <img
                  src={QR_URL_PUBLIC}
                  alt="Booking QR code"
                  data-testid="booking-qr-code"
                  className="w-[260px] h-[260px]"
                />
              </div>
              <div className="text-xs text-muted-foreground mt-4 tracking-wide">
                Or tap “Book Now” above
              </div>
            </div>
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
                Three services.<br/><span className="gold-text">One obsession.</span>
              </h2>
            </div>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              Every appointment is an unhurried ritual — never a rushed transaction. Choose your
              service, choose your stylist, and let us take care of the rest.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s, i) => (
              <div
                key={s.name}
                data-testid={`service-card-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="group bg-card border border-white/5 hover:border-primary/40 transition-all duration-500 rounded-sm overflow-hidden"
                style={{ animationDelay: `${0.05 * i}s` }}
              >
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="font-serif text-2xl">{s.name}</h3>
                    <span className="gold-text font-medium">{s.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{s.description}</p>
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest">
                    <span className="text-muted-foreground">{s.duration}</span>
                    <Link
                      to={`/book?service=${encodeURIComponent(s.name)}`}
                      data-testid={`book-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-btn`}
                      className="text-primary hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      Book <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
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
                data-testid="booking-qr-code-secondary"
                className="w-[240px] h-[240px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
