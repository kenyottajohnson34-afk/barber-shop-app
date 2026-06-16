import { Link, NavLink, useLocation } from "react-router-dom";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_cuts-and-care/artifacts/6c9hyyw2_IMG-20260615-WA0073.jpg";

export default function Nav() {
  const { pathname } = useLocation();
  const onAdmin = pathname.startsWith("/admin");
  const linkBase = "text-sm tracking-wide transition-colors";
  const linkClass = ({ isActive }) =>
    `${linkBase} ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

  return (
    <header
      data-testid="site-nav"
      className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-24 flex items-center justify-between">
        <Link to="/" data-testid="brand-logo" className="flex items-center gap-3 group">
          <img
            src={LOGO_URL}
            alt="C&C Barbería & Spa"
            className="h-20 sm:h-24 w-auto object-contain"
            data-testid="brand-logo-img"
          />
        </Link>

        {!onAdmin && (
          <nav className="hidden md:flex items-center gap-10">
            <NavLink to="/" end className={linkClass} data-testid="nav-home">Home</NavLink>
            <a href="/#services" className={`${linkBase} text-muted-foreground hover:text-foreground`} data-testid="nav-services">Services</a>
            <a href="/#gallery" className={`${linkBase} text-muted-foreground hover:text-foreground`} data-testid="nav-gallery">Gallery</a>
            <a href="/#contact" className={`${linkBase} text-muted-foreground hover:text-foreground`} data-testid="nav-contact">Contact</a>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <Link
            to="/book"
            data-testid="nav-book-btn"
            className="px-4 py-2 text-sm tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-sm"
          >
            Book Now
          </Link>
          <Link
            to={onAdmin ? "/admin" : "/admin/login"}
            data-testid="nav-admin-link"
            className="hidden sm:inline text-xs text-muted-foreground hover:text-primary tracking-widest uppercase"
          >
            Admin
          </Link>
        </div>
      </div>
    </header>
  );
}
