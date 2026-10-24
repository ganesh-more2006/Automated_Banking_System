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
    print("      AUTOMATED TRANSACTION PIN VERIFICATION      ")
    print("==================================================")

    uid = uuid.uuid4().hex[:6]
    email = f"pin_test_{uid}@example.com"
    password = "SecurePassword123!"
    pin = "123456"
    wrong_pin = "999999"

    # 1. Setup: Register Test User
    print("\n[SETUP] Registering test user...")
    status, _ = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": email, "password": password, "full_name": "PIN Test User"}
    )
    if status != 201:
        print(f"-> FAILED register user: {status}")
        sys.exit(1)

    # Acquire token
    print("[SETUP] Logging in to acquire token...")
    _, res_login = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": email, "password": password})
    token = res_login["access_token"]

    # Open account
    print("[SETUP] Opening a savings account...")
    status, acc = make_request(
        f"{BASE_URL}/banking/accounts",
        method="POST",
        data={"account_type": "SAVINGS", "currency": "INR", "ifsc_code": "APEX0000123"},
        token=token
    )
    if status != 201:
        print(f"-> FAILED open account: {status}, {acc}")
        sys.exit(1)
        
    acc_num = acc["account_number"]
    print(f"-> Account opened: {acc_num}")

    # TEST 1: Deposit before setting PIN (should return 400 Bad Request)
    print("\n[TEST 1] Testing deposit without setting PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/deposit",
        method="POST",
        data={"amount": 1000.00, "description": "Deposit", "pin": pin},
        token=token
    )
    if status == 400 and "not been set" in res["detail"].lower():
        print("-> PASSED: Deposit rejected because PIN has not been configured.")
    else:
        print(f"-> FAILED: Expected 400, got {status}: {res}")
        sys.exit(1)

    # TEST 2: Setting Transaction PIN successfully
    print("\n[TEST 2] Configuring transaction PIN...")
    status, res = make_request(
        f"{BASE_URL}/auth/set-pin",
        method="POST",
        data={"pin": pin, "confirm_pin": pin},
        token=token
    )
    if status == 200:
        print("-> PASSED: Transaction PIN successfully configured.")
    else:
        print(f"-> FAILED: Expected 200, got {status}: {res}")
        sys.exit(1)

    # TEST 3: Deposit with Wrong PIN (should return 401 Unauthorized, balance unchanged)
    print("\n[TEST 3] Testing deposit with incorrect PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/deposit",
        method="POST",
        data={"amount": 1000.00, "description": "Deposit", "pin": wrong_pin},
        token=token
    )
    if status == 401 and "incorrect transaction pin" in res["detail"].lower():
        print("-> PASSED: Deposit with wrong PIN rejected.")
        # Verify balance unchanged
        _, acc_info = make_request(f"{BASE_URL}/banking/accounts", method="GET", token=token)
        if float(acc_info[0]["balance"]) == 0.0:
            print("-> PASSED: Account balance remains 0.00.")
        else:
            print(f"-> FAILED: Balance updated despite wrong PIN! Balance: {acc_info[0]['balance']}")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 401, got {status}: {res}")
        sys.exit(1)

    # TEST 4: Deposit with Correct PIN (should succeed)
    print("\n[TEST 4] Testing deposit with correct PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/deposit",
        method="POST",
        data={"amount": 1000.00, "description": "Deposit", "pin": pin},
        token=token
    )
    if status == 200:
        print("-> PASSED: Deposit completed successfully.")
        # Verify balance is now 1000.00
        _, acc_info = make_request(f"{BASE_URL}/banking/accounts", method="GET", token=token)
        if float(acc_info[0]["balance"]) == 1000.0:
            print("-> PASSED: Account balance updated to 1000.00.")
        else:
            print(f"-> FAILED: Balance incorrect: {acc_info[0]['balance']}")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 200, got {status}: {res}")
        sys.exit(1)

    # TEST 5: Withdrawal with Wrong PIN (should be rejected, balance unchanged)
    print("\n[TEST 5] Testing withdrawal with incorrect PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/withdraw",
        method="POST",
        data={"amount": 200.00, "description": "Withdrawal", "pin": wrong_pin},
        token=token
    )
    if status == 401 and "incorrect transaction pin" in res["detail"].lower():
        print("-> PASSED: Withdrawal with wrong PIN rejected.")
        # Verify balance remains 1000.00
        _, acc_info = make_request(f"{BASE_URL}/banking/accounts", method="GET", token=token)
        if float(acc_info[0]["balance"]) == 1000.0:
            print("-> PASSED: Account balance remains 1000.00.")
        else:
            print(f"-> FAILED: Balance updated: {acc_info[0]['balance']}")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 401, got {status}: {res}")
        sys.exit(1)

    # TEST 6: Withdrawal with Correct PIN (should succeed)
    print("\n[TEST 6] Testing withdrawal with correct PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/withdraw",
        method="POST",
        data={"amount": 200.00, "description": "Withdrawal", "pin": pin},
        token=token
    )
    if status == 200:
        print("-> PASSED: Withdrawal completed successfully.")
        # Verify balance is now 800.00
        _, acc_info = make_request(f"{BASE_URL}/banking/accounts", method="GET", token=token)
        if float(acc_info[0]["balance"]) == 800.0:
            print("-> PASSED: Account balance updated to 800.00.")
        else:
            print(f"-> FAILED: Balance incorrect: {acc_info[0]['balance']}")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 200, got {status}: {res}")
        sys.exit(1)

    # TEST 7: Withdrawal with Insufficient Balance and Correct PIN (should return existing balance error)
    print("\n[TEST 7] Testing withdrawal with insufficient balance + correct PIN...")
    status, res = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num}/withdraw",
        method="POST",
        data={"amount": 5000.00, "description": "Large Withdrawal", "pin": pin},
        token=token
    )
    if status == 400 and "insufficient funds" in res["detail"].lower():
        print("-> PASSED: Insufficient balance rejected with correct error message.")
    else:
        print(f"-> FAILED: Expected 400, got {status}: {res}")
        sys.exit(1)

    print("\n==================================================")
    print("      ALL TRANSACTION PIN TESTS PASSED           ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
