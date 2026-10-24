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

def test_notifications():
    print("==================================================")
    print("      TESTING NOTIFICATIONS ENDPOINTS             ")
    print("==================================================")
    
    # 1. Login as admin to get token
    status, res = make_request(
        f"{BASE_URL}/auth/login",
        method="POST",
        data={"email": "admin@apex.com", "password": "AdminSecurePassword123!"}
    )
    if status != 200:
        print(f"Failed to login: {status}, {res}")
        sys.exit(1)
        
    token = res["access_token"]
    print("Logged in successfully. Token acquired.")
    
    # 2. Test GET /notifications
    print("\n[TEST 2] Fetching notifications (GET /notifications)...")
    status, res = make_request(f"{BASE_URL}/notifications", token=token)
    print(f"Status: {status}, Response: {res}")
    
    # 3. Test PUT /notifications/read-all
    print("\n[TEST 3] Marking all read (PUT /notifications/read-all)...")
    status, res = make_request(f"{BASE_URL}/notifications/read-all", method="PUT", token=token)
    print(f"Status: {status}, Response: {res}")

if __name__ == "__main__":
    test_notifications()
