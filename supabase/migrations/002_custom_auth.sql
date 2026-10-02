-- ============================================================
-- Cryptic Tide: Migrate teams table to custom auth (no Supabase Auth)
-- Run this in Supabase SQL Editor BEFORE running seed_teams.sql
-- ============================================================

-- Step 1: Add new columns to existing teams table
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS team_number     INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS password_hash   TEXT,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS current_session_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Create index on team_number and email for fast lookups
CREATE INDEX IF NOT EXISTS idx_teams_team_number ON public.teams(team_number);

-- Step 3: Create a new admins table that does NOT depend on Supabase auth.users
-- (keep old one, add custom-auth admins table)
CREATE TABLE IF NOT EXISTS public.admin_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT 'Admin',
    role            TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    current_session_id TEXT DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Disable RLS on teams so backend service role can freely manage it
-- (already using service_role key which bypasses RLS anyway)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualified_teams DISABLE ROW LEVEL SECURITY;
