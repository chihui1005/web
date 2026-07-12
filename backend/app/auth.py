from datetime import UTC, datetime, timedelta
import base64
import hashlib
import hmac
import os
import secrets

import jwt


SECRET_KEY = os.getenv('PIKACHU_SHOP_SECRET', 'dev-secret-change-me-please-rotate-32bytes')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_HOURS = 24
PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)
    return 'pbkdf2_sha256${iterations}${salt}${digest}'.format(
        iterations=PBKDF2_ITERATIONS,
        salt=base64.b64encode(salt).decode('ascii'),
        digest=base64.b64encode(digest).decode('ascii'),
    )


def verify_password(password: str, stored_hash: str) -> bool:
    algorithm, iterations, salt, digest = stored_hash.split('$', 3)
    if algorithm != 'pbkdf2_sha256':
        return False
    candidate = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        base64.b64decode(salt.encode('ascii')),
        int(iterations),
    )
    return hmac.compare_digest(base64.b64decode(digest.encode('ascii')), candidate)


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(UTC) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({'sub': str(user_id), 'exp': expires_at}, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return int(payload['sub'])
