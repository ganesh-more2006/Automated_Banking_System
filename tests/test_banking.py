import urllib.request
import urllib.error
import json
import sys

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
    print("      AUTOMATED CORE BANKING TEST SUITE           ")
    print("==================================================")

    # 1. Setup: Register two test users
    import uuid
    uid = uuid.uuid4().hex[:6]
    email_a = f"banking_test_a_{uid}@example.com"
    email_b = f"banking_test_b_{uid}@example.com"
    password = "SecurePassword123!"

    print("\n[SETUP] Creating Test User A...")
    status, res = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": email_a, "password": password, "full_name": "User A"}
    )
    if status not in (201, 400):
        print(f"-> FAILED setup for User A: {status}, {res}")
        sys.exit(1)

    print("[SETUP] Creating Test User B...")
    status, res = make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": email_b, "password": password, "full_name": "User B"}
    )
    if status not in (201, 400):
        print(f"-> FAILED setup for User B: {status}, {res}")
        sys.exit(1)

    # Login to acquire tokens
    print("\n[SETUP] Logging in User A...")
    _, res_a = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": email_a, "password": password})
    token_a = res_a["access_token"]

    print("[SETUP] Logging in User B...")
    _, res_b = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": email_b, "password": password})
    token_b = res_b["access_token"]

    print("-> Setup completed. Access tokens acquired.")

    # 2. Test Account Creation
    print("\n[TEST 1] Creating SAVINGS account for User A...")
    status, acc_a = make_request(
        f"{BASE_URL}/banking/accounts",
        method="POST",
        data={"account_type": "SAVINGS", "currency": "USD"},
        token=token_a
    )
    if status == 201:
        print(f"-> PASSED: SAVINGS account created successfully. Number: {acc_a['account_number']}, Balance: {acc_a['balance']}")
    else:
        print(f"-> FAILED to create Account A: {status}, {acc_a}")
        sys.exit(1)

    print("\n[TEST 2] Creating CURRENT account for User B...")
    status, acc_b = make_request(
        f"{BASE_URL}/banking/accounts",
        method="POST",
        data={"account_type": "CURRENT", "currency": "USD"},
        token=token_b
    )
    if status == 201:
        print(f"-> PASSED: CURRENT account created successfully. Number: {acc_b['account_number']}, Balance: {acc_b['balance']}")
    else:
        print(f"-> FAILED to create Account B: {status}, {acc_b}")
        sys.exit(1)

    acc_num_a = acc_a["account_number"]
    acc_num_b = acc_b["account_number"]

    # 3. Test Deposit Functionality
    print("\n[TEST 3] Depositing $1000.00 into Account A...")
    status, tx = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/deposit",
        method="POST",
        data={"amount": 1000.00, "description": "Opening Deposit"},
        token=token_a
    )
    if status == 200:
        print(f"-> PASSED: Deposit successful. Reference: {tx['reference_number']}, Amount: {tx['amount']}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {tx}")
        sys.exit(1)

    # 4. Test Deposit validation (Negative Amount)
    print("\n[TEST 4] Attempting to deposit negative amount...")
    status, err = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/deposit",
        method="POST",
        data={"amount": -50.00},
        token=token_a
    )
    if status == 422:
        print("-> PASSED: Rejected negative deposit (422 Pydantic Validation error).")
    else:
        print(f"-> FAILED: Expected 422, got {status}. Response: {err}")
        sys.exit(1)

    # 5. Test Withdrawal Functionality
    print("\n[TEST 5] Withdrawing $400.00 from Account A...")
    status, tx = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/withdraw",
        method="POST",
        data={"amount": 400.00, "description": "Atm Cash withdrawal"},
        token=token_a
    )
    if status == 200:
        print(f"-> PASSED: Withdrawal successful. Reference: {tx['reference_number']}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {tx}")
        sys.exit(1)

    # 6. Test Withdrawal validation (Overdraft protection check)
    print("\n[TEST 6] Attempting to withdraw more than available balance ($800.00)...")
    status, err = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/withdraw",
        method="POST",
        data={"amount": 800.00},
        token=token_a
    )
    if status == 400:
        print(f"-> PASSED: Withdrawal rejected with 400. Detail: {err.get('detail')}")
    else:
        print(f"-> FAILED: Expected 400, got {status}. Response: {err}")
        sys.exit(1)

    # 7. Test Fund Transfer
    print("\n[TEST 7] Transferring $250.00 from User A (Savings) to User B (Current)...")
    status, tx = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/transfer",
        method="POST",
        data={"receiver_account_number": acc_num_b, "amount": 250.00, "description": "Rent Payment"},
        token=token_a
    )
    if status == 200:
        print(f"-> PASSED: Transfer successful. Reference: {tx['reference_number']}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {tx}")
        sys.exit(1)

    # Check balances after transfer
    print("\n[CHECK] Fetching accounts to verify atomic balance adjustments...")
    _, accounts_a = make_request(f"{BASE_URL}/banking/accounts", token=token_a)
    _, accounts_b = make_request(f"{BASE_URL}/banking/accounts", token=token_b)
    
    bal_a = accounts_a[0]["balance"]
    bal_b = accounts_b[0]["balance"]
    print(f"   Account A balance: {bal_a} (Expected: 350.00)")
    print(f"   Account B balance: {bal_b} (Expected: 250.00)")
    
    if float(bal_a) == 350.00 and float(bal_b) == 250.00:
        print("-> PASSED: Balances are correct and atomic updates succeeded.")
    else:
        print("-> FAILED: Inconsistent balances detected.")
        sys.exit(1)

    # 8. Test Fund Transfer validation (Same accounts rejection)
    print("\n[TEST 8] Attempting transfer to self...")
    status, err = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/transfer",
        method="POST",
        data={"receiver_account_number": acc_num_a, "amount": 100.00},
        token=token_a
    )
    if status == 400:
        print(f"-> PASSED: Self-transfer rejected with 400. Detail: {err.get('detail')}")
    else:
        print(f"-> FAILED: Expected 400, got {status}. Response: {err}")
        sys.exit(1)

    # 9. Test Statement Generation
    print("\n[TEST 9] Fetching account statement for Account A...")
    status, stmt = make_request(
        f"{BASE_URL}/banking/accounts/{acc_num_a}/statement",
        method="GET",
        token=token_a
    )
    if status == 200:
        print(f"-> PASSED: Statement retrieved. Total Inflows: {stmt.get('total_deposits')}, Total Outflows: {stmt.get('total_withdrawals')}")
        print(f"   Total Transactions Recorded: {len(stmt.get('transactions', []))}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {stmt}")
        sys.exit(1)

    print("\n==================================================")
    print("      ALL CORE BANKING TESTS PASSED!              ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
