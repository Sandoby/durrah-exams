-- ============================================================
-- MIGRATION: Fix classroom tutor_id to reference profiles
-- Date: 2026-02-15
-- Purpose: Change tutor_id FK from auth.users to profiles for proper joins
-- ============================================================

-- Drop the old foreign key constraint
ALTER TABLE public.classrooms 
  DROP CONSTRAINT IF EXISTS classrooms_tutor_id_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE public.classrooms
  ADD CONSTRAINT classrooms_tutor_id_fkey 
  FOREIGN KEY (tutor_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
