from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import uuid
import logging
import asyncio
import bcrypt
import jwt
import resend
from twilio.rest import Client as TwilioClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse, CheckoutStatusResponse,
)
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@candc.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '').strip()
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'C&C Barber Shop <onboarding@resend.dev>')
SHOP_NAME = os.environ.get('SHOP_NAME', 'C&C Barbería & Spa')

TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '').strip()
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '').strip()
TWILIO_FROM_NUMBER = os.environ.get('TWILIO_FROM_NUMBER', '').strip()
ADMIN_PHONE = os.environ.get('ADMIN_PHONE', '').strip()
DEFAULT_COUNTRY_CODE = os.environ.get('DEFAULT_COUNTRY_CODE', '+1')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '').strip()

# Deposit configuration — single source of truth (server-side only, never trusted from client)
DEPOSIT_AMOUNT = 500.0          # 500 pesos
DEPOSIT_CURRENCY = "dop"        # Dominican Peso
MASSAGE_PREFIX = "Masaje"       # All massage services require deposit

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

twilio_client: Optional[TwilioClient] = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as _e:
        logging.getLogger(__name__).error(f"Twilio client init failed: {_e}")

app = FastAPI(title="C&C Barber Shop API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------- Password / JWT helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ---------- Email helpers (Resend) ----------
ACTIVE_STATUSES = ["pending", "confirmed"]

def _email_html(title: str, intro: str, appt: dict) -> str:
    stylist = appt.get("stylist") or "Next available stylist"
    notes_row = (
        f'<tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Notes</td>'
        f'<td style="padding:8px 0;color:#fff;font-size:14px">{appt.get("notes") or "—"}</td></tr>'
    )
    return f"""
    <div style="background:#0a140e;padding:40px 20px;font-family:Helvetica,Arial,sans-serif;color:#fff">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#13261a;border:1px solid rgba(212,175,55,0.25);border-radius:4px">
        <tr><td style="padding:32px 32px 0">
          <div style="color:#d4af37;font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px">{SHOP_NAME}</div>
          <h1 style="font-family:Georgia,serif;font-size:28px;margin:0 0 8px;color:#fff;font-weight:500">{title}</h1>
          <p style="color:#9aa49b;font-size:14px;line-height:1.6;margin:0 0 24px">{intro}</p>
        </td></tr>
        <tr><td style="padding:0 32px 24px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid rgba(255,255,255,0.08)">
            <tr><td style="padding:14px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Service</td>
                <td style="padding:14px 0;color:#d4af37;font-size:16px;font-weight:600">{appt.get("service")}</td></tr>
            <tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Date</td>
                <td style="padding:8px 0;color:#fff;font-size:14px">{appt.get("date")}</td></tr>
            <tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Time</td>
                <td style="padding:8px 0;color:#fff;font-size:14px">{appt.get("time")}</td></tr>
            <tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Stylist</td>
                <td style="padding:8px 0;color:#fff;font-size:14px">{stylist}</td></tr>
            <tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Client</td>
                <td style="padding:8px 0;color:#fff;font-size:14px">{appt.get("name")} · {appt.get("phone")} · {appt.get("email")}</td></tr>
            {notes_row}
            <tr><td style="padding:8px 0;color:#9aa49b;font-size:12px;text-transform:uppercase;letter-spacing:2px">Reference</td>
                <td style="padding:8px 0;color:#9aa49b;font-size:11px;font-family:monospace">{appt.get("id")}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;border-top:1px solid rgba(255,255,255,0.06);padding-top:18px">
          <p style="color:#9aa49b;font-size:12px;line-height:1.6;margin:0">
            Need to reschedule? Reply to this email or call us. Cancellations within 24h may incur a fee.
          </p>
        </td></tr>
      </table>
      <p style="text-align:center;color:#5a665d;font-size:11px;margin-top:16px;letter-spacing:2px;text-transform:uppercase">{SHOP_NAME}</p>
    </div>
    """

def _send_email_sync(to: str, subject: str, html: str) -> Optional[str]:
    if not RESEND_API_KEY:
        logger.warning(f"[email skipped — no RESEND_API_KEY] would have sent to {to}: {subject}")
        return None
    try:
        res = resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        return res.get("id") if isinstance(res, dict) else None
    except Exception as e:
        logger.error(f"Resend send failed to {to}: {e}")
        return None

async def send_booking_emails(appt: dict):
    customer_html = _email_html(
        title=f"See you soon, {appt['name'].split(' ')[0]}.",
        intro=f"Your appointment at {SHOP_NAME} is confirmed. Here are the details — save this email for your records.",
        appt=appt,
    )
    admin_html = _email_html(
        title="New booking received",
        intro=f"A new appointment was just booked. Review in the admin dashboard.",
        appt=appt,
    )
    await asyncio.gather(
        asyncio.to_thread(_send_email_sync, appt["email"], f"Your {appt['service']} at {SHOP_NAME} — {appt['date']} {appt['time']}", customer_html),
        asyncio.to_thread(_send_email_sync, ADMIN_EMAIL, f"New booking: {appt['name']} · {appt['service']} · {appt['date']} {appt['time']}", admin_html),
    )


# ---------- SMS helpers (Twilio) ----------
def normalize_phone(raw: str) -> Optional[str]:
    """Convert various phone formats to E.164. Returns None if cannot."""
    if not raw:
        return None
    s = raw.strip()
    if s.startswith("+"):
        digits = "+" + re.sub(r"\D", "", s[1:])
        return digits if len(digits) >= 8 else None
    digits = re.sub(r"\D", "", s)
    if not digits:
        return None
    if len(digits) == 10:  # US/DR style without country code
        return f"{DEFAULT_COUNTRY_CODE}{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return f"+{digits}"

def _send_sms_sync(to_raw: str, body: str) -> Optional[str]:
    to = normalize_phone(to_raw)
    if not to:
        logger.warning(f"[sms skipped — invalid phone] '{to_raw}'")
        return None
    if not twilio_client or not TWILIO_FROM_NUMBER:
        logger.warning(f"[sms skipped — Twilio not configured] would send to {to}: {body[:60]}…")
        return None
    try:
        msg = twilio_client.messages.create(body=body, from_=TWILIO_FROM_NUMBER, to=to)
        return msg.sid
    except Exception as e:
        logger.error(f"Twilio send failed to {to}: {e}")
        return None

def _customer_sms(appt: dict) -> str:
    first = appt['name'].split(' ')[0]
    stylist = appt.get("stylist") or "Next available stylist"
    return (
        f"Hola {first}! Your {appt['service']} at {SHOP_NAME} is confirmed for "
        f"{appt['date']} at {appt['time']} with {stylist}. "
        f"Need to reschedule? Reply or call. Ref: {appt['id'][:8]}"
    )

def _admin_sms(appt: dict) -> str:
    return (
        f"📅 New booking · {appt['name']} ({appt['phone']}) · "
        f"{appt['service']} · {appt['date']} {appt['time']} "
        f"· stylist: {appt.get('stylist') or 'any'}"
    )

async def send_booking_sms(appt: dict):
    tasks = [asyncio.to_thread(_send_sms_sync, appt["phone"], _customer_sms(appt))]
    if ADMIN_PHONE:
        tasks.append(asyncio.to_thread(_send_sms_sync, ADMIN_PHONE, _admin_sms(appt)))
    await asyncio.gather(*tasks)


# ---------- Models ----------
SERVICES = [
    # Barbería
    "Classic Haircut", "Fade / Taper Fade", "Premium Haircut & Styling",
    "Beard Trim", "Beard Line-Up w/ Razor", "Haircut + Beard Combo",
    "Kids Haircut (Under 12)", "Kids Fade", "Senior Haircut",
    "Shape-Up / Line-Up", "Head Shave", "Hot Towel Shave",
    "Eyebrows", "Hair Wash", "Design / Hair Art", "Hair Coloring",
    "Facial Treatment", "VIP Service — Cut, Beard, Hot Towel & Drink",
    # Uñas
    "Manicura Clásica", "Manicura de Gel", "Set Completo de Acrílico",
    "Relleno de Acrílico", "Pedicura", "Pedicura de Spa", "Pedicura de Gel",
    "Reparación de Uñas", "Diseño de Uñas",
    "Cambio de Esmalte (Manos)", "Cambio de Esmalte (Pies)",
    "Manicura Infantil", "Pedicura Infantil",
    "Manicura + Pedicura (Combo)", "Mani + Spa Pedi Gel (Combo)",
    "Pedicura + Masaje 30 min (Combo)",
    # Masajes
    "Masaje Relajante (30 min)", "Masaje Relajante (60 min)",
    "Masaje de Tejido Profundo (60 min)", "Masaje con Piedras Calientes (60 min)",
    "Masaje de Pies (30 min)", "Masaje de Cuello y Hombros (30 min)",
    "Masaje de Cuerpo Completo (90 min)",
]

class AppointmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)
    service: str
    stylist: Optional[str] = None
    date: str  # ISO date string YYYY-MM-DD
    time: str  # HH:MM
    notes: Optional[str] = ""

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    service: str
    stylist: Optional[str] = None
    date: str
    time: str
    notes: Optional[str] = ""
    status: str = "pending"  # pending | confirmed | cancelled | completed
    reminder_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AppointmentStatusUpdate(BaseModel):
    status: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    email: str
    name: str
    role: str

