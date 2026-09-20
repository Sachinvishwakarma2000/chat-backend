# Scalable Chat Backend (Node.js + TypeScript + Relational DB + Firebase Firestore)

A production-ready, strictly typed Chat Backend built with **Node.js, TypeScript, Express, Prisma ORM (MySQL / PostgreSQL)** for relational data integrity, and **Firebase Admin SDK (Firestore)** for high-throughput messaging, atomic read receipts, and real-time last-seen tracking.

---

## 🏛 System Architecture & Dual-Store Design

In high-concurrency messaging architectures, splitting relational identity data from volatile, append-heavy message streams is an industry best practice:

```
                  ┌────────────────────────┐
                  │   Express REST API     │
                  │   (TypeScript + Zod)   │
                  └─────┬────────────┬─────┘
                        │            │
             (Relational)            (Document Store)
                        │            │
                        ▼            ▼
             ┌────────────────┐ ┌───────────────────┐
             │ MySQL / Postgres│ │ Firebase Firestore │
             │  (Prisma ORM)  │ │ (Firebase Admin)  │
             └────────────────┘ └───────────────────┘
             - Users            - Messages (/chats/:id/messages)
             - Chats (1:1/Group)- Read Receipts (readBy: [])
             - Memberships      - Last Seen (per-user state)
```

1. **Relational Database (MySQL / PostgreSQL via Prisma)**:
   - Manages **Users**, **Chats**, and **ChatMembers**.
   - Enforces relational foreign keys, cascade deletes, and ensures **1:1 chat uniqueness** (preventing duplicate conversations between the same pair of users).
2. **Document Database (Firebase Firestore)**:
   - Stores horizontally scalable chat messages under `chats/{chatId}/messages/{messageId}`.
   - Efficient pagination using cursor-based ordering (`createdAt`).
   - Atomic read receipts using `FieldValue.arrayUnion`.
   - Per-user `lastSeen` tracking.
3. **Pluggable Firestore Adapter**:
   - For live production: Uses official Google Cloud `firebase-admin` Firestore.
   - For Firebase Emulator: Point to `FIRESTORE_EMULATOR_HOST`.
   - For zero-friction evaluation: An in-memory high-fidelity fallback adapter is enabled if credentials are not configured, allowing the entire suite and API to run without cloud barriers.

---

## 📁 Project Structure

```
chat-backend/
├── prisma/
│   ├── schema.prisma                  # Prisma relational schema (User, Chat, ChatMember)
│   └── seed.ts                        # Database seeder for sample users and chats
├── src/
│   ├── config/
│   │   ├── env.ts                     # Zod-validated environment config
│   │   ├── database.ts                # Prisma connection lifecycle & client singleton
│   │   └── firebase.ts                # Firebase Admin SDK & Firestore client initialization
│   ├── constants/
│   │   ├── http-status.ts             # Strongly-typed HTTP status codes
│   │   └── error-codes.ts             # Domain-specific error codes
│   ├── errors/                        # Custom domain error classes
│   │   ├── app-error.ts               # Base AppError
│   │   ├── bad-request.error.ts       # 400 Bad Request
│   │   ├── unauthorized.error.ts      # 401 Unauthorized
│   │   ├── forbidden.error.ts         # 403 Forbidden
│   │   ├── not-found.error.ts         # 404 Not Found
│   │   └── conflict.error.ts          # 409 Conflict
│   ├── middlewares/
│   │   ├── error-handler.middleware.ts# Centralized error handler with consistent JSON shape
│   │   ├── request-logger.middleware.ts# Structured request & latency logging
│   │   ├── validate.middleware.ts     # Zod schema validation middleware (body, params, query)
│   │   └── not-found.middleware.ts    # 404 handler for unmatched routes
│   ├── modules/
│   │   ├── chat/                      # Chat domain (1:1 & Group)
│   │   │   ├── chat.controller.ts
│   │   │   ├── chat.repository.ts
│   │   │   ├── chat.routes.ts
│   │   │   ├── chat.schema.ts
│   │   │   └── chat.service.ts
│   │   ├── message/                   # Message & Firestore domain
│   │   │   ├── message.controller.ts
│   │   │   ├── message.firestore.repository.ts # Live Firestore operations
│   │   │   ├── message.memory.repository.ts    # In-memory test/dev adapter
│   │   │   ├── message.repository.factory.ts   # Active repository provider
│   │   │   ├── message.routes.ts
│   │   │   ├── message.schema.ts
│   │   │   ├── message.service.ts
│   │   │   └── message.types.ts
│   │   └── user/                      # User domain
│   │       ├── user.controller.ts
│   │       ├── user.repository.ts
│   │       ├── user.routes.ts
│   │       ├── user.schema.ts
│   │       └── user.service.ts
│   ├── utils/
│   │   ├── api-response.ts            # Uniform { success, data, error } formatter
│   │   └── logger.ts                  # Structured Pino logger
│   ├── app.ts                         # Express application setup
│   └── server.ts                      # Server bootstrap & graceful shutdown hooks
├── tests/
│   └── integration/
│       └── chat-api.test.ts           # End-to-end Supertest suite (17 test cases)
├── .env.example                       # Environment variable template
├── jest.config.js                     # Jest testing configuration
├── package.json
└── tsconfig.json                      # Strict TypeScript compiler options
```

