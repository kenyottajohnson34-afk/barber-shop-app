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
    image: "https://images.pexels.com/photos/16372646/pexels-photo-16372646.jpeg",
    description: "Precision cuts, classic fades, and modern styles by master barbers.",
  },
  {
    name: "Manicure",
    price: "$28",
    duration: "40 min",
    image: "https://images.unsplash.com/photo-1632345031435-8727f6897d53",
    description: "Luxury nail care — shaping, polish and treatment for impeccable hands.",
  },
  {
    name: "Pedicure",
    price: "$38",
    duration: "55 min",
    image: "https://images.unsplash.com/photo-1610992015762-45dca7fa3a85",
    description: "Restorative foot care with exfoliation, massage, and signature polish.",
  },
  {
    name: "Spa",
    price: "$75",
    duration: "60 min",
    image: "https://images.unsplash.com/photo-1488345979593-09db0f85545f",
    description: "Aromatherapy facials and full-body relaxation rituals.",
  },
];

export const STYLISTS = ["No preference", "Carlos", "Camille", "Chen", "Diego"];

export const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];
