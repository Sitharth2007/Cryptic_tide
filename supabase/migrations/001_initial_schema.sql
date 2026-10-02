-- ============================================================
-- CYBERHUB — THE TECHNICAL VOYAGE
-- Supabase PostgreSQL Migration
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── TEAMS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name               TEXT NOT NULL,
    team_lead_name          TEXT NOT NULL,
    team_lead_email         TEXT NOT NULL UNIQUE,
    team_lead_phone         TEXT,
    registration_status     TEXT NOT NULL DEFAULT 'REGISTERED'
                            CHECK (registration_status IN ('REGISTERED','ACTIVE','DISQUALIFIED')),
    rules_acknowledged      BOOLEAN NOT NULL DEFAULT FALSE,
    rules_acknowledged_at   TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_lead_email ON public.teams(team_lead_email);

-- ─── TEAM MEMBERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email   ON public.team_members(email);

-- ─── ADMINS ───────────────────────────────────────────────────────────────────
-- Server-side allowlist. Frontend CANNOT grant admin access.
CREATE TABLE IF NOT EXISTS public.admins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE,  -- references auth.users(id)
    email       TEXT NOT NULL UNIQUE,
    role        TEXT NOT NULL DEFAULT 'ADMIN'
                CHECK (role IN ('ADMIN','SUPER_ADMIN')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ROUNDS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rounds (
    id              TEXT PRIMARY KEY,  -- 'round-1', 'round-2', etc.
    name            TEXT NOT NULL,
    round_number    INTEGER NOT NULL,
    status          TEXT NOT NULL DEFAULT 'NOT_STARTED'
                    CHECK (status IN ('NOT_STARTED','ACTIVE','COMPLETED')),
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUESTIONS ────────────────────────────────────────────────────────────────
-- correct_answer is stored server-side and NEVER sent to participant frontend
CREATE TABLE IF NOT EXISTS public.questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id        TEXT NOT NULL REFERENCES public.rounds(id),
    question_number INTEGER NOT NULL,
    category        TEXT NOT NULL,
    question_text   TEXT NOT NULL,
    option_a        TEXT NOT NULL,
    option_b        TEXT NOT NULL,
    option_c        TEXT NOT NULL,
    option_d        TEXT NOT NULL,
    correct_answer  TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (round_id, question_number)
);

CREATE INDEX IF NOT EXISTS idx_questions_round_id   ON public.questions(round_id);
CREATE INDEX IF NOT EXISTS idx_questions_q_number   ON public.questions(round_id, question_number);

-- ─── ATTEMPTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attempts (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                     UUID NOT NULL REFERENCES public.teams(id),
    round_id                    TEXT NOT NULL REFERENCES public.rounds(id),
    status                      TEXT NOT NULL DEFAULT 'IN_PROGRESS'
                                CHECK (status IN ('NOT_STARTED','IN_PROGRESS','SUBMITTED')),
    started_at                  TIMESTAMPTZ,
    submitted_at                TIMESTAMPTZ,
    completion_time_seconds     INTEGER,
    score                       INTEGER NOT NULL DEFAULT 0,
    correct_count               INTEGER NOT NULL DEFAULT 0,
    wrong_count                 INTEGER NOT NULL DEFAULT 0,
    skipped_count               INTEGER NOT NULL DEFAULT 0,
    current_question_id         UUID REFERENCES public.questions(id),
    current_question_started_at TIMESTAMPTZ,
    current_question_deadline   TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Only ONE attempt per team per round
    UNIQUE (team_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_attempts_team_id  ON public.attempts(team_id);
CREATE INDEX IF NOT EXISTS idx_attempts_round_id ON public.attempts(round_id);

-- ─── ANSWERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.answers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id          UUID NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_id         UUID NOT NULL REFERENCES public.questions(id),
    selected_answer     TEXT CHECK (selected_answer IN ('A','B','C','D') OR selected_answer IS NULL),
    result              TEXT NOT NULL
                        CHECK (result IN ('CORRECT','WRONG','SKIPPED','TIMEOUT')),
    points              INTEGER NOT NULL,
    answered_at         TIMESTAMPTZ,
    response_time_ms    INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- One answer per question per attempt
    UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_answers_attempt_id  ON public.answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);

-- ─── QUALIFIED TEAMS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qualified_teams (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id                 UUID NOT NULL REFERENCES public.teams(id),
    round_id                TEXT NOT NULL REFERENCES public.rounds(id),
    qualification_rank      INTEGER NOT NULL,
    score                   INTEGER NOT NULL,
    completion_time_seconds INTEGER,
    qualified_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, round_id)
);

CREATE INDEX IF NOT EXISTS idx_qualified_teams_round ON public.qualified_teams(round_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualified_teams ENABLE ROW LEVEL SECURITY;

-- Backend service_role bypasses RLS (used by FastAPI backend only)
-- Frontend uses anon key — restrict access via RLS below

-- Rounds: participants can read round status (needed for waiting room realtime)
CREATE POLICY "rounds_read_authenticated"
    ON public.rounds FOR SELECT
    TO authenticated
    USING (TRUE);

-- Questions: participants CANNOT read questions directly via RLS
-- All question access goes through the FastAPI backend
CREATE POLICY "questions_backend_only"
    ON public.questions FOR ALL
    TO service_role
    USING (TRUE);

-- Teams: participant can read only their own team
CREATE POLICY "teams_read_own"
    ON public.teams FOR SELECT
    TO authenticated
    USING (team_lead_email = auth.jwt() ->> 'email');

-- Attempts: participant can read only their own
CREATE POLICY "attempts_read_own"
    ON public.attempts FOR SELECT
    TO authenticated
    USING (
        team_id IN (
            SELECT id FROM public.teams WHERE team_lead_email = auth.jwt() ->> 'email'
        )
    );

-- Admins: no direct access from frontend
CREATE POLICY "admins_no_frontend_access"
    ON public.admins FOR ALL
    TO authenticated
    USING (FALSE);

-- ============================================================
-- SEED DATA — Round 1
-- ============================================================

INSERT INTO public.rounds (id, name, round_number, status)
VALUES ('round-1', 'Round 1 — The First Voyage', 1, 'NOT_STARTED')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA — 25 Questions
-- ============================================================

INSERT INTO public.questions (round_id, question_number, category, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES

-- HTML (Q1-Q4)
('round-1', 1, 'HTML',
'Which statement about the HTML parser and a classic <script> without async or defer is correct?',
'The parser always continues while the script runs',
'The script runs only after DOMContentLoaded',
'The parser can be blocked while the script is fetched and executed',
'It is automatically treated as a module',
'C'),

('round-1', 2, 'HTML',
'What is the difference between defer and async for classic external scripts?',
'async preserves order while defer does not',
'Both always preserve execution order',
'defer preserves document order and waits for parsing; async executes when ready',
'defer blocks parsing while async does not',
'C'),

('round-1', 3, 'HTML',
'What is the purpose of the <template> element?',
'It creates an active DOM element immediately',
'Its contents are rendered but hidden',
'Its contents are stored in a DocumentFragment and remain inert until instantiated',
'Its contents are executed as JavaScript',
'C'),

('round-1', 4, 'HTML',
'Given: <form><input id="user" name="username"><label for="user">Username</label></form> — What does for="user" establish?',
'CSS inheritance',
'JavaScript event delegation',
'An explicit semantic association between the label and input',
'Automatic form submission',
'C'),

-- CSS (Q5-Q9)
('round-1', 5, 'CSS',
'Which selector has the highest specificity?',
'.a .b .c',
'div.a.b',
'#x .a',
'section#x.a',
'D'),

('round-1', 6, 'CSS',
'Given CSS cascade layers (@layer base, components) with unlayered .title{color:red} — what color is applied?',
'Blue',
'Green',
'Red',
'Browser-dependent',
'C'),

('round-1', 7, 'CSS',
'Which property can establish a new stacking context when its computed value is not none?',
'margin',
'padding',
'transform',
'overflow-inline',
'C'),

('round-1', 8, 'CSS',
'A .box has width:300px, padding:30px, border:10px solid, box-sizing:border-box. What is the total outer width?',
'340px',
'380px',
'300px',
'360px',
'C'),

('round-1', 9, 'CSS',
'What is the critical difference between :first-child and :first-of-type?',
':first-child works only with classes',
':first-child considers all siblings, while :first-of-type considers siblings of the same element type',
'They always behave identically',
'They work only with IDs',
'B'),

-- JAVASCRIPT (Q10-Q17)
('round-1', 10, 'JAVASCRIPT',
'What is the output of: console.log(typeof null);',
'null',
'undefined',
'object',
'empty',
'C'),

('round-1', 11, 'JAVASCRIPT',
'What is the output of: console.log([] == ![]);',
'false',
'undefined',
'true',
'TypeError',
'C'),

('round-1', 12, 'JAVASCRIPT',
'What is the output order of: console.log("A"); setTimeout(()=>console.log("B"),0); queueMicrotask(()=>console.log("C")); Promise.resolve().then(()=>console.log("D")); console.log("E");',
'A B C D E',
'A E D C B',
'A E C D B',
'A C D E B',
'C'),

('round-1', 13, 'JAVASCRIPT',
'What happens: let x = 10; { console.log(x); let x = 20; }',
'10',
'20',
'undefined',
'ReferenceError',
'D'),

('round-1', 14, 'JAVASCRIPT',
'What is the result of: Object.is(NaN, NaN); and NaN === NaN;',
'false, false',
'true, true',
'true, false',
'false, true',
'C'),

('round-1', 15, 'JAVASCRIPT',
'What is the output of: console.log([] + {});',
'0',
'[]',
'"[object Object]"',
'NaN',
'C'),

('round-1', 16, 'JAVASCRIPT',
'In strict mode: const obj = {value:10, getValue(){return this.value;}}; const fn = obj.getValue; console.log(fn()); — What happens?',
'10',
'undefined',
'TypeError because this is undefined',
'null',
'C'),

('round-1', 17, 'JAVASCRIPT',
'Which statement best describes closures?',
'Closures only work with global variables',
'Closures automatically make a function asynchronous',
'Closures allow a function to preserve access to variables from its lexical environment',
'Closures copy every variable into global scope',
'C'),

-- WEB TECHNOLOGY (Q18-Q22)
('round-1', 18, 'WEB TECHNOLOGY',
'A browser sends an OPTIONS request before a cross-origin PUT request containing a custom header. What is this?',
'DNS request',
'TLS handshake',
'CORS preflight',
'HTTP redirect',
'C'),

('round-1', 19, 'WEB TECHNOLOGY',
'Which HTTP status code indicates a request has been accepted for processing, but processing may not yet be complete?',
'200',
'201',
'202',
'204',
'C'),

('round-1', 20, 'WEB TECHNOLOGY',
'Which HTTP method is generally idempotent but not safe?',
'GET',
'HEAD',
'PUT',
'OPTIONS',
'C'),

('round-1', 21, 'WEB TECHNOLOGY',
'Which DNS record maps a hostname directly to an IPv6 address?',
'A',
'AAAA',
'CNAME',
'MX',
'B'),

('round-1', 22, 'WEB TECHNOLOGY',
'Which statement correctly describes HTTP/2 compared with HTTP/1.1?',
'HTTP/2 eliminates TCP',
'HTTP/2 creates one TCP connection for every request',
'HTTP/2 multiplexes multiple streams over a single connection',
'HTTP/2 does not support HTTPS',
'C'),

-- WEB SECURITY & BROWSER INTERNALS (Q23-Q25)
('round-1', 23, 'WEB SECURITY & BROWSER INTERNALS',
'Which combination provides the strongest direct protection against JavaScript reading a session cookie and sending it over plain HTTP?',
'SameSite + Domain',
'Path + Max-Age',
'HttpOnly + Secure',
'Expires + SameSite',
'C'),

('round-1', 24, 'WEB SECURITY & BROWSER INTERNALS',
'Which browser security mechanism restricts a script from one origin from reading protected data from another origin?',
'DNSSEC',
'TLS',
'Same-Origin Policy',
'HTTP compression',
'C'),

('round-1', 25, 'WEB SECURITY & BROWSER INTERNALS',
'After the current JavaScript task finishes, what happens next when microtasks and a timer are pending?',
'Timer → microtasks → rendering',
'Rendering → timer → microtasks',
'Microtasks → next eligible task',
'Timer → rendering → microtasks',
'C')

ON CONFLICT (round_id, question_number) DO NOTHING;
