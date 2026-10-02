-- Seed admin user (run AFTER creating admin account via Supabase Auth dashboard)
-- Replace the UUID and email with the actual Supabase Auth user ID for clubcyberhub@gmail.com

-- Step 1: Log in to Supabase dashboard → Authentication → Users
-- Step 2: Find the user ID for clubcyberhub@gmail.com
-- Step 3: Replace 'REPLACE-WITH-AUTH-USER-UUID' below with the actual UUID

-- INSERT INTO public.admins (user_id, email, role)
-- VALUES ('REPLACE-WITH-AUTH-USER-UUID', 'clubcyberhub@gmail.com', 'ADMIN')
-- ON CONFLICT (user_id) DO NOTHING;

-- Alternatively, run this after the admin signs up via the app:
-- UPDATE public.admins SET role = 'ADMIN' WHERE email = 'clubcyberhub@gmail.com';

-- NOTE: The seed_admin.sql is intentionally commented out as a safety measure.
-- You MUST manually get the UUID from Supabase Auth and insert it.
-- This prevents unauthorized admin access during development.
SELECT 'Admin seed: Manually insert admin UUID from Supabase Auth dashboard' AS instruction;
