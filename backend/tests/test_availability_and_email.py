"""Backend tests for availability + email-skip features (iteration 2)."""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cuts-and-care.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Unique-per-run future date so test runs don't collide
TEST_DATE = "2026-04-01"
TEST_TIME = "14:00"
CARLOS = "Carlos"
CAMILLE = "Camille"


def _payload(stylist, name_suffix="A", time_=TEST_TIME, date=TEST_DATE):
    return {
        "name": f"TEST_User_{name_suffix}",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "phone": "5551234567",
        "service": "Haircut",
        "stylist": stylist,
        "date": date,
        "time": time_,
        "notes": "iteration_2 test",
    }


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@candc.com", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def created_ids():
    # Track ids to delete at teardown
    return []


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_token, created_ids):
    yield
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Also delete any TEST_ appointments on TEST_DATE that we created
    r = requests.get(f"{API}/appointments", headers=headers, timeout=15)
    if r.status_code == 200:
        for a in r.json():
            if a.get("date") == TEST_DATE and (a.get("name", "").startswith("TEST_") or a.get("id") in created_ids):
                requests.delete(f"{API}/appointments/{a['id']}", headers=headers, timeout=15)


@pytest.fixture(scope="module", autouse=True)
def precleanup(admin_token):
    """Remove any prior TEST_ rows on TEST_DATE before starting."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.get(f"{API}/appointments", headers=headers, timeout=15)
    if r.status_code == 200:
        for a in r.json():
            if a.get("date") == TEST_DATE:
                requests.delete(f"{API}/appointments/{a['id']}", headers=headers, timeout=15)


# ---------- Availability endpoint ----------
class TestAvailability:
    def test_availability_empty_initial(self):
        r = requests.get(f"{API}/availability", params={"date": TEST_DATE, "stylist": CARLOS}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == TEST_DATE
        assert data["stylist"] == CARLOS
        assert TEST_TIME not in data["booked_times"]
        assert isinstance(data["booked_times"], list)

    def test_availability_no_stylist_param(self):
        r = requests.get(f"{API}/availability", params={"date": TEST_DATE}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["stylist"] is None
        assert "booked_times" in data


# ---------- Booking + conflict ----------
class TestBookingConflict:
    def test_1_first_booking_carlos_succeeds(self, created_ids):
        r = requests.post(f"{API}/appointments", json=_payload(CARLOS, "carlos1"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["stylist"] == CARLOS
        assert data["time"] == TEST_TIME
        assert data["date"] == TEST_DATE
        assert "id" in data
        created_ids.append(data["id"])

    def test_2_conflict_same_stylist_same_time(self):
        r = requests.post(f"{API}/appointments", json=_payload(CARLOS, "carlos2"), timeout=15)
        assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert CARLOS in detail
        assert "already booked" in detail.lower()
        assert TEST_TIME in detail
        assert TEST_DATE in detail

    def test_3_different_stylist_same_time_succeeds(self, created_ids):
        r = requests.post(f"{API}/appointments", json=_payload(CAMILLE, "camille1"), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["stylist"] == CAMILLE
        created_ids.append(data["id"])

    def test_4_no_preference_same_time_succeeds(self, created_ids):
        # 'No preference' on FE is sent as stylist=None
        p = _payload(None, "nopref1")
        r = requests.post(f"{API}/appointments", json=p, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("stylist") is None
        created_ids.append(data["id"])

    def test_5_second_no_preference_same_time_also_succeeds(self, created_ids):
        # No-pref bookings don't lock anyone; another no-pref booking at same slot should also pass
        r = requests.post(f"{API}/appointments", json=_payload(None, "nopref2"), timeout=15)
        assert r.status_code == 200
        created_ids.append(r.json()["id"])

    def test_6_availability_after_booking_shows_time(self):
        r = requests.get(f"{API}/availability", params={"date": TEST_DATE, "stylist": CARLOS}, timeout=15)
        assert r.status_code == 200
        assert TEST_TIME in r.json()["booked_times"]

    def test_7_availability_camille_also_booked(self):
        r = requests.get(f"{API}/availability", params={"date": TEST_DATE, "stylist": CAMILLE}, timeout=15)
        assert r.status_code == 200
        assert TEST_TIME in r.json()["booked_times"]

    def test_8_availability_chen_is_free(self):
        r = requests.get(f"{API}/availability", params={"date": TEST_DATE, "stylist": "Chen"}, timeout=15)
        assert r.status_code == 200
        assert TEST_TIME not in r.json()["booked_times"]


# ---------- Regression: existing flows still pass ----------
class TestRegression:
    def test_root_api(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200
        assert "services" in r.json()

    def test_services(self):
        r = requests.get(f"{API}/services", timeout=15)
        assert r.status_code == 200
        assert r.json()["services"] == ["Haircut", "Manicure", "Pedicure", "Spa"]

    def test_admin_login_good(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@candc.com", "password": "admin123"}, timeout=15)
        assert r.status_code == 200
        assert "token" in r.json()

    def test_admin_login_bad(self):
        r = requests.post(f"{API}/auth/login", json={"email": "admin@candc.com", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_list_requires_auth(self):
        r = requests.get(f"{API}/appointments", timeout=15)
        assert r.status_code == 401

    def test_patch_and_delete(self, admin_token, created_ids):
        # take any created id
        if not created_ids:
            pytest.skip("no created appointment id available")
        headers = {"Authorization": f"Bearer {admin_token}"}
        aid = created_ids[-1]
        r = requests.patch(f"{API}/appointments/{aid}", headers=headers, json={"status": "confirmed"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"


# ---------- Email-skip warning log ----------
class TestEmailSkipLog:
    def test_warning_logged_on_booking(self, created_ids):
        # Trigger one new booking on different time so it succeeds
        r = requests.post(f"{API}/appointments", json=_payload(CARLOS, "log_check", time_="15:30"), timeout=15)
        assert r.status_code == 200, r.text
        created_ids.append(r.json()["id"])
        # Give the asyncio.create_task a moment to execute
        time.sleep(2)
        # Read supervisor backend log
        log_paths = [
            "/var/log/supervisor/backend.err.log",
            "/var/log/supervisor/backend.out.log",
        ]
        found = False
        for p in log_paths:
            if not os.path.exists(p):
                continue
            with open(p, "r") as f:
                # only check the last ~200 lines for speed
                tail = f.readlines()[-400:]
            if any("email skipped" in line and "RESEND_API_KEY" in line for line in tail):
                found = True
                break
        assert found, "Expected '[email skipped — no RESEND_API_KEY]' WARNING in backend logs"
