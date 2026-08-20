# MOT Reminder System Backend

This folder contains a complete, easy-to-understand Node.js/Express backend for the MOT Reminder Management System. 

It provides REST endpoints for user authentication, customer management, vehicle details, reminder logs, template configurations, audit trails, secure token link verification, and advanced filtering.

---

## Technical Features Implemented
*   **In-Memory Database (`db.js` & `data/seedData.js`)**: Runs immediately without needing database configuration, seeded with sample records.
*   **JWT Security (`middleware/auth.js`)**: Protects admin screens using industry-standard JSON Web Token verification.
*   **Reminder Engine Service (`services/reminderService.js`)**: Scans vehicle expirations and triggers mock dispatch actions (via Email and SMS/WhatsApp mock logs).
*   **Advanced Search (`controllers/customerController.js`)**: Matches filters for query name/mobile/email/plate, communication preferences, and vehicle states.
*   **Self-Service Token Link Actions (`controllers/responseController.js`)**: Simulates the no-login customer updates by encoding payload data inside Base64 tokens.
*   **Report Generation (`controllers/reportController.js`)**: Supports retrieving JSON data or downloading reports directly as CSV files (by passing `?format=csv`).
*   **DVLA Lookup Mock (`controllers/vehicleController.js`)**: Queries custom profiles or generates generic vehicle spec structures.

---

## Getting Started

### 1. Install Dependencies
Run the following command inside the `src/backend` directory:
```bash
npm install
```

### 2. Configure Environment Settings
Create or review the `.env` file configuration (pre-created with defaults):
```env
PORT=5000
JWT_SECRET=mot_app_secure_secret_token_2026
NODE_ENV=development
```

### 3. Launch Backend Server
Run the startup script:
```bash
npm start
```
The server will start listening at: `http://localhost:5000`.

---

## Endpoint Map

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| **`/api/auth/login`** | `POST` | No | Log in and receive signed JWT. |
| **`/api/auth/signup`** | `POST` | No | Register a new customer user. |
| **`/api/customers`** | `GET` | Yes | Get all customer records. |
| **`/api/customers/search`**| `GET` | Yes | Query customers by text or filter by preferred contact/status. |
| **`/api/customers/:id`** | `GET` | Yes | Get a single customer with their vehicles. |
| **`/api/vehicles`** | `POST` | Yes | Add a new vehicle profile. |
| **`/api/vehicles/dvla/:vrn`**| `GET` | Yes | Query mock DVLA stats for a license plate number. |
| **`/api/reminders/logs`** | `GET` | Yes | List sent reminders logs history. |
| **`/api/reminders/templates`**| `GET` / `PUT` | Yes | Retrieve or modify reminder template configurations. |
| **`/api/reminders/trigger-cron`**| `POST` | Yes | Manually trigger a daily scan for MOT expiry matching. |
| **`/api/reports/due-mots`**| `GET` | Yes | Pull vehicles due for MOT soon (supports `?format=csv` download). |
| **`/api/reports/reminder-sent`**| `GET` | Yes | Pull sent logs history (supports `?format=csv` download). |
| **`/api/reports/customer-response`**| `GET` | Yes | Pull logs of portal actions (supports `?format=csv` download). |
| **`/api/reports/booked-mots`**| `GET` | Yes | Pull MOT booking requests (supports `?format=csv` download). |
| **`/api/dashboard/stats`** | `GET` | Yes | Fetch stats counters for dashboard display. |
| **`/api/response/portal`** | `GET` | No | Verify secure Base64 link token and load customer portal data. |
| **`/api/response/portal/action`**| `POST` | No | Submit customer actions: `BOOK_MOT`, `VEHICLE_SOLD`, `ADD_VEHICLE`. |
| **`/api/audit`** | `GET` | Yes | Fetch system audit logging history. |
