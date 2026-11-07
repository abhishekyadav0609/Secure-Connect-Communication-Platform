# Secure Connect and Communication Platform

College Web Dev III — Lab 4

## Features
- Signup and login with bcrypt password hashing
- JWT-based authentication and protected routes
- Role-based access control (user/admin)
- Personal Notes CRUD API; users can access only their own notes
- Authenticated real-time group chat using Socket.IO
- Node.js EventEmitter events for signup, note creation and chat messages
- MongoDB persistence and dotenv configuration

## Requirements
- Node.js 18+
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code (recommended)

## Setup (Windows PowerShell)
1. Extract the ZIP and open the `secure-connect-communication-platform` folder in VS Code.
2. Open the VS Code terminal.
3. Install packages:
   ```powershell
   npm install
   ```
4. Create your environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
5. Open `.env`. Set a long random `JWT_SECRET`. Confirm `MONGODB_URI` and `DB_NAME`.
6. Optional admin account: change `BOOTSTRAP_ADMIN_EMAIL` to the email you will use for your first admin signup. The matching account receives the `admin` role.
7. Make sure MongoDB is running.
8. Start the server:
   ```powershell
   npm run dev
   ```
   or:
   ```powershell
   npm start
   ```

Expected startup:
```text
MongoDB connected: secure_connect
Server running at http://localhost:5000
```

## Test with PowerShell

### 1. Signup
```powershell
$signup = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/signup" -ContentType "application/json" -Body (@{
  name = "Abhishek"
  email = "abhishek@example.com"
  password = "StrongPass123"
} | ConvertTo-Json)

$signup
```

### 2. Login and save JWT
```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body (@{
  email = "abhishek@example.com"
  password = "StrongPass123"
} | ConvertTo-Json)

$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
$login
```

### 3. Confirm protected route blocks requests without a token
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/notes"
```
Expected: HTTP 401 Unauthorized.

### 4. Create a note
```powershell
$note = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/notes" -Headers $headers -ContentType "application/json" -Body (@{
  title = "My first note"
  content = "This note belongs to my account."
} | ConvertTo-Json)

$note
$noteId = $note.note._id
```

### 5. Read all notes
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/notes" -Headers $headers
```

### 6. Update a note
```powershell
Invoke-RestMethod -Method Put -Uri "http://localhost:5000/api/notes/$noteId" -Headers $headers -ContentType "application/json" -Body (@{
  title = "Updated note"
  content = "The note has been updated."
} | ConvertTo-Json)
```

### 7. Delete a note
```powershell
Invoke-RestMethod -Method Delete -Uri "http://localhost:5000/api/notes/$noteId" -Headers $headers
```

### 8. Check your profile
```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/auth/me" -Headers $headers
```

### 9. Admin route
Set `BOOTSTRAP_ADMIN_EMAIL` in `.env` before registering the matching email. Log in with that account and use its token:
```powershell
$adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/login" -ContentType "application/json" -Body (@{
  email = "admin@example.com"
  password = "StrongPass123"
} | ConvertTo-Json)
$adminHeaders = @{ Authorization = "Bearer $($adminLogin.token)" }
Invoke-RestMethod -Method Get -Uri "http://localhost:5000/api/admin/users" -Headers $adminHeaders
```

## Real-time chat test
Socket.IO is a WebSocket-based feature and is easiest to test with a small browser client or a Socket.IO client. Install the client in a separate frontend project:
```powershell
npm install socket.io-client
```
Example client code:
```javascript
const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", {
  auth: { token: "PASTE_LOGIN_JWT_HERE" }
});

socket.on("connect", () => console.log("Connected:", socket.id));
socket.on("connect_error", (err) => console.error(err.message));
socket.on("chat:message", (data) => console.log("New chat message:", data));

socket.emit("chat:message", { message: "Hello everyone!" }, (response) => {
  console.log("Server acknowledgement:", response);
});
```
Open the client in two browser tabs or run two clients to see messages in real time. Only authenticated clients can connect.

## API summary

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/notes` | JWT | Create note |
| GET | `/api/notes` | JWT | List own notes |
| GET | `/api/notes/:id` | JWT | Read own note |
| PUT | `/api/notes/:id` | JWT | Update own note |
| DELETE | `/api/notes/:id` | JWT | Delete own note |
| GET | `/api/admin/users` | Admin JWT | List users |
| PATCH | `/api/admin/users/:id/role` | Admin JWT | Change user role |

## Notes
- Never commit `.env` or share your JWT secret.
- Signup never accepts a role from the request body; this prevents users from making themselves admins.
- Passwords are stored as bcrypt hashes, never as plain text.
- Notes queries always include the authenticated user's ID.
- Chat messages are stored in MongoDB and broadcast to connected authenticated clients.
- For a production deployment, use HTTPS, strict CORS origins, rate limiting, input validation, and secret rotation.
