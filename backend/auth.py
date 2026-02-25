"""Authentication and authorization utilities."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from models import User, get_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days (extended from 7 days for better UX)

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"✅ [AUTH] Token created for user_id: {data.get('sub')}, expires: {expire}")
    print(f"✅ [AUTH] SECRET_KEY (first 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'None'}...")
    return encoded_jwt


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            print(f"❌ [AUTH] Token missing 'sub' field. Payload: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Convert string user_id to int for database lookup
        # JWT 'sub' field must be a string, but we need int for database
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            print(f"❌ [AUTH] Invalid user_id format in token: {user_id_str} (type: {type(user_id_str)})")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID format in token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        print(f"✅ [AUTH] Token verified for user_id: {user_id}")
        return user_id
    except JWTError as e:
        print(f"❌ [AUTH] JWT decode error: {str(e)}")
        print(f"❌ [AUTH] Token (first 20 chars): {token[:20] if token else 'None'}...")
        print(f"❌ [AUTH] SECRET_KEY (first 10 chars): {SECRET_KEY[:10] if SECRET_KEY else 'None'}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    user_id: int = Depends(verify_token),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user."""
    # user_id comes from verify_token which extracts it from JWT sub field
    # Since we store it as string in JWT, we need to convert back to int
    if isinstance(user_id, str):
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user ID in token"
            )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current user and verify admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def verify_google_token(token: str) -> dict:
    """Verify Google OAuth ID token and return user info with retry logic for SSL errors."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        import time
        import ssl
        from urllib3.exceptions import SSLError as Urllib3SSLError
        
        GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
        if not GOOGLE_CLIENT_ID:
            error_msg = "GOOGLE_CLIENT_ID not set in environment"
            print(f"❌ [AUTH] {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_msg
            )
        
        print(f"🟡 [AUTH] Verifying token with client ID: {GOOGLE_CLIENT_ID[:20]}...")
        print(f"🟡 [AUTH] Token length: {len(token) if token else 0}")
        
        # Retry logic for SSL errors (intermittent network issues)
        max_retries = 3
        retry_delay = 1  # Start with 1 second
        idinfo = None
        
        for attempt in range(max_retries):
            try:
                # Verify the ID token
                idinfo = id_token.verify_oauth2_token(
                    token, requests.Request(), GOOGLE_CLIENT_ID
                )
                print(f"✅ [AUTH] Token verified successfully, issuer: {idinfo.get('iss')}")
                break  # Success, exit retry loop
            except ValueError as e:
                # Token verification failed (non-SSL error) - don't retry
                error_msg = str(e)
                print(f"❌ [AUTH] Token verification failed: {error_msg}")
                # Check for common errors
                if "Token expired" in error_msg or "expired" in error_msg.lower():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token has expired. Please log in again."
                    )
                elif "Invalid token" in error_msg or "invalid" in error_msg.lower():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token. Please log in again."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=f"Token verification failed: {error_msg}"
                    )
            except (ssl.SSLError, Urllib3SSLError, OSError) as e:
                # Check if it's an SSL EOF error or similar network issue
                error_str = str(e).lower()
                is_ssl_error = (
                    "ssl" in error_str or 
                    "eof" in error_str or 
                    "unexpected_eof" in error_str or
                    "connection" in error_str
                )
                
                if is_ssl_error and attempt < max_retries - 1:
                    # Retry with exponential backoff
                    wait_time = retry_delay * (2 ** attempt)
                    print(f"⚠️ [AUTH] SSL/Network error (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    print(f"🔄 [AUTH] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    # Last attempt failed or non-retryable error
                    error_msg = f"SSL/Network error during token verification: {str(e)}"
                    print(f"❌ [AUTH] {error_msg}")
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Unable to verify token due to network error. Please try again."
                    )
            except Exception as e:
                # Check if it's an HTTPException (already handled)
                if isinstance(e, HTTPException):
                    raise
                # Other unexpected errors
                error_msg = str(e)
                error_str = error_msg.lower()
                # Check if it's an SSL/network error that wasn't caught above
                is_ssl_error = (
                    "ssl" in error_str or 
                    "eof" in error_str or 
                    "unexpected_eof" in error_str or
                    "connection" in error_str
                )
                
                if is_ssl_error and attempt < max_retries - 1:
                    # Retry with exponential backoff
                    wait_time = retry_delay * (2 ** attempt)
                    print(f"⚠️ [AUTH] Network error (attempt {attempt + 1}/{max_retries}): {error_msg}")
                    print(f"🔄 [AUTH] Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
                else:
                    print(f"❌ [AUTH] Unexpected error during token verification: {error_msg}")
                    import traceback
                    print(traceback.format_exc())
                    if is_ssl_error:
                        raise HTTPException(
                            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Unable to verify token due to network error. Please try again."
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=f"Token verification error: {error_msg}"
                        )
        
        # If we exhausted retries without success
        if idinfo is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify token after multiple attempts. Please try again."
            )
        
        # Verify issuer
        if idinfo.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
            print(f"Wrong issuer: {idinfo.get('iss')}")
            raise ValueError('Wrong issuer.')
        
        # Ensure required fields are present
        if 'sub' not in idinfo or 'email' not in idinfo:
            print(f"Missing required fields. Available: {list(idinfo.keys())}")
            raise ValueError('Missing required token fields.')
        
        user_info = {
            "google_id": idinfo['sub'],
            "email": idinfo['email'],
            "name": idinfo.get('name', idinfo.get('email', '').split('@')[0]),
            "avatar_url": idinfo.get('picture', '')
        }
        print(f"User info extracted: {user_info.get('email')}")
        return user_info
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in verify_google_token: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}"
        )

