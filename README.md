# CYBERHUB — THE TECHNICAL VOYAGE

A complete, live technical quiz event platform built for **CyberHub**, a technical club.

## Features

- **Live Quiz Engine**: Exactly 25 questions, 10 seconds per question. Timer is strictly server-authoritative.
- **Team-based Competition**: Supports multiple participating teams simultaneously. 
- **Secure Authentication**: Passwordless OTP authentication for participants via Supabase Auth.
- **Server-Side Authorization**: Admin roles are managed purely backend-side. The frontend cannot be manipulated to grant unauthorized admin access.
- **Realtime State Management**: Participants are automatically transitioned from the waiting room to the active state using Supabase Realtime when the admin starts the quiz.
- **Ranking System**: Server-enforced sorting (Score descending, then Completion Time ascending). Selects the Top 15 teams to qualify for the next round.
- **Pirate Theme**: Comprehensive "ocean voyage" and "treasure" aesthetic, built entirely with modern CSS (no image assets required).

---

## Architecture / Tech Stack

### Frontend
- **Framework**: React + Vite
- **Routing**: React Router DOM (v6)
- **Styling**: Vanilla CSS (Tailwind variables/concepts adapted) + custom pirate theme
- **Icons**: Lucide React
- **Client**: `supabase-js` (uses anon key, listens to Realtime channels)

### Backend
- **Framework**: Python + FastAPI
- **Data Validation**: Pydantic
- **Database**: PostgreSQL (managed via Supabase)
- **Authorization**: FastAPI `Depends` validating Supabase JWT & backend `admins` table.
- **Client**: `supabase-py` (uses securely stored service_role key to bypass RLS)

---

## Folder Structure

```text
cyberhub-technical-voyage/
│
├── frontend/                     # React Application
│   ├── src/
│   │   ├── components/           
│   │   ├── pages/                # Contains all view layers (Landing, Login, Dashboard, etc.)
│   │   ├── context/              # Auth & Realtime Context
│   │   ├── services/             # API client & Supabase instantiation
│   │   ├── App.jsx               # Client Routing
│   │   ├── main.jsx              
│   │   └── index.css             # Includes all Custom CSS & Theme Variables
│   ├── index.html
│   └── package.json
│
├── backend/                      # FastAPI Application
│   ├── app/
│   │   ├── api/                  # Route handlers (admin, participant, auth)
│   │   ├── auth/                 # Fastapi auth dependencies (JWT verify, RLS bypass)
│   │   ├── database/             # Supabase python client definition
│   │   ├── schemas/              # Pydantic input/output schemas
│   │   ├── services/             # Core quiz engine business logic
│   │   ├── config.py             # Pydantic Settings
│   │   └── main.py               # App entrypoint
│   └── requirements.txt
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # Sets up all tables, indexes, RLS, and seed questions
    └── seed_admin.sql              # Used to configure the first admin
```


## Authentication Flow

1. Register team via external Google Sheet (Mocked in Postgres natively for this version). 
2. **Participant** submits email on the Login Page.
3. Supabase issues a magic-OTP link to their email.
4. User inputs the OTP verifying the email. 
5. Backend verifies if the email exists in the server `teams` table (Role -> `PARTICIPANT`) or `admins` table (Role -> `ADMIN`).
6. Based on role, user is routed to Admin Dashboard or Participant Waiting Room.

## Quiz Engine & Scoring System

- The frontend timer is 100% cosmetic. 
- When a question is requested, the backend calculates an absolute UTC deadline using `now() + 10s`.
- When an answer is submitted, the backend compares the system time to the deadline. If expired, it's a `TIMEOUT` (-10). 
- If submitted on time, the backend compares the answer to `correct_answer` (which is NEVER sent in the HTTP payload to the frontend client). 
- Correct = +10, Wrong = -5, Skipped = -10.
- Exactly one submission is recorded per question due to DB unique constraints, preventing race conditions.

## Ranking Algorithm

The system enforces EXACTLY this algorithm:
```sql
ORDER BY score DESC, completion_time_seconds ASC
```
The exact Top 15 are shown in the preview pane and can be finalized as qualified by the Admin.

---

## Local Development

### 1. Supabase Setup
- Create a new project in Supabase.
- Run the SQL script from `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.
- Seed your first admin by replacing your UUID inside `supabase/seed_admin.sql` and executing it.
- Retrieve your API Settings (URL, Anon Key, Service Role Key).

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows (or `source venv/bin/activate` for Mac/Linux)
pip install -r requirements.txt
cp .env.example .env       # And fill in the Supabase URL, Service Role Key, etc.
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env       # And fill in the Supabase URL, Anon Key, and API URL
npm run dev
```

---

## Security Considerations

1. **No Frontend Correct Answers**: The API explicitly omits `correct_answer` from the `current-question` response.
2. **Timer enforcement**: Changing computer clock, stopping Javascript execution, or manipulating local variables does not impact the countdown deadline since the backend uses UTC datetimes.
3. **No Direct Supabase Mutation from Client**: Frontend only uses Supabase to sign in and read realtime broadcasts. ALL writes and data reads are routed through the FastAPI application, utilizing edge-secure Row-Level Security overrides via `Service Role` Key to handle authentication and state progression safely.
4. **Environment Secrets**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to the Vite Frontend.
