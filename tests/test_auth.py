import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1/auth"

def make_request(url, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode("utf-8"))
        except Exception:
            err_body = e.reason
        return e.code, err_body
    except Exception as e:
        return 500, str(e)

def run_tests():
    print("==================================================")
    print("   AUTOMATED AUTH & CUSTOMER SYSTEM TEST SUITE    ")
    print("==================================================")

    # Test parameters
    import uuid
    unique_email = f"customer_{uuid.uuid4().hex[:6]}@example.com"
    valid_password = "SecurePassword123!"
    weak_password = "weak"
    
    # 1. Test registration with invalid (weak) password
    print("\n[TEST 1] Registering with weak password...")
    status, res = make_request(
        f"{BASE_URL}/register",
        method="POST",
        data={
            "email": unique_email,
            "password": weak_password,
            "full_name": "Test Customer"
        }
    )
    if status == 422:
        print("-> PASSED: Registration rejected for weak password (422 Pydantic Validation error).")
    else:
        print(f"-> FAILED: Expected 422, got {status}. Response: {res}")
        sys.exit(1)

    # 2. Test successful customer registration
    print("\n[TEST 2] Registering customer with valid credentials...")
    status, res = make_request(
        f"{BASE_URL}/register",
        method="POST",
        data={
            "email": unique_email,
            "password": valid_password,
            "full_name": "Test Customer",
            "phone": "+1 555-987-6543",
            "date_of_birth": "1990-05-15",
            "address": "123 Main St, Springfield",
            "pan_kyc_identifier": "ABCDE1234F"
        }
    )
    if status == 201:
        print("-> PASSED: Registered successfully (201 Created).")
        print(f"   User Email: {res.get('email')}, Role: {res.get('role')}")
        print(f"   Profile Full Name: {res.get('profile', {}).get('full_name')}")
    else:
        print(f"-> FAILED: Expected 201, got {status}. Response: {res}")
        sys.exit(1)

    # 3. Test duplicate email registration
    print("\n[TEST 3] Registering duplicate email...")
    status, res = make_request(
        f"{BASE_URL}/register",
        method="POST",
        data={
            "email": unique_email,
            "password": valid_password,
            "full_name": "Another Test"
        }
    )
    if status == 400:
        print("-> PASSED: Rejected duplicate registration (400 Bad Request).")
        print(f"   Detail: {res.get('detail')}")
    else:
        print(f"-> FAILED: Expected 400, got {status}. Response: {res}")
        sys.exit(1)

    # 4. Test login with incorrect credentials
    print("\n[TEST 4] Logging in with incorrect password...")
    status, res = make_request(
        f"{BASE_URL}/login",
        method="POST",
        data={
            "email": unique_email,
            "password": "wrongpassword"
        }
    )
    if status == 401:
        print("-> PASSED: Login rejected for incorrect credentials (401 Unauthorized).")
    else:
        print(f"-> FAILED: Expected 401, got {status}. Response: {res}")
        sys.exit(1)

    # 5. Test successful login
    print("\n[TEST 5] Logging in with correct credentials...")
    status, res = make_request(
        f"{BASE_URL}/login",
        method="POST",
        data={
            "email": unique_email,
            "password": valid_password
        }
    )
    customer_token = None
    if status == 200 and "access_token" in res:
        customer_token = res["access_token"]
        print("-> PASSED: Login successful (200 OK). Access token issued.")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    # 6. Test protected endpoint (/me)
    print("\n[TEST 6] Accessing protected route (/me) with valid token...")
    status, res = make_request(
        f"{BASE_URL}/me",
        method="GET",
        token=customer_token
    )
    if status == 200:
        print("-> PASSED: Protected route accessed successfully (200 OK).")
        print(f"   Retrieved user email: {res.get('email')}, role: {res.get('role')}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    # 7. Test role restrictions: Customer accessing Admin route
    print("\n[TEST 7] Accessing admin-only endpoint as CUSTOMER...")
    status, res = make_request(
        f"{BASE_URL}/admin-only",
        method="GET",
        token=customer_token
    )
    if status == 403:
        print("-> PASSED: Access rejected with 403 Forbidden.")
        print(f"   Detail: {res.get('detail')}")
    else:
        print(f"-> FAILED: Expected 403, got {status}. Response: {res}")
        sys.exit(1)

    # 8. Test Admin login and Admin accessing Admin route
    print("\n[TEST 8] Logging in with seeded ADMIN credentials...")
    status, res = make_request(
        f"{BASE_URL}/login",
        method="POST",
        data={
            "email": "admin@apex.com",
            "password": "AdminSecurePassword123!"
        }
    )
    admin_token = None
    if status == 200 and "access_token" in res:
        admin_token = res["access_token"]
        print("-> PASSED: Admin login successful. Token retrieved.")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    print("\n[TEST 9] Accessing admin-only endpoint as ADMIN...")
    status, res = make_request(
        f"{BASE_URL}/admin-only",
        method="GET",
        token=admin_token
    )
    if status == 200:
        print("-> PASSED: Access granted (200 OK).")
        print(f"   Server message: {res.get('message')}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    print("\n==================================================")
    print("   ALL AUTH & ROLE TESTS COMPLETED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
