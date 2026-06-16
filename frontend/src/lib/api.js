import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const SERVICES = [
  {
    name: "Haircut",
    price: "$35",
    duration: "45 min",
    image: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900",
    description: "Precision cuts, classic fades, and modern styles by master barbers.",
  },
  {
    name: "Manicure & Pedicure",
    price: "$58",
    duration: "75 min",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=900",
    description: "Luxury hand and foot care — shaping, polish, exfoliation and treatment in one ritual.",
  },
  {
    name: "Spa",
    price: "$75",
    duration: "60 min",
    image: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=900",
    description: "Aromatherapy facials, full-body massage and restorative relaxation rituals.",
  },
];

export const STYLISTS = ["No preference", "Carlos", "Camille", "Chen", "Diego"];

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];
