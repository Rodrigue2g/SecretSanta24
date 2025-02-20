# SecretSanta24
Tirage Secret Santa 2024

- Start by setting the list of players in `run.py`

- Then set your SMTP config params in your `.env` file

- In your `.env` file make sure you set the SMTP config params as well as:
```
SESSION_SECRET='The secret for the session cookie'
DRAW_LAUNCHING_SECRET='The secret key query parameter used to launch a draw or setup messaging codes'
ENCRYPTION_KEY='The encyption key used to encrypt/decrypt the artifacts'
MASTER_KEY='The master key used to decrypt the encrypted_assignments.bin file'
```

- You can then just run:
```sh
dotenvx run -f .env -- node server.js
```

Once the server is running, just do a GET request at `localhost:8080/tirage?key=<your_secret_key>` in order to start the draw.

To setup the messaging codes, you can do a GET at `localhost:8080//messaging/setup-code?key=<your_secret_key>`

Make sure you perform these request only once as each new one will ovewrite any previous data. 
