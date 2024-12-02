import json
import os
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64

def derive_key(password1, password2, salt=None):
    if salt is None:
        salt = os.urandom(16)
    combined_password = (password1 + password2).encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key = kdf.derive(combined_password)
    return key, salt


def decrypt_json_file(input_file, password1, password2):
    # Read encrypted data
    with open(input_file, 'rb') as file:
        data = file.read()
    
    # Extract salt, nonce, and encrypted data
    salt = data[:16]
    nonce = data[16:28]
    encrypted_data = data[28:]
    
    # Derive decryption key
    key, _ = derive_key(password1, password2, salt)
    
    # Decrypt using AES-GCM
    aesgcm = AESGCM(key)
    decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)
    
    # Parse JSON data
    return json.loads(decrypted_data.decode())

# Example Usage
if __name__ == "__main__":
    passwordMartin = input("Password Martin")
    passwordRod = input("Password Rod")
    
    # Input JSON file
    encrypted_file = "encrypted_assignments.bin"
    output_file = "decrypted_assignments.json"
    
    # Decrypt JSON file
    decrypted_data = decrypt_json_file(encrypted_file, passwordMartin, passwordRod)
    json_bytes = json.dumps(decrypted_data).encode('utf-8')

    # Write the JSON as bytes
    with open(output_file, "wb") as file:
        file.write(json_bytes)
        
    print(f"Data decrypted and saved to {output_file}.")