class SmsRequest(BaseModel):
    message: str = Field(min_length=1, max_length=480)


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "C&C Barber Shop API", "services": SERVICES}

@api_router.get("/services")
async def get_services():
    return {"services": SERVICES}

@api_router.get("/availability")
async def get_availability(date: str, stylist: Optional[str] = None):
    """Return list of booked time slots for a given date.
    If stylist is provided, only that stylist's slots are returned.
    'No preference' bookings are not stylist-locked (don't block other artists)."""
    query = {"date": date, "status": {"$in": ACTIVE_STATUSES}}
    if stylist:
        query["stylist"] = stylist
    docs = await db.appointments.find(query, {"_id": 0, "time": 1, "stylist": 1}).to_list(1000)
    return {"date": date, "stylist": stylist, "booked_times": sorted({d["time"] for d in docs})}

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(payload: AppointmentCreate):
    if payload.service not in SERVICES:
        raise HTTPException(status_code=400, detail=f"Invalid service. Choose one of: {', '.join(SERVICES)}")

    # Availability check: same stylist can't be double-booked at the same date+time
    if payload.stylist:
        conflict = await db.appointments.find_one({
            "stylist": payload.stylist,
            "date": payload.date,
            "time": payload.time,
            "status": {"$in": ACTIVE_STATUSES},
        })
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"{payload.stylist} is already booked at {payload.time} on {payload.date}. Please pick a different time or stylist.",
            )

    appt = Appointment(**payload.model_dump())
    # Massage services require a deposit before confirming
    if deposit_required(appt.service):
        appt_dict = appt.model_dump()
        appt_dict["status"] = "pending_payment"
        appt_dict["deposit_paid"] = False
        appt_dict["deposit_required"] = True
        appt_dict["deposit_amount"] = DEPOSIT_AMOUNT
        appt_dict["deposit_currency"] = DEPOSIT_CURRENCY
        await db.appointments.insert_one(appt_dict)
        logger.info(f"Massage appointment pending deposit: {appt.id} | {appt.service} for {appt.name}")
        # Don't send confirmation emails/SMS yet — wait for payment
        return Appointment(**appt_dict)

    await db.appointments.insert_one(appt.model_dump())
    logger.info(f"New appointment booked: {appt.id} | {appt.service} for {appt.name}")
    # Fire-and-forget notifications (non-blocking)
    asyncio.create_task(send_booking_emails(appt.model_dump()))
    asyncio.create_task(send_booking_sms(appt.model_dump()))
    return appt

