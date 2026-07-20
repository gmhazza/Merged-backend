# Megred Backend

A **Node.js / Express** REST API + real-time **Socket.IO** server powering the Megred developer-matching platform. It uses **SQLite** as the database and **JWT cookie-based authentication**.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [REST API Reference](#rest-api-reference)
  - [Health Check](#health-check)
  - [Setup Routes](#setup-routes)
  - [Auth Routes](#auth-routes)
  - [User / Profile Routes](#user--profile-routes)
  - [Interest Routes](#interest-routes)
  - [Chat & Messaging Routes](#chat--messaging-routes)
  - [Room Routes](#room-routes)
- [Socket.IO Events](#socketio-events)
- [Database Query Functions](#database-query-functions-sqlitejs)
- [Service Layer](#service-layer-servicejs)

---

## Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Runtime        | Node.js                             |
| Web Framework  | Express 5                           |
| Real-time      | Socket.IO 4                         |
| Database       | SQLite (via `sqlite` + `sqlite3`)   |
| Auth           | JWT (`jsonwebtoken`) + `cookie-parser` |
| Password Hash  | bcrypt                              |
| Dev Server     | nodemon                             |

---

## Project Structure

```
backend/
├── index.js                  # App entry point — Express + Socket.IO setup
├── .env                      # Environment variables (not committed)
├── package.json
├── database/
│   ├── auth.js               # JWT middleware (authentication, checkAuthentication)
│   ├── chat.js               # /chat router — room management
│   ├── query.js              # /database router — all main API routes
│   ├── sqlite.js             # All SQLite query functions
│   └── data.db               # SQLite database file
└── services/
    ├── chatting-room.js      # In-memory Map() for socket room tracking
    └── service.js            # Business logic (filtering, room helpers)
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
SECRET_KEY=your_jwt_secret_here
BCRYPT_SALT_KEY=your_salt_key
```

| Variable          | Description                               |
|-------------------|-------------------------------------------|
| `SECRET_KEY`      | Secret used to sign & verify JWT tokens  |
| `BCRYPT_SALT_KEY` | Salt rounds for bcrypt password hashing  |

---

## Database Schema

### `profiles`
| Column       | Type     | Notes                        |
|--------------|----------|------------------------------|
| `id`         | INTEGER  | Primary key, auto-increment  |
| `username`   | TEXT     | Unique, not null             |
| `email`      | TEXT     | Unique, not null             |
| `password`   | TEXT     | Hashed with bcrypt           |
| `bio`        | TEXT     | Optional                     |
| `gender`     | TEXT     | Not null                     |
| `role`       | TEXT     | e.g. Developer, Designer     |
| `city`       | TEXT     | Optional                     |
| `country`    | TEXT     | Optional                     |
| `github`     | TEXT     | Optional                     |
| `linkedin`   | TEXT     | Optional                     |
| `portfolio`  | TEXT     | Optional                     |
| `created_at` | DATETIME | Default: current timestamp   |

### `interests`
| Column       | Type     | Notes                                  |
|--------------|----------|----------------------------------------|
| `id`         | INTEGER  | Primary key                            |
| `userId`     | INTEGER  | FK -> profiles(id), CASCADE DELETE     |
| `targetId`   | INTEGER  | FK -> profiles(id), CASCADE DELETE     |
| `approved`   | INTEGER  | 0 = pending, 1 = approved              |
| `created_at` | DATETIME | Default: current timestamp             |

### `chats`
| Column       | Type     | Notes                              |
|--------------|----------|------------------------------------|
| `id`         | INTEGER  | Primary key                        |
| `userId`     | INTEGER  | FK -> profiles(id), CASCADE DELETE |
| `targetId`   | INTEGER  | FK -> profiles(id), CASCADE DELETE |
| `created_at` | DATETIME | Default: current timestamp         |

### `messages`
| Column       | Type     | Notes                           |
|--------------|----------|---------------------------------|
| `id`         | INTEGER  | Primary key                     |
| `chatId`     | INTEGER  | FK -> chats(id), CASCADE DELETE |
| `message`    | TEXT     | Not null                        |
| `sender`     | INTEGER  | Profile ID of sender            |
| `created_at` | DATETIME | Default: current timestamp      |

---

## Getting Started

```bash
# Cloning Backend
git clone https://github.com/gmhazza/Merged-backend.git
cd Merged-backend

# Install dependencies
npm install

# Start dev server (nodemon with auto-reload)
npm run dev
```

Server runs on **http://localhost:8080**
Frontend origin allowed: **http://localhost:5173**

> **First-time setup:** Call `GET /database/create/tables` once to initialize the SQLite tables, then optionally seed with `GET /database/add/dummy/data`.

---

## Authentication

The server uses **HTTP-only cookie-based JWT** auth.

- On successful login or registration, a `token` cookie is set (7-day expiry).
- Protected routes read the cookie and verify the JWT via the `authentication` middleware.
- The `checkAuthentication` middleware is used on auth routes — it attaches the user if a valid token exists but does **not** block the request if no token is present.
- Logout clears the `token` cookie.

### Middleware

| Middleware            | File               | Behaviour                                                         |
|-----------------------|--------------------|-------------------------------------------------------------------|
| `authentication`      | `database/auth.js` | Requires valid JWT cookie. Returns `401` if missing or invalid.  |
| `checkAuthentication` | `database/auth.js` | Attaches user from JWT if present; continues even without token. |

---

## REST API Reference

Base URL: `http://localhost:8080`

---

### Health Check

#### `GET /`
Returns a server status message.

**Response**
```json
{ "message": "Server is responding correctly" }
```

---

### Setup Routes

> Warning: These routes are for development/setup only and should be removed or secured before production.

#### `GET /database/create/tables`
Creates all database tables (`profiles`, `chats`, `interests`, `messages`) if they do not already exist.

**Response `200`**
```json
{ "message": "Successfuly Created Tables" }
```

#### `GET /database/add/dummy/data`
Seeds the database with two dummy profiles, one chat, sample interests, and sample messages.

**Response `200`** _(empty body on success)_

---

### Auth Routes

#### `POST /database/register/user`
Registers a new user. Hashes the password, inserts into the database, and sets a JWT cookie.

**Auth:** `checkAuthentication`

**Request Body**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123",
  "gender": "Male",
  "role": "Developer"
}
```

**Response `200`**
```json
{ "message": "Successfuly Inserted data" }
```
Sets cookie: `token=<JWT>` (httpOnly, sameSite: strict, 7 days)

---

#### `POST /database/login`
Authenticates an existing user by email and password. Sets a JWT cookie on success.

**Auth:** `checkAuthentication`

**Request Body**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `200`** — Returns the user object (without sensitive fields).

Sets cookie: `token=<JWT>` (httpOnly, sameSite: lax, 7 days)

**Errors**
- `500` — Incorrect email or password.

---

#### `POST /database/logout`
Clears the `token` cookie and logs the user out.

**Response `200`**
```json
{ "message": "Logged out" }
```

---

### User / Profile Routes

#### `GET /database/profile`
Returns the full profile of the currently authenticated user.

**Auth:** Required

**Response `200`** — User profile object (password and id excluded).

---

#### `GET /database/token`
Returns the decoded JWT payload (user info stored in the token).

**Auth:** Required

**Response `200`** — Decoded token payload object.

---

#### `PATCH /database/update/user`
Updates profile fields for the currently authenticated user. Only provided fields are updated.

**Auth:** Required

**Request Body** _(all fields optional)_
```json
{
  "username": "new_name",
  "email": "new@example.com",
  "password": "newpass",
  "gender": "Female",
  "role": "Designer",
  "bio": "About me...",
  "city": "Berlin",
  "country": "Germany",
  "github": "github.com/user",
  "linkedin": "linkedin.com/in/user",
  "portfolio": "mysite.com"
}
```

**Response `200`**
```json
{ "message": "Successfuly Inserted data" }
```

---

#### `DELETE /database/delete/user`
Deletes the currently authenticated user's profile. All related chats, interests, and messages are cascade-deleted.

**Auth:** Required

**Response `200`**
```json
{ "message": "Successfuly deleted user" }
```

---

#### `GET /database/get/all/user`
Returns a filtered list of all users, excluding:
- The currently authenticated user
- Users the current user has already shown interest in
- Users who have shown interest in the current user

**Auth:** Required

**Response `200`**
```json
[
  {
    "id": 2,
    "username": "janedoe",
    "gender": "Female",
    "bio": "UI/UX designer...",
    "role": "Designer",
    "city": "Berlin",
    "country": "Germany",
    "github": "github.com/janedoe",
    "linkedin": "linkedin.com/in/janedoe",
    "portfolio": "janedoe.design"
  }
]
```

---

### Interest Routes

#### `POST /database/register/interest`
Registers an interest from the current user toward a target user (pending approval).

**Auth:** Required

**Request Body**
```json
{ "targetId": 2 }
```

**Response `200`**
```json
{ "message": "Interest registered Successfuly" }
```

**Errors**
- `409` — Cannot register interest on yourself.

---

#### `PATCH /database/show/interest`
Approves an interest request — marks the interest record as `approved = 1`.

**Auth:** Required

**Request Body**
```json
{ "id": 3 }
```
> `id` is the `userId` of the person whose interest you want to approve.

**Response `200`**
```json
{ "message": "successfull" }
```

---

#### `GET /database/get/interested`
Returns all users who have shown interest in the current user (both approved and pending).

**Auth:** Required

**Response `200`**
```json
[
  { "id": 1, "username": "johndoe", "role": "Developer", "approved": 0 }
]
```

---

#### `GET /database/get/interested/not/approved`
Returns users who have shown interest in the current user but have **not** yet been approved.

**Auth:** Required

**Response `200`**
```json
[
  { "id": 1, "username": "johndoe", "role": "Developer" }
]
```

---

#### `GET /database/get/interested/approved`
Returns all mutually approved connections for the current user — includes users the current user approved AND users who approved the current user.

**Auth:** Required

**Response `200`** — Array of user objects (id, username, role).

---

### Chat & Messaging Routes

#### `POST /database/get/chat/id`
Gets the chat ID between the current user and a target user. If no chat exists, one is created automatically.

**Auth:** Required

**Request Body**
```json
{ "targetId": 2 }
```

**Response `200`**
```json
{ "id": 1 }
```

---

#### `POST /database/get/all/messages`
Returns all messages in a given chat conversation.

**Auth:** Required

**Request Body**
```json
{ "chatId": 1 }
```

**Response `200`**
```json
[
  {
    "id": 1,
    "chatId": 1,
    "message": "Hi Jane!",
    "sender": 1,
    "created_at": "2026-01-01T12:00:00"
  }
]
```

---

#### `POST /database/send/message`
Saves a message to the database for a given chat.

**Auth:** Required

**Request Body**
```json
{
  "chatId": 1,
  "message": "Hello there!",
  "sender": 1
}
```

**Response `200`**
```json
{
  "chatId": 1,
  "message": "Hello there!",
  "sender": 1
}
```

---

### Room Routes

#### `POST /chat/room`
Gets the socket room ID for a target user. If the room exists in the in-memory store, it is returned. Otherwise, it registers the current user's room.

**Auth:** Required

**Request Body**
```json
{
  "targetId": 2,
  "roomId": "some-room-uuid"
}
```

**Response `200`** _(room found)_
```json
{ "roomId": "some-room-uuid" }
```

**Response `204`** _(room was registered, no content)_

---

## Socket.IO Events

The Socket.IO server runs on the same HTTP server at **http://localhost:8080**.

CORS allows origin `http://localhost:5173` with credentials.

### Client -> Server

| Event          | Payload              | Description                                                          |
|----------------|----------------------|----------------------------------------------------------------------|
| `send-message` | `{ ...messageData }` | Broadcasts message data to all other connected clients.              |

### Server -> Client

| Event         | Payload              | Description                                                           |
|---------------|----------------------|-----------------------------------------------------------------------|
| `get-message` | `{ ...messageData }` | Emitted to all clients except sender with the broadcast message data. |

### Connection Lifecycle

| Event         | Description                                        |
|---------------|----------------------------------------------------|
| `connection`  | Fires when a client connects. Logs the socket ID.  |
| `disconnect`  | Fires when a client disconnects. Logs the socket ID.|

---

## Database Query Functions (`sqlite.js`)

All functions open a fresh SQLite connection, execute the query, and close the connection in a `finally` block.

| Function                              | Description                                                                                               |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `CreateTables()`                      | Creates `profiles`, `chats`, `interests`, and `messages` tables with foreign key constraints enabled.    |
| `addDummyData()`                      | Seeds the database with 2 sample profiles, 1 chat, 2 interests, and 3 sample messages.                   |
| `CreateProfile(user)`                 | Inserts a new user. Hashes password (bcrypt) before insert. Returns the newly created profile record.    |
| `UpdateProfile(userId, data)`         | Dynamically builds an `UPDATE` query for only the provided fields. Re-hashes password if updated.        |
| `Login(user)`                         | Finds a user by email, compares bcrypt password hash. Throws on mismatch. Returns the full profile row.  |
| `GetProfile(id)`                      | Returns a user's profile by ID. Strips `password` and `id` before returning.                             |
| `DeleteProfile(userId)`               | Deletes a profile by ID. All related chats, interests, and messages cascade-delete automatically.         |
| `GetAllProfiles(userId)`              | Returns all profiles except the requesting user (public fields only: no password/email).                 |
| `GetSpecificProfiles(userId)`         | Returns limited public fields (id, username, gender, role, city, country) for a single profile.          |
| `CreateInterest(userId, targetId)`    | Inserts a new pending interest record (`approved = 0`) between two users.                                |
| `ShowInterest(userId, targetId)`      | Updates an interest record to `approved = 1`, approving the interest.                                    |
| `GetInterests(userId)`                | Returns all interest records where the current user is the sender.                                        |
| `GetInterested(userId)`               | Returns all users who have shown interest in the current user, with their `approved` status.             |
| `GetInterestedButNotApproved(userId)` | Returns users who have shown interest in the current user but are still pending approval.                 |
| `GetInterestsOnlyApproved(userId)`    | Returns all approved connections — queries both directions and merges the results.                        |
| `GetChatId(userId, targetId)`         | Retrieves an existing chat ID between two users, or creates a new chat session and returns its ID.        |
| `GetMessages(chatId)`                 | Returns all messages belonging to a chat, in insertion order.                                             |
| `SendMessage(chatId, message, sender)`| Inserts a new message and returns the saved message object (`{ chatId, message, sender }`).              |

---

## Service Layer (`service.js`)

| Function                        | Description                                                                                                                              |
|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `FilterInterestedUsers(userId)` | Fetches all profiles, all interests sent by the user, and all interests received by the user. Filters out users in either interest list. |
| `SetUserRoom(userId, roomId)`   | Stores a `userId -> roomId` mapping in the in-memory `Map` (from `chatting-room.js`).                                                   |
| `GetUserRoom(userId)`           | Retrieves the socket room ID for a given user from the in-memory `Map`.                                                                  |

> **Note:** The in-memory room store (`chatting-room.js`) is a plain JavaScript `Map`. Its data is lost on server restart. It is used for associating users with their active WebSocket rooms during a live session.