---

## 🛠️ Prerequisites & Installation

- **Node.js**: v18+ (tested on Node.js v24)
- **npm**: v9+

### 1. Install Dependencies

```bash
cd /Users/apple/Workspace/chat-backend
npm install
```

### 2. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Environment options inside `.env`:

| Key | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `3000` |
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `DATABASE_URL` | MySQL or PostgreSQL connection string | `mysql://root:password@localhost:3306/chat_backend_db` |
| `USE_IN_MEMORY_FIRESTORE` | Set to `true` for zero-setup evaluation mode | `true` |
| `FIREBASE_PROJECT_ID` | Google Cloud project ID for Firestore | `chat-backend-dev` |
| `FIREBASE_SERVICE_ACCOUNT_PATH`| Path to service account JSON (optional) | Unset |
| `FIRESTORE_EMULATOR_HOST` | Host and port of local Firestore emulator (optional) | Unset |

---

## 🚀 Running the Application

### Development Mode (with hot-reloading via `tsx`)

```bash
npm run dev
```

### Run Automated Tests

The test suite covers all 6 required APIs, idempotency, permissions, and edge cases:

```bash
npm test
```

### Compile to Production Bundle

```bash
npm run build
npm start
```

---

## 🔌 API Reference & cURL Examples

All responses adhere to a consistent JSON structure:
```json
{
  "success": true,
  "message": "Description of action",
  "data": { ... },
  "meta": { ... }
}
```

---

### 1. Create or Get Chat (1:1 Direct Chat)
Returns the existing `chatId` if a direct chat between the two users already exists; otherwise creates a new one idempotently.

- **Method**: `POST`
- **Route**: `/chat/create`
- **Request Body**:
  ```json
  {
    "userAId": "usr_alice_001",
    "userBId": "usr_bob_002"
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/chat/create \
    -H "Content-Type: application/json" \
    -d '{"userAId": "usr_alice_001", "userBId": "usr_bob_002"}'
  ```
- **Response** (`200 OK` or `201 Created`):
  ```json
  {
    "success": true,
    "message": "Direct chat created successfully",
    "data": {
      "chatId": "chat_direct_alice_bob"
    }
  }
  ```

---

### 2. Send Message
Validates sender is a verified member of the chat, then writes message document to Firestore with timestamp.

- **Method**: `POST`
- **Route**: `/chat/:chatId/message/send`
- **Request Body**:
  ```json
  {
    "senderId": "usr_alice_001",
    "text": "Hey Bob! Have you checked the latest deployment?"
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/chat/chat_direct_alice_bob/message/send \
    -H "Content-Type: application/json" \
    -d '{"senderId": "usr_alice_001", "text": "Hey Bob! Have you checked the latest deployment?"}'
  ```
