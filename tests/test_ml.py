import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def make_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json"}
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

def test_ml_health():
    print("==================================================")
    print("      TESTING ML HEALTH ENDPOINT                  ")
    print("==================================================")
    
    status, res = make_request(f"{BASE_URL}/ml/health")
    print(f"Status: {status}")
    print(f"Response: {res}")
    
    if status == 200:
        print("ML Health Check: PASSED.")
    else:
        print("ML Health Check: FAILED.")
        sys.exit(1)

if __name__ == "__main__":
    test_ml_health()
