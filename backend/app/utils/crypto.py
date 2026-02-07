import os
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from app.config import settings


def _get_key() -> bytes:
    return bytes.fromhex(settings.ENCRYPTION_KEY)


def encrypt_seed(seed: str) -> str:
    key = _get_key()
    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded = padder.update(seed.encode()) + padder.finalize()
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ct = encryptor.update(padded) + encryptor.finalize()
    return base64.b64encode(iv + ct).decode()


def decrypt_seed(encrypted: str) -> str:
    key = _get_key()
    raw = base64.b64decode(encrypted)
    iv = raw[:16]
    ct = raw[16:]
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    padded = decryptor.update(ct) + decryptor.finalize()
    unpadder = padding.PKCS7(128).unpadder()
    data = unpadder.update(padded) + unpadder.finalize()
    return data.decode()
