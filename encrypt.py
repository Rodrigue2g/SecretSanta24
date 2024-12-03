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

def encrypt_json_file(input_file, output_file, password1, password2):
    # Read JSON data
    with open(input_file, 'r') as file:
        json_data = json.dumps(json.load(file)).encode()
    
    # Derive encryption key
    key, salt = derive_key(password1, password2)
    
    print(f"master key is: {key.hex()}.")

    # Encrypt using AES-GCM
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # GCM requires a 12-byte nonce
    encrypted_data = aesgcm.encrypt(nonce, json_data, None)
    
    # Save encrypted data to file
    with open(output_file, 'wb') as file:
        file.write(salt + nonce + encrypted_data)

    print(f"Data encrypted and saved to {output_file}.")
    

# Example Usage
if __name__ == "__main__":
    passwordMartin = input("Password Martin")
    passwordRod = input("Password Rod")
    
    # Input JSON file
    input_file = "assignments.json"
    encrypted_file = "encrypted_assignments.bin"
    
    # Encrypt JSON file
    encrypt_json_file(input_file, encrypted_file, passwordMartin, passwordRod)
