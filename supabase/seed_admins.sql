-- ============================================================
-- Cryptic Tide — Admin Accounts Seed
-- Run AFTER 002_custom_auth.sql in Supabase SQL Editor
-- ============================================================

INSERT INTO public.admin_accounts (name, email, password_hash, role, is_active)
VALUES
  ('Admin 001', 'admin001@cryptictide.in', '$2b$12$QW18CNux.p4//cVw0lrKr.HxrG.xxRu45abCrw9TE1r4dwNjc5jZm', 'SUPER_ADMIN', TRUE),
  ('Admin 002', 'admin002@cryptictide.in', '$2b$12$2XU8MmHvbtWKnhUYitxVm.GYuYA3nQ044LVgWVUFsCWy9vij.pA8W', 'ADMIN', TRUE),
  ('Admin 003', 'admin003@cryptictide.in', '$2b$12$7H0uRGyvzgTUM6ZwBAMPyukcotSuyW8jlkVmb7t3xp61UqyZLsQa6', 'ADMIN', TRUE),
  ('Admin 004', 'admin004@cryptictide.in', '$2b$12$oKkhg7qjYui8PKL/jtG0vOxygj4ni3KT0PPFGHMNpSPN3945vhzq.', 'ADMIN', TRUE),
  ('Admin 005', 'admin005@cryptictide.in', '$2b$12$jrGvLiTygMm6VZrJgNZGA.7vBJ./6xCAogbw9RvDMnrKfWlpb2ipa', 'ADMIN', TRUE);
