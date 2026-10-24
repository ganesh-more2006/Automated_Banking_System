import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User

def check_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Total Users in DB: {len(users)}")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role.value if u.role else 'None'} | Active: {u.is_active} | Hash: {u.hashed_password[:30]}...")
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
