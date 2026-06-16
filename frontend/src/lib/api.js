import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ────────────────────────────────────────────────────────────
// Shop info
// ────────────────────────────────────────────────────────────
export const SHOP = {
  name: "C&C Barbería & Spa",
  tagline: "Look Good. Feel Good. Drink Good.",
  motto: "Estilo que te representa.",
  address: "Plaza #6, Calle Principal, Costambar, Puerto Plata",
  country: "República Dominicana",
  phone: "849-581-7990",
  instagram: "@candcbarberia",
};

// ────────────────────────────────────────────────────────────
// Service categories (displayed on Home /Services page — NO prices)
// ────────────────────────────────────────────────────────────
export const CATEGORIES = [
  {
    slug: "barberia",
    name: "Barbería",
    subtitle: "Cuts · Beards · Styling",
    image: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200",
    description: "Classic and modern cuts, hot-towel shaves, beard sculpting and styling rituals.",
    services: [
      "Classic Haircut",
      "Fade / Taper Fade",
      "Premium Haircut & Styling",
      "Beard Trim",
      "Beard Line-Up w/ Razor",
      "Haircut + Beard Combo",
      "Kids Haircut (Under 12)",
      "Kids Fade",
      "Senior Haircut",
      "Shape-Up / Line-Up",
      "Head Shave",
      "Hot Towel Shave",
      "Eyebrows",
      "Hair Wash",
      "Design / Hair Art",
      "Hair Coloring",
      "Facial Treatment",
      "VIP Service — Cut, Beard, Hot Towel & Drink",
    ],
  },
  {
    slug: "unas",
    name: "Uñas",
    subtitle: "Nails · Manicure · Pedicure",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200",
    description: "Classic, gel and acrylic nail care for hands and feet, plus nail art and kids' service.",
    services: [
      "Manicura Clásica",
      "Manicura de Gel",
      "Set Completo de Acrílico",
      "Relleno de Acrílico",
      "Pedicura",
      "Pedicura de Spa",
      "Pedicura de Gel",
      "Reparación de Uñas",
      "Diseño de Uñas",
      "Cambio de Esmalte (Manos)",
      "Cambio de Esmalte (Pies)",
      "Manicura Infantil",
      "Pedicura Infantil",
      "Manicura + Pedicura (Combo)",
      "Mani + Spa Pedi Gel (Combo)",
      "Pedicura + Masaje 30 min (Combo)",
    ],
  },
  {
    slug: "masajes",
    name: "Masajes",
    subtitle: "Massage · Spa · Stones",
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1200",
    description: "Relaxing, deep-tissue and hot-stone treatments by trained therapists.",
    services: [
      "Masaje Relajante (30 min)",
      "Masaje Relajante (60 min)",
      "Masaje de Tejido Profundo (60 min)",
      "Masaje con Piedras Calientes (60 min)",
      "Masaje de Pies (30 min)",
      "Masaje de Cuello y Hombros (30 min)",
      "Masaje de Cuerpo Completo (90 min)",
    ],
  },
  {
    slug: "lounge",
    name: "Lounge",
    subtitle: "Drinks · Cigars · Good Vibes",
    image: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200",
    description: "Premium whiskey, tequila, rum, wine, mixed drinks and cigar pairings while you wait.",
    services: [
      "Premium Whiskey",
      "Tequila",
      "Vodka",
      "Gin",
      "Rum",
      "Liqueurs",
      "Wine (Glass / Bottle)",
      "Mixed Drinks",
      "Premium Cigar Pairing",
    ],
    notBookable: true,
  },
];

// Flat list of bookable services (excludes the lounge menu)
export const BOOKABLE_SERVICES = CATEGORIES
  .filter((c) => !c.notBookable)
  .flatMap((c) => c.services.map((s) => ({ category: c.name, name: s })));

export const STYLISTS = ["No preference", "Carlos", "Camille", "Chen", "Diego"];

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];
