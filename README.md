# Quick README update

This repository contains a full-stack demo app (dj-drop) to upload and moderate downloadable products.

Quick start (local, development):

1. Server
   - cd server
   - cp .env.example .env
   - edit ADMIN_PASSWORD and JWT_SECRET in .env
   - npm install
   - npm run dev

2. Client (development)
   - cd client
   - npm install
   - npm start

3. Create admin (one-time)
   - curl -X POST http://localhost:4000/api/setup/admin -H "Content-Type: application/json" -d '{"username":"admin","password":"pass","adminSecret":"changeme"}'

4. Expose server to the internet (for phone testing)
   - Install ngrok: https://ngrok.com/
   - Run: ngrok http 4000
   - Use the public https://... URL ngrok provides. Example: https://abcd1234.ngrok.io
   - Open the product page on your phone: https://abcd1234.ngrok.io/ (client) or scan QR at https://abcd1234.ngrok.io/api/products/<id>/qrcode.png

Docker-compose (build & run):

- docker-compose up --build

Security & legal:
- Do NOT use this to distribute pirated or cracked software. Use only for legal/licensed content.
