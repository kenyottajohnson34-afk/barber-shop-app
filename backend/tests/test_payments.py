"""Backend tests for Stripe deposit payment flow (Iteration 3)"""
import os
import pytest
import requests
from datetime import datetime, timedelta
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cuts-and-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

ADMIN_EMAIL = "admin@candc.com"
ADMIN_PASSWORD = "admin123"


def _future_date():
    """Return a future date (>=2026-07-01), avoiding Mondays (weekday()==0)."""
    d = datetime(2026, 7, 1)
    # Loop until a non-Monday
    while d.weekday() == 0:
        d += timedelta(days=1)
    # Add a small offset to avoid collision across re-runs
    d += timedelta(days=5)
    while d.weekday() == 0:
        d += timedelta(days=1)
    return d.strftime("%Y-%m-%d")


@pytest.fixture(scope="module")
def db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(autouse=True, scope="module")
def cleanup(db):
    yield
    db.appointments.delete_many({"name": {"$regex": "^TEST_"}})
    db.payment_transactions.delete_many({"metadata.customer_name": {"$regex": "^TEST_"}})


# ---------- /api/payments/config ----------
def test_payments_config(session):
    r = session.get(f"{API}/payments/config")
    assert r.status_code == 200
    data = r.json()
    assert data["deposit_amount"] == 500
    assert data["currency"] == "dop"
    assert data["stripe_configured"] is True
    assert data["deposit_required_prefix"] == "Masaje"


# ---------- Massage booking goes to pending_payment ----------
def test_massage_booking_is_pending_payment(session):
    payload = {
        "name": "TEST_Massage User",
        "email": "test_massage@example.com",
        "phone": "+18095551234",
        "service": "Masaje Relajante (60 min)",
        "date": _future_date(),
        "time": "11:30",
        "notes": "test",
    }
    r = session.post(f"{API}/appointments", json=payload)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert data["status"] == "pending_payment"
    # The Appointment Pydantic model only includes some fields, but server stores deposit_required=True.
    # Verify via DB
    return data["id"]


def test_massage_db_has_deposit_required(db, session):
    appt_id = test_massage_booking_is_pending_payment(session)
    doc = db.appointments.find_one({"id": appt_id})
    assert doc is not None
    assert doc["status"] == "pending_payment"
    assert doc.get("deposit_required") is True
    assert doc.get("deposit_paid") is False
    assert doc.get("deposit_amount") == 500.0
    assert doc.get("deposit_currency") == "dop"


# ---------- Non-massage booking confirms immediately ----------
def test_haircut_booking_pending_status(session):
    payload = {
        "name": "TEST_Haircut User",
        "email": "test_haircut@example.com",
        "phone": "+18095551235",
        "service": "Classic Haircut",
        "date": _future_date(),
        "time": "12:30",
        "notes": "",
    }
    r = session.post(f"{API}/appointments", json=payload)
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert data["status"] == "pending"


# ---------- /api/payments/checkout ----------
def test_create_checkout_for_massage(session, db):
    # Create a fresh massage appointment
    payload = {
        "name": "TEST_Checkout User",
        "email": "test_checkout@example.com",
        "phone": "+18095551236",
        "service": "Masaje de Pies (30 min)",
        "date": _future_date(),
        "time": "13:00",
    }
    r = session.post(f"{API}/appointments", json=payload)
    assert r.status_code == 200
    appt_id = r.json()["id"]

    r = session.post(f"{API}/payments/checkout", json={
        "appointment_id": appt_id,
        "origin_url": BASE_URL,
    })
    assert r.status_code == 200, f"{r.status_code} {r.text}"
    data = r.json()
    assert "url" in data and "session_id" in data
    assert data["url"].startswith("https://checkout.stripe.com/")
    # DB row created
    tx = db.payment_transactions.find_one({"session_id": data["session_id"]})
    assert tx is not None
    assert tx["status"] == "initiated"
    assert tx["appointment_id"] == appt_id
    assert tx["amount"] == 500.0
    assert tx["currency"] == "dop"
    return appt_id, data["session_id"]


def test_payment_status_returns_200(session):
    appt_id, session_id = test_create_checkout_for_massage(session, MongoClient(MONGO_URL)[DB_NAME])
    r = session.get(f"{API}/payments/status/{session_id}")
    assert r.status_code == 200
    data = r.json()
    assert data["session_id"] == session_id
    assert "status" in data
    assert "payment_status" in data
    assert data["appointment_id"] == appt_id


def test_checkout_nonexistent_appointment(session):
    r = session.post(f"{API}/payments/checkout", json={
        "appointment_id": "nonexistent-id-12345",
        "origin_url": BASE_URL,
    })
    assert r.status_code == 404


def test_checkout_deposit_already_paid(session, db):
    # Create a massage appt, mark deposit_paid manually, second checkout returns 400
    payload = {
        "name": "TEST_AlreadyPaid User",
        "email": "test_already@example.com",
        "phone": "+18095551237",
        "service": "Masaje Relajante (30 min)",
        "date": _future_date(),
        "time": "14:30",
    }
    r = session.post(f"{API}/appointments", json=payload)
    assert r.status_code == 200
    appt_id = r.json()["id"]
    db.appointments.update_one({"id": appt_id}, {"$set": {"deposit_paid": True}})

    r = session.post(f"{API}/payments/checkout", json={
        "appointment_id": appt_id,
        "origin_url": BASE_URL,
    })
    assert r.status_code == 400
    assert "already paid" in r.json()["detail"].lower()


# ---------- Regression: admin endpoints require JWT ----------
def test_admin_appointments_requires_auth(session):
    r = session.get(f"{API}/appointments")
    assert r.status_code in (401, 403)


def test_admin_appointments_with_jwt(session, admin_token):
    r = session.get(f"{API}/appointments", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_services_endpoint(session):
    r = session.get(f"{API}/services")
    assert r.status_code == 200
    services = r.json()["services"]
    assert "Classic Haircut" in services
    assert "Masaje Relajante (60 min)" in services
