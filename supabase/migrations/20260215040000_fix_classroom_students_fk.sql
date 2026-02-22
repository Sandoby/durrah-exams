-- ============================================================
-- MIGRATION: Fix classroom_students student_id FK to reference profiles
-- Date: 2026-02-15
-- Purpose: Change student_id FK from auth.users to profiles for proper joins
-- ============================================================

-- Drop the old foreign key constraint
ALTER TABLE public.classroom_students 
  DROP CONSTRAINT IF EXISTS classroom_students_student_id_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE public.classroom_students
  ADD CONSTRAINT classroom_students_student_id_fkey 
  FOREIGN KEY (student_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
