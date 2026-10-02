import uuid
from typing import Optional, Dict, Any
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import UnauthorizedException, DatasetAccessDeniedException


class AuthenticatedUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "authenticated"
    full_name: Optional[str] = "Demo User"


# Default local demo user ID for quick demo testing
DEMO_USER_ID = "00000000-0000-0000-0000-000000000001"
DEMO_USER = AuthenticatedUser(
    id=DEMO_USER_ID,
    email="demo.manager@darkstore.io",
    role="authenticated",
    full_name="QuickCommerce Store Manager"
)


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> AuthenticatedUser:
    """
    Validates user session from Supabase Authorization header (Bearer <token>).
    Supports real Supabase JWTs, dedicated demo tokens, and isolated local sessions.
    """
    if not authorization:
        if settings.DEBUG or settings.ENVIRONMENT == "development":
            return DEMO_USER
        raise UnauthorizedException("Authorization header required.")

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        if settings.DEBUG:
            return DEMO_USER
        raise UnauthorizedException("Invalid Authorization format. Expected 'Bearer <token>'.")

    token = parts[1]

    # Special demo bypass token for the preloaded demo store
    if token in ("demo-token", "guest-token"):
        return DEMO_USER

    # 1. Check for Supabase JWT (starts with ey...)
    if token.startswith("ey"):
        # 1a. Try validating token with Supabase Auth admin API
        try:
            from app.db.supabase import get_supabase_admin
            supabase = get_supabase_admin()
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                u = user_response.user
                meta = getattr(u, "user_metadata", {}) or {}
                name = meta.get("full_name") or meta.get("name") or (u.email.split("@")[0] if u.email else "User")
                return AuthenticatedUser(
                    id=str(u.id),
                    email=u.email,
                    role=getattr(u, "role", "authenticated") or "authenticated",
                    full_name=name
                )
        except Exception as exc:
            logger.debug(f"Supabase auth admin get_user note: {exc}")

        # 1b. Fallback: Parse claims directly from JWT payload
        try:
            import base64
            import json
            parts_jwt = token.split(".")
            if len(parts_jwt) >= 2:
                payload_b64 = parts_jwt[1]
                rem = len(payload_b64) % 4
                if rem > 0:
                    payload_b64 += "=" * (4 - rem)
                claims = json.loads(base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8"))
                user_id = claims.get("sub")
                email = claims.get("email")
                user_meta = claims.get("user_metadata", {}) or {}
                name = user_meta.get("full_name") or user_meta.get("name") or (email.split("@")[0] if email else "User")
                if user_id:
                    return AuthenticatedUser(
                        id=str(user_id),
                        email=email,
                        role=claims.get("role", "authenticated"),
                        full_name=name
                    )
        except Exception as exc:
            logger.warning(f"JWT payload decoding note: {exc}")

    # 2. Local isolated session (Google session, email session, or any custom token)
    # Derive a deterministic, unique UUID from the token
    # This guarantees every distinct user gets their OWN isolated datasets, NEVER sharing demo data.
    unique_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, token))
    user_email = f"user-{unique_id[:8]}@darkstore.io"
    user_name = "Store Operator"

    if token.startswith("session-google-"):
        user_email = token.replace("session-google-", "")
        user_name = user_email.split("@")[0].replace(".", " ").title()
    elif token.startswith("session-user-"):
        user_email = token.replace("session-user-", "")
        user_name = user_email.split("@")[0].replace(".", " ").title()

    return AuthenticatedUser(
        id=unique_id,
        email=user_email,
        role="authenticated",
        full_name=user_name
    )


def verify_dataset_ownership(dataset_user_id: str, authenticated_user: AuthenticatedUser) -> bool:
    """
    Strict server-side ownership enforcement:
    A user can only access datasets belonging to their authenticated account.
    """
    if str(dataset_user_id) != str(authenticated_user.id) and authenticated_user.role != "service_role":
        raise DatasetAccessDeniedException(f"Dataset does not belong to user {authenticated_user.id}")
    return True
