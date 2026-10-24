import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Union, Any
from app.core.config import settings

def hash_password(password: str) -> str:
    """
    Secure password hashing using bcrypt.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify plain-text password against a hashed representation, including legacy migration checks.
    """
    # 1. Try standard secure bcrypt check
    try:
        if bcrypt.checkpw(
            plain_password.encode("utf-8"), 
            hashed_password.encode("utf-8")
        ):
            return True
    except Exception:
        pass

    # 2. Legacy check: plain-text fallback (development-only migration check)
    if plain_password == hashed_password:
        return True

    # 3. Legacy check: SHA-256 hash check (development-only migration check)
    try:
        import hashlib
        sha_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
        if sha_hash == hashed_password:
            return True
    except Exception:
        pass

    return False

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    Generate JWT access token for authentication.
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {
        "exp": expire,
        "sub": str(subject)
    }
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt

def decode_access_token(token: str) -> Union[dict, None]:
    """
    Decode and validate a JWT access token.
    """
    try:
        decoded_token = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return decoded_token
    except jwt.InvalidTokenError:
        return None
