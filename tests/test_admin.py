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
    print("      AUTOMATED ADMIN API SECURITY TEST SUITE     ")
    print("==================================================")

    # 1. Setup: Create a customer user to acquire token
    cust_email = "admin_test_cust@example.com"
    password = "SecurePassword123!"

    print("\n[SETUP] Registering customer user...")
    make_request(
        f"{BASE_URL}/auth/register",
        method="POST",
        data={"email": cust_email, "password": password, "full_name": "Test Customer"}
    )
    
    print("[SETUP] Logging in Customer...")
    _, res_c = make_request(f"{BASE_URL}/auth/login", method="POST", data={"email": cust_email, "password": password})
    cust_token = res_c["access_token"]

    print("[SETUP] Logging in Admin...")
    status, res_a = make_request(
        f"{BASE_URL}/auth/login", 
        method="POST", 
        data={"email": "admin@bank.com", "password": "Admin@12345"}
    )
    if status != 200:
        print(f"-> FAILED Admin login setup: {status}, {res_a}. Please confirm database is initialized.")
        sys.exit(1)
    admin_token = res_a["access_token"]

    print("-> Setup completed. Customer & Admin tokens acquired.")

    # 2. Test unauthorized stats access (no token)
    print("\n[TEST 1] Fetching admin stats without authentication...")
    status, res = make_request(f"{BASE_URL}/admin/stats")
    if status == 401:
        print("-> PASSED: Access rejected with 401 Unauthorized.")
    else:
        print(f"-> FAILED: Expected 401, got {status}. Response: {res}")
        sys.exit(1)

    # 3. Test customer stats access (forbidden role)
    print("\n[TEST 2] Fetching admin stats as CUSTOMER...")
    status, res = make_request(f"{BASE_URL}/admin/stats", token=cust_token)
    if status == 403:
        print(f"-> PASSED: Access rejected with 403 Forbidden. Detail: {res.get('detail')}")
    else:
        print(f"-> FAILED: Expected 403, got {status}. Response: {res}")
        sys.exit(1)

    # 4. Test admin stats access (allowed role)
    print("\n[TEST 3] Fetching admin stats as ADMIN...")
    status, res = make_request(f"{BASE_URL}/admin/stats", token=admin_token)
    if status == 200:
        print("-> PASSED: Access granted (200 OK). KPIs loaded successfully.")
        print(f"   Total Customers count: {res.get('kpis', {}).get('total_customers')}")
        print(f"   Total Accounts count: {res.get('kpis', {}).get('total_accounts')}")
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    # 5. Test fetching customer list
    print("\n[TEST 4] Retrieving customer list as ADMIN...")
    status, users = make_request(f"{BASE_URL}/admin/users", token=admin_token)
    if status == 200 and isinstance(users, list):
        print(f"-> PASSED: Retrieved list containing {len(users)} users.")
        # Find user ID for KYC test
        test_cust = next((u for u in users if u["email"] == cust_email), None)
        if test_cust:
            cust_id = test_cust["id"]
            print(f"   Selected Test Customer ID: #{cust_id}")
        else:
            print("-> FAILED: Test customer email not found in lists.")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {users}")
        sys.exit(1)

    # 6. Test updating customer KYC status
    print("\n[TEST 5] Updating customer KYC to APPROVED as ADMIN...")
    status, res = make_request(
        f"{BASE_URL}/admin/users/{cust_id}/kyc",
        method="PUT",
        data={"kyc_status": "APPROVED"},
        token=admin_token
    )
    if status == 200:
        print(f"-> PASSED: Updated KYC status successfully. Current KYC: {res.get('profile', {}).get('kyc_status')}")
        if res.get("profile", {}).get("kyc_status") == "APPROVED":
            print("-> Verification: PASSED.")
        else:
            print("-> FAILED: KYC status value in response is not APPROVED.")
            sys.exit(1)
    else:
        print(f"-> FAILED: Expected 200, got {status}. Response: {res}")
        sys.exit(1)

    print("\n==================================================")
    print("      ALL ADMIN API SECURITY TESTS PASSED!        ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
