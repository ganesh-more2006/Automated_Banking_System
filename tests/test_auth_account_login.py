import urllib.request
import urllib.error
import json
import sys
import uuid

BASE_URL = "http://127.0.0.1:8000/api/v1"

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
    print("      AUTOMATED ACCOUNT NUMBER LOGIN TESTS        ")
    print("==================================================")

    uid = uuid.uuid4().hex[:6]
    email = f"acc_login_{uid}@example.com"
    password = "SecurePassword123!"

    # 1. Setup: Register Test User
    print("\n[SETUP] Registering test user...")
    status, res = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": email, "password": password, "full_name": "Account Login User"}
    )
    if status != 201:
        print(f"-> FAILED register user: {status}, {res}")
        sys.exit(1)

    # 2. Setup: Login to get token to open an account
    print("[SETUP] Logging in via email to acquire token...")
    _, res_login = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": email, "password": password})
    token = res_login["access_token"]

    # 3. Setup: Create a bank account
    print("[SETUP] Opening a savings account...")
    status, acc = make_request(
        f"{BASE_URL}/banking/accounts",
        method="POST",
        data={"account_type": "SAVINGS", "currency": "INR", "ifsc_code": "ABCD0123456"},
        token=token
    )
    if status != 201:
        print(f"-> FAILED open account: {status}, {acc}")
        sys.exit(1)
        
    account_number = acc["account_number"]
    print(f"-> Setup completed. Account Number: {account_number}")

    # TEST 1: Login using valid Email + Password
    print("\n[TEST 1] Testing login with valid Email + Password...")
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": email, "password": password}
    )
    if status == 200 and "access_token" in res:
        print("-> PASSED: Email login successful.")
    else:
        print(f"-> FAILED: Email login returned {status}: {res}")
        sys.exit(1)

    # TEST 2: Login using valid Account Number + Password
    print("\n[TEST 2] Testing login with valid Account Number + Password...")
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": account_number, "password": password}
    )
    if status == 200 and "access_token" in res:
        print("-> PASSED: Account Number login successful.")
        acc_token = res["access_token"]
        
        # TEST 8: Verify JWT/session works, protected route works
        print("Verifying JWT session using token from account login...")
        status_me, res_me = make_request(f"{BASE_URL}/auth/me", method="GET", token=acc_token)
        if status_me == 200 and res_me["email"] == email:
            print("-> PASSED: JWT/session verifies customer identity correctly.")
        else:
            print(f"-> FAILED: me info mismatch: {status_me}, {res_me}")
            sys.exit(1)
    else:
        print(f"-> FAILED: Account Number login returned {status}: {res}")
        sys.exit(1)

    # TEST 3: Login with Invalid Email
    print("\n[TEST 3] Testing login with invalid Email...")
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "nonexistent_email_123@example.com", "password": password}
    )
    if status == 401:
        print("-> PASSED: Invalid email login rejected.")
    else:
        print(f"-> FAILED: Expected 401, got {status}: {res}")
        sys.exit(1)

    # TEST 4: Login with Invalid Account Number
    print("\n[TEST 4] Testing login with invalid Account Number...")
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "9999999999", "password": password}
    )
    if status == 401:
        print("-> PASSED: Invalid account number login rejected.")
    else:
        print(f"-> FAILED: Expected 401, got {status}: {res}")
        sys.exit(1)

    # TEST 5: Login with Valid Account Number + Wrong Password
    print("\n[TEST 5] Testing login with valid Account Number + Wrong Password...")
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": account_number, "password": "wrong_password_here"}
    )
    if status == 401:
        print("-> PASSED: Wrong password rejected.")
    else:
        print(f"-> FAILED: Expected 401, got {status}: {res}")
        sys.exit(1)

    # TEST 6: Account Number belonging to another user
    print("\n[TEST 6] Testing cross-account login mapping protection...")
    uid_other = uuid.uuid4().hex[:6]
    email_other = f"other_user_{uid_other}@example.com"
    # Register another user
    status, _ = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": email_other, "password": password, "full_name": "Other User"}
    )
    # Attempt to log in with User A's account number but User B's password (or credentials)
    # If they use the correct account number, password check must match the OWNER'S password hash.
    # If password is correct, they are logged in as the owner, not the guest.
    status, res_login_cross = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": account_number, "password": password} # User A's account number + User A's password
    )
    cross_token = res_login_cross["access_token"]
    status_me, res_me = make_request(f"{BASE_URL}/auth/me", method="GET", token=cross_token)
    if res_me["email"] == email:
        print("-> PASSED: Correctly authenticated the actual owner of the bank account.")
    else:
        print(f"-> FAILED: Cross-authenticated wrong user! Got: {res_me['email']}, expected: {email}")
        sys.exit(1)

    # TEST 7: Admin login
    print("\n[TEST 7] Testing admin login still works...")
    status, res_admin = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "admin@bank.com", "password": "Admin@12345"}
    )
    if status == 200 and "access_token" in res_admin:
        print("-> PASSED: Admin login successful.")
    else:
        print(f"-> FAILED: Admin login returned {status}: {res_admin}")
        sys.exit(1)

    print("\n==================================================")
    print("      ALL ACCOUNT NUMBER LOGIN TESTS PASSED       ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
