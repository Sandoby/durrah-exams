-- ============================================================
-- MIGRATION: Create Classrooms & Student Management tables
-- Date: 2026-02-15
-- Module: A — Student Management & Classrooms
-- ============================================================

-- 1. Extend profiles table with student-specific fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS parent_email TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT,
  ADD COLUMN IF NOT EXISTS grade_level TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS student_number TEXT;

-- 2. Classrooms table
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  grade_level TEXT DEFAULT '',
  cover_image TEXT,
  color TEXT DEFAULT '#3B82F6',
  invite_code TEXT NOT NULL UNIQUE,
  academic_year TEXT DEFAULT '',
  is_archived BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{
    "auto_approve_students": true,
    "max_capacity": 100,
    "allow_student_chat": true,
    "show_student_list_to_students": false
  }'::jsonb,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_classrooms_tutor_id ON public.classrooms(tutor_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_invite_code ON public.classrooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_archived ON public.classrooms(is_archived);

-- 3. Classroom-Student enrollment table
CREATE TABLE IF NOT EXISTS public.classroom_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended', 'removed')),
  enrollment_method TEXT DEFAULT 'invite_code' CHECK (enrollment_method IN ('invite_code', 'manual', 'link', 'csv_import')),
  notes TEXT DEFAULT '',
  UNIQUE(classroom_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom ON public.classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student ON public.classroom_students(student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_status ON public.classroom_students(status);

-- 4. Classroom-Exam linking table (link existing exams to classrooms)
CREATE TABLE IF NOT EXISTS public.classroom_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(classroom_id, exam_id)
);

CREATE INDEX IF NOT EXISTS idx_classroom_exams_classroom ON public.classroom_exams(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_exams_exam ON public.classroom_exams(exam_id);

-- 5. Function to generate unique 6-character invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-char alphanumeric code (uppercase, no ambiguous chars like 0/O, 1/I/L)
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 30 + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM public.classrooms WHERE invite_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to auto-update student_count on enrollment changes
CREATE OR REPLACE FUNCTION update_classroom_student_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.classrooms
    SET student_count = (
      SELECT COUNT(*) FROM public.classroom_students
      WHERE classroom_id = NEW.classroom_id AND status = 'active'
    ),
    updated_at = now()
    WHERE id = NEW.classroom_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    UPDATE public.classrooms
    SET student_count = (
      SELECT COUNT(*) FROM public.classroom_students
      WHERE classroom_id = OLD.classroom_id AND status = 'active'
    ),
    updated_at = now()
    WHERE id = OLD.classroom_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_classroom_student_count
AFTER INSERT OR UPDATE OR DELETE ON public.classroom_students
FOR EACH ROW EXECUTE FUNCTION update_classroom_student_count();

-- 7. Function to auto-set updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_classrooms_updated_at
BEFORE UPDATE ON public.classrooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS POLICIES for classrooms module
-- ============================================================

-- Enable RLS
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_exams ENABLE ROW LEVEL SECURITY;

-- CLASSROOMS ──────────────────────────────────

-- Tutors can read their own classrooms
CREATE POLICY "Tutors can view own classrooms"
  ON public.classrooms FOR SELECT
  USING (auth.uid() = tutor_id);

-- Students can read classrooms they're enrolled in
CREATE POLICY "Students can view enrolled classrooms"
  ON public.classrooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students
      WHERE classroom_students.classroom_id = classrooms.id
      AND classroom_students.student_id = auth.uid()
      AND classroom_students.status = 'active'
    )
  );

-- Anyone authenticated can read a classroom by invite code (for joining)
CREATE POLICY "Anyone can lookup classroom by invite code"
  ON public.classrooms FOR SELECT
  USING (auth.role() = 'authenticated');

-- Tutors can create classrooms
CREATE POLICY "Tutors can create classrooms"
  ON public.classrooms FOR INSERT
  WITH CHECK (auth.uid() = tutor_id);

-- Tutors can update their own classrooms
CREATE POLICY "Tutors can update own classrooms"
  ON public.classrooms FOR UPDATE
  USING (auth.uid() = tutor_id);

-- Tutors can delete their own classrooms
CREATE POLICY "Tutors can delete own classrooms"
  ON public.classrooms FOR DELETE
  USING (auth.uid() = tutor_id);

-- CLASSROOM_STUDENTS ──────────────────────────

-- Tutors can view students in their classrooms
CREATE POLICY "Tutors can view classroom students"
  ON public.classroom_students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_students.classroom_id
      AND classrooms.tutor_id = auth.uid()
    )
  );

-- Students can view their own enrollments
CREATE POLICY "Students can view own enrollments"
  ON public.classroom_students FOR SELECT
  USING (student_id = auth.uid());

-- Students can enroll themselves (insert)
CREATE POLICY "Students can enroll themselves"
  ON public.classroom_students FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Tutors can manage enrollments in their classrooms (insert/update/delete)
CREATE POLICY "Tutors can manage enrollments"
  ON public.classroom_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_students.classroom_id
      AND classrooms.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can update enrollments"
  ON public.classroom_students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_students.classroom_id
      AND classrooms.tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutors can remove students"
  ON public.classroom_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_students.classroom_id
      AND classrooms.tutor_id = auth.uid()
    )
  );

-- CLASSROOM_EXAMS ─────────────────────────────

-- Tutors can manage exam links for their classrooms
CREATE POLICY "Tutors can manage classroom exams"
  ON public.classroom_exams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE classrooms.id = classroom_exams.classroom_id
      AND classrooms.tutor_id = auth.uid()
    )
  );

-- Students can view exams linked to their classrooms
CREATE POLICY "Students can view classroom exams"
  ON public.classroom_exams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students
      WHERE classroom_students.classroom_id = classroom_exams.classroom_id
      AND classroom_students.student_id = auth.uid()
      AND classroom_students.status = 'active'
    )
  );

-- ============================================================
-- RPC FUNCTION: Get classroom stats
-- ============================================================

CREATE OR REPLACE FUNCTION get_classroom_stats(p_classroom_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify the caller owns this classroom
  IF NOT EXISTS (
    SELECT 1 FROM public.classrooms WHERE id = p_classroom_id AND tutor_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_students', (SELECT COUNT(*) FROM classroom_students WHERE classroom_id = p_classroom_id AND status = 'active'),
    'pending_students', (SELECT COUNT(*) FROM classroom_students WHERE classroom_id = p_classroom_id AND status = 'pending'),
    'linked_exams', (SELECT COUNT(*) FROM classroom_exams WHERE classroom_id = p_classroom_id),
    'total_submissions', (
      SELECT COUNT(*) FROM submissions s
      INNER JOIN classroom_exams ce ON ce.exam_id = s.exam_id
      WHERE ce.classroom_id = p_classroom_id
    ),
    'avg_score_percent', (
      SELECT COALESCE(ROUND(AVG(
        CASE WHEN s.max_score > 0 THEN (s.score::float / s.max_score * 100) ELSE 0 END
      )), 0)
      FROM submissions s
      INNER JOIN classroom_exams ce ON ce.exam_id = s.exam_id
      WHERE ce.classroom_id = p_classroom_id
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
