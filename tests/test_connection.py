import urllib.request
import json
import time
import sys

def verify_connection():
    url = "http://127.0.0.1:8000/api/v1/health"
    max_retries = 5
    retry_delay = 2

    print(f"Connecting to health check endpoint: {url}")
    
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    print("\nConnection Successful!")
                    print(f"Status Code: {response.status}")
                    print(f"Response: {json.dumps(data, indent=2)}")
                    
                    if data.get("status") == "healthy" and data.get("database") == "connected":
                        print("\nDatabase is online and responsive.")
                        print("Verification: PASSED.")
                        sys.exit(0)
                    else:
                        print(f"\nAPI returned sub-optimal state: {data}")
                        sys.exit(1)
        except urllib.error.URLError as e:
            print(f"Attempt {attempt}/{max_retries} failed to connect: {e.reason}")
            if attempt < max_retries:
                time.sleep(retry_delay)
        except Exception as e:
            print(f"Attempt {attempt}/{max_retries} failed with error: {e}")
            if attempt < max_retries:
                time.sleep(retry_delay)
                
    print("\nCould not connect to FastAPI server. Verification: FAILED.")
    sys.exit(1)

if __name__ == "__main__":
    verify_connection()
