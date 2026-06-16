from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
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


# ---------- Models ----------
SERVICES = ["Haircut", "Manicure", "Pedicure", "Spa"]

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


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "C&C Barber Shop API", "services": SERVICES}

@api_router.get("/services")
async def get_services():
    return {"services": SERVICES}

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(payload: AppointmentCreate):
    if payload.service not in SERVICES:
        raise HTTPException(status_code=400, detail=f"Invalid service. Choose one of: {', '.join(SERVICES)}")
    appt = Appointment(**payload.model_dump())
    await db.appointments.insert_one(appt.model_dump())
    logger.info(f"New appointment booked: {appt.id} | {appt.service} for {appt.name}")
    return appt

@api_router.get("/appointments", response_model=List[Appointment])
async def list_appointments(_: dict = Depends(get_current_admin)):
    docs = await db.appointments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@api_router.patch("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, body: AppointmentStatusUpdate, _: dict = Depends(get_current_admin)):
    valid = {"pending", "confirmed", "cancelled", "completed"}
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

@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.appointments.create_index("created_at")
    await seed_admin()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