- **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Message sent successfully",
    "data": {
      "id": "e8d4cf72-8822-49da-91e8-d6a99252cbe9",
      "chatId": "chat_direct_alice_bob",
      "senderId": "usr_alice_001",
      "text": "Hey Bob! Have you checked the latest deployment?",
      "createdAt": "2026-09-20T15:10:00.000Z",
      "readBy": ["usr_alice_001"],
      "isEdited": false,
      "isDeleted": false,
      "updatedAt": "2026-09-20T15:10:00.000Z"
    }
  }
  ```

---

### 3. Get Messages
Retrieves messages in chronological order with optional cursor pagination.

- **Method**: `GET`
- **Route**: `/chat/:chatId/messages?limit=50`
- **Query Parameters**:
  - `limit` (default: 50, max: 100)
  - `before` (optional cursor for pagination)
- **cURL**:
  ```bash
  curl -X GET "http://localhost:3000/chat/chat_direct_alice_bob/messages?limit=50"
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Messages retrieved successfully",
    "data": [
      {
        "id": "e8d4cf72-8822-49da-91e8-d6a99252cbe9",
        "chatId": "chat_direct_alice_bob",
        "senderId": "usr_alice_001",
        "text": "Hey Bob! Have you checked the latest deployment?",
        "createdAt": "2026-09-20T15:10:00.000Z",
        "readBy": ["usr_alice_001"]
      }
    ],
    "meta": {
      "count": 1
    }
  }
  ```

---

### 4. Mark Message Read
Updates read receipt in Firestore atomically.

- **Method**: `POST`
- **Route**: `/chat/:chatId/message/:messageId/read`
- **Request Body**:
  ```json
  {
    "userId": "usr_bob_002"
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/chat/chat_direct_alice_bob/message/e8d4cf72-8822-49da-91e8-d6a99252cbe9/read \
    -H "Content-Type: application/json" \
    -d '{"userId": "usr_bob_002"}'
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Message marked as read",
    "data": {
      "id": "e8d4cf72-8822-49da-91e8-d6a99252cbe9",
      "chatId": "chat_direct_alice_bob",
      "senderId": "usr_alice_001",
      "text": "Hey Bob! Have you checked the latest deployment?",
      "readBy": ["usr_alice_001", "usr_bob_002"],
      "updatedAt": "2026-09-20T15:12:00.000Z"
    }
  }
  ```

---

### 5. Update Last Seen Message
Updates the per-user last seen message bookmark in Firestore.

- **Method**: `POST`
- **Route**: `/chat/:chatId/lastseen`
- **Request Body**:
  ```json
  {
    "userId": "usr_bob_002",
    "messageId": "e8d4cf72-8822-49da-91e8-d6a99252cbe9"
  }
  ```
- **cURL**:
  ```bash
  curl -X POST http://localhost:3000/chat/chat_direct_alice_bob/lastseen \
    -H "Content-Type: application/json" \
    -d '{"userId": "usr_bob_002", "messageId": "e8d4cf72-8822-49da-91e8-d6a99252cbe9"}'
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Last seen updated successfully",
    "data": {
      "userId": "usr_bob_002",
      "messageId": "e8d4cf72-8822-49da-91e8-d6a99252cbe9",
      "updatedAt": "2026-09-20T15:13:00.000Z"
    }
  }
  ```

---

### 6. List User Chats
Lists all chats belonging to the specified user with all participant member IDs from the relational database.

- **Method**: `GET`
- **Route**: `/user/:userId/chats`
- **cURL**:
  ```bash
  curl -X GET http://localhost:3000/user/usr_alice_001/chats
  ```
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "User chats retrieved successfully",
    "data": [
      {
        "chatId": "chat_direct_alice_bob",
        "type": "DIRECT",
        "name": null,
        "createdAt": "2026-09-20T15:00:00.000Z",
        "updatedAt": "2026-09-20T15:00:00.000Z",
        "memberIds": ["usr_alice_001", "usr_bob_002"],
        "members": [
          {
            "id": "usr_alice_001",
            "name": "Alice Johnson",
            "email": "alice@example.com",
            "role": "MEMBER"
          },
          {
            "id": "usr_bob_002",
            "name": "Bob Smith",
            "email": "bob@example.com",
            "role": "MEMBER"
          }
        ]
      }
    ]
  }
  ```

---

### Bonus APIs

#### Create Group Chat
- **POST** `/chat/group/create`
- **Body**: `{"name": "Engineering Team", "adminId": "usr_alice_001", "memberIds": ["usr_bob_002", "usr_charlie_003"]}`

#### Edit Message
- **PATCH** `/chat/:chatId/message/:messageId`
- **Body**: `{"senderId": "usr_alice_001", "text": "Corrected message text"}`

#### Soft Delete Message
- **DELETE** `/chat/:chatId/message/:messageId`
- **Body**: `{"senderId": "usr_alice_001"}`

---

## 🛡️ Security & Quality Standards

- **Input Validation**: Strongly-typed validation using [Zod](https://github.com/colinhacks/zod) on headers, route parameters, queries, and JSON request bodies.
- **Strict Typing**: Zero `any` leaks in core services; TypeScript compilation runs with `noImplicitAny: true` and `strictNullChecks: true`.
- **Relational Integrity**: 1:1 chat queries check composite member relationships to guarantee no duplicate chats can ever be initialized between the same pair of participants.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` signals to cleanly drain active HTTP connections and close Prisma database connections.