@api_router.get("/appointments", response_model=List[Appointment])
async def list_appointments(_: dict = Depends(get_current_admin)):
    docs = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api_router.patch("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, body: AppointmentStatusUpdate, _: dict = Depends(get_current_admin)):
    valid = {"pending", "pending_payment", "confirmed", "cancelled", "completed"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.appointments.find_one_and_update(
        {"id": appointment_id},
        {"$set": {"status": body.status}},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return result

@api_router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, _: dict = Depends(get_current_admin)):
    res = await db.appointments.delete_one({"id": appointment_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"deleted": True}

@api_router.post("/appointments/{appointment_id}/sms")
async def send_appointment_sms(appointment_id: str, body: SmsRequest, _: dict = Depends(get_current_admin)):
    appt = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    sid = await asyncio.to_thread(_send_sms_sync, appt["phone"], body.message)
    sent = sid is not None
    return {
        "sent": sent,
        "sid": sid,
        "to": appt["phone"],
        "twilio_configured": bool(twilio_client and TWILIO_FROM_NUMBER),
    }

@api_router.post("/admin/run-reminders")
async def manual_reminder_run(_: dict = Depends(get_current_admin)):
    """Manually trigger the 24h-reminder job (useful for testing)."""
    await reminder_job()
    return {"ok": True}


# ---------- Payments (Stripe Checkout for booking deposit) ----------
def deposit_required(service: str) -> bool:
    return bool(service) and service.startswith(MASSAGE_PREFIX)

class CheckoutCreateRequest(BaseModel):
    appointment_id: str
    origin_url: str  # e.g. https://yoursite.com — frontend's window.location.origin

@api_router.get("/payments/config")
async def payments_config():
    return {
        "deposit_amount": DEPOSIT_AMOUNT,
        "currency": DEPOSIT_CURRENCY,
        "deposit_required_prefix": MASSAGE_PREFIX,
        "stripe_configured": bool(STRIPE_API_KEY),
    }

@api_router.post("/payments/checkout")
async def create_checkout(payload: CheckoutCreateRequest, http_request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured yet")

    appt = await db.appointments.find_one({"id": payload.appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.get("deposit_paid"):
        raise HTTPException(status_code=400, detail="Deposit already paid for this appointment")

    # Server-side fixed amount (do NOT accept amount from client)
    amount = float(DEPOSIT_AMOUNT)
    currency = DEPOSIT_CURRENCY

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/book/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/book?cancelled=1"

    host_url = str(http_request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    metadata = {
        "appointment_id": appt["id"],
        "customer_email": appt["email"],
        "customer_name": appt["name"],
        "service": appt["service"],
        "kind": "booking_deposit",
    }

    req = CheckoutSessionRequest(
        amount=amount,
        currency=currency,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "appointment_id": appt["id"],
        "email": appt["email"],
        "amount": amount,
        "currency": currency,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, http_request: Request):
    if not STRIPE_API_KEY:
        raise HTTPException(status_code=503, detail="Payments are not configured")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    host_url = str(http_request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    status_resp: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)

    new_status = status_resp.status
    new_payment_status = status_resp.payment_status
    already_paid = tx.get("payment_status") == "paid"

    # Update transaction record
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": new_status,
            "payment_status": new_payment_status,
            "amount_total": status_resp.amount_total,
            "currency_confirmed": status_resp.currency,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    # Only mark appointment as deposit_paid ONCE
    if new_payment_status == "paid" and not already_paid:
        await db.appointments.update_one(
            {"id": tx["appointment_id"]},
            {"$set": {
                "deposit_paid": True,
                "deposit_amount": DEPOSIT_AMOUNT,
                "deposit_currency": DEPOSIT_CURRENCY,
                "deposit_session_id": session_id,
                "status": "confirmed",  # auto-confirm on successful deposit
            }},
        )
        # Now send confirmation notifications (held back until payment success)
        appt_doc = await db.appointments.find_one({"id": tx["appointment_id"]}, {"_id": 0})
        if appt_doc:
            asyncio.create_task(send_booking_emails(appt_doc))
            asyncio.create_task(send_booking_sms(appt_doc))

    return {
        "session_id": session_id,
        "status": new_status,
        "payment_status": new_payment_status,
        "amount_total": status_resp.amount_total,
        "currency": status_resp.currency,
        "appointment_id": tx["appointment_id"],
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_API_KEY:
        return {"received": False}
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    webhook_url = f"{host_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    try:
        event = await stripe_checkout.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Stripe webhook handling failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook")
    if event.session_id and event.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": event.session_id})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "status": "complete",
                          "webhook_event_id": event.event_id,
                          "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await db.appointments.update_one(
                {"id": tx["appointment_id"]},
                {"$set": {"deposit_paid": True, "deposit_amount": DEPOSIT_AMOUNT,
                          "deposit_currency": DEPOSIT_CURRENCY,
                          "deposit_session_id": event.session_id, "status": "confirmed"}},
            )
    return {"received": True}


@api_router.post("/auth/login", response_model=LoginResponse)
async def admin_login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return LoginResponse(token=token, email=user["email"], name=user.get("name", "Admin"), role=user.get("role", "admin"))

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_admin)):
    return user


# ---------- Startup ----------
async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    hashed = hash_password(ADMIN_PASSWORD)
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hashed,
            "name": "C&C Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
        await db.users.update_one({"email": ADMIN_EMAIL.lower()}, {"$set": {"password_hash": hashed}})
        logger.info("Updated admin password from .env")

async def reminder_job():
    """Runs periodically. Sends a 24h-before SMS reminder to any active appointment
    whose start time falls within ~21-27h from now and that hasn't been reminded yet."""
    try:
        now = datetime.now(timezone.utc)
        # Look at next ~30h window of appointments
        candidates = await db.appointments.find(
            {
                "status": {"$in": ACTIVE_STATUSES},
                "reminder_sent": {"$ne": True},
                "date": {
                    "$gte": now.strftime("%Y-%m-%d"),
                    "$lte": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
                },
            },
            {"_id": 0},
        ).to_list(500)

        sent_count = 0
        for a in candidates:
            try:
                # Local naive datetime of appointment (treat as UTC for simplicity — adjust if you want shop tz)
                appt_dt = datetime.strptime(f"{a['date']} {a['time']}", "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc)
                delta_hours = (appt_dt - now).total_seconds() / 3600.0
                if 21 <= delta_hours <= 27:
                    msg = (
                        f"Hola {a['name'].split(' ')[0]}! Reminder: your {a['service']} at {SHOP_NAME} "
                        f"is tomorrow ({a['date']}) at {a['time']}. "
                        f"Reply CONFIRM to confirm, or call us to reschedule. Ref: {a['id'][:8]}"
                    )
                    sid = await asyncio.to_thread(_send_sms_sync, a["phone"], msg)
                    await db.appointments.update_one(
                        {"id": a["id"]},
                        {"$set": {
                            "reminder_sent": True,
                            "reminder_sent_at": now.isoformat(),
                            "reminder_sid": sid,
                        }},
                    )
                    sent_count += 1
            except Exception as e:
                logger.error(f"Reminder failed for {a.get('id')}: {e}")
        if sent_count:
            logger.info(f"Reminder job: sent {sent_count} reminders")
    except Exception as e:
        logger.error(f"Reminder job crashed: {e}")


scheduler: Optional[AsyncIOScheduler] = None

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.appointments.create_index("created_at")
    await db.appointments.create_index([("date", 1), ("time", 1)])
    await seed_admin()
    # Schedule the reminder job to run every 30 minutes
    global scheduler
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(reminder_job, "interval", minutes=30, id="reminder_job", next_run_time=datetime.now(timezone.utc) + timedelta(seconds=20))
    scheduler.start()
    logger.info("Reminder scheduler started (every 30 min)")

@app.on_event("shutdown")
async def shutdown_db_client():
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
