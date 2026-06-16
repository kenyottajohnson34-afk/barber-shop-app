# PRD — C&C Barber Shop & Spa

## Problem Statement (verbatim)
"i need a barber shop website name C&C where they can set appointments for service manicure pedicure haircut and spa tenement color scheme green and gold and purple and here a qr code"

## Architecture
- **Frontend:** React (CRA) + Tailwind + shadcn/ui + react-router + sonner
- **Backend:** FastAPI + Motor (MongoDB) + JWT (PyJWT) + bcrypt
- **DB:** MongoDB collections: `users` (admin), `appointments`

## User Personas
- Customer — books appointment from public site/QR
- Admin — manages appointment statuses via dashboard

## Core Requirements
- Marketing site with brand C&C
- 4 services: Haircut, Manicure, Pedicure, Spa
- QR code linking to /book
- Color scheme: deep green base, gold accents, purple highlights
- Booking form with calendar + time slots
- Admin login + dashboard to view/confirm/cancel/delete

## Implemented (2026-06-16)
- Public Home (hero, services, gallery, QR x2, footer/contact)
- Booking page (`/book`) — name/email/phone/service/stylist/date/time/notes
- Admin login (`/admin/login`) — JWT in localStorage
- Admin dashboard (`/admin`) — stats, filter, status updates, delete
- Backend: POST/GET/PATCH/DELETE /api/appointments, /api/auth/login, /api/auth/me
- Seeded admin: admin@candc.com / admin123

## Backlog
- P1: Email confirmation (Resend/SendGrid)
- P1: SMS reminders (Twilio)
- P2: Stylist availability per timeslot (no double-booking)
- P2: Public review wall / Instagram embed
- P2: Service-specific pricing tiers / gift cards
