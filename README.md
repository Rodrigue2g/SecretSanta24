# SecretSanta24
Tirage Secret Santa 2024

- Start by setting the list of players in `run.py`

- Then set your SMTP config params in your `.env` file

- You can then just run:
```sh
dotenvx run -f .env -- node server.js
```

Once the server is running, just do a GET request at `localhost:8080/tirage` in order to start the draw.
