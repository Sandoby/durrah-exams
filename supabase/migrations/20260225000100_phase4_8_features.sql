-- ============================================================================
-- PHASE 4: ANNOUNCEMENTS & COMMUNICATION
-- ============================================================================

-- Create classroom_announcements table
CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create classroom_announcement_comments table
CREATE TABLE IF NOT EXISTS public.classroom_announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.classroom_announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- PHASE 5: ASSIGNMENTS SYSTEM
-- ============================================================================

-- Create classroom_assignments table
CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  instructions TEXT DEFAULT '',
  category TEXT DEFAULT 'homework', -- homework, project, quiz, midterm, final
  due_date TIMESTAMP WITH TIME ZONE,
  max_score INTEGER DEFAULT 100,
  allow_late BOOLEAN DEFAULT TRUE,
  late_penalty_percent INTEGER DEFAULT 10,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  files JSONB DEFAULT '[]'::jsonb,
  score INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  graded_at TIMESTAMP WITH TIME ZONE,
  is_late BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- PHASE 6: GRADEBOOK & ANALYTICS
-- ============================================================================

-- Create grade_categories table
CREATE TABLE IF NOT EXISTS public.grade_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight_percent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create grade_entries table
CREATE TABLE IF NOT EXISTS public.grade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.grade_categories(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'exam', 'assignment', 'manual'
  source_id UUID,
  score DECIMAL(5,2),
  max_score DECIMAL(5,2) DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- PHASE 7: ATTENDANCE & CALENDAR
-- ============================================================================

-- Create classroom_attendance table
CREATE TABLE IF NOT EXISTS public.classroom_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'absent', -- present, absent, late, excused
  notes TEXT,
  marked_by UUID REFERENCES public.auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(classroom_id, student_id, date)
);

-- ============================================================================
-- PHASE 8: ADVANCED FEATURES
-- ============================================================================

-- Create classroom_teachers (co-teacher support)
CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'co-teacher', -- owner, co-teacher, assistant
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(classroom_id, teacher_id)
);

-- Create classroom_resources table
CREATE TABLE IF NOT EXISTS public.classroom_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- pdf, doc, image, video, link
  file_url TEXT,
  folder TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create classroom_templates table
CREATE TABLE IF NOT EXISTS public.classroom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create parent_student_links table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  relationship TEXT, -- mother, father, guardian, etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Create classroom_discussions table (forums)
CREATE TABLE IF NOT EXISTS public.classroom_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_answered BOOLEAN DEFAULT FALSE,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create classroom_discussion_replies table
CREATE TABLE IF NOT EXISTS public.classroom_discussion_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id UUID NOT NULL REFERENCES public.classroom_discussions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 0,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- announcement, assignment, grade, attendance, discussion, general
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.auth.users(id) ON DELETE CASCADE,
  announcement BOOLEAN DEFAULT TRUE,
  assignment BOOLEAN DEFAULT TRUE,
  grade BOOLEAN DEFAULT TRUE,
  attendance BOOLEAN DEFAULT TRUE,
  discussion BOOLEAN DEFAULT TRUE,
  email_digest TEXT DEFAULT 'weekly', -- none, daily, weekly
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES - Announcements
-- ============================================================================

ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutor can create announcements in own classroom"
  ON public.classroom_announcements
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classrooms
    WHERE id = classroom_id
    AND tutor_id = auth.uid()
  ));

CREATE POLICY "Enrolled students can view announcements"
  ON public.classroom_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_students
      WHERE classroom_id = classroom_announcements.classroom_id
      AND student_id = auth.uid()
      AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_announcements.classroom_id
      AND tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutor can update own announcements"
  ON public.classroom_announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id
      AND tutor_id = auth.uid()
    )
  );

CREATE POLICY "Tutor can delete own announcements"
  ON public.classroom_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id
      AND tutor_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - Announcements Comments
-- ============================================================================

ALTER TABLE public.classroom_announcement_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Classroom members can view comments"
  ON public.classroom_announcement_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_announcements ca
      WHERE ca.id = announcement_id
      AND (
        EXISTS (
          SELECT 1 FROM public.classroom_students
          WHERE classroom_id = ca.classroom_id
          AND student_id = auth.uid()
          AND status = 'active'
        ) OR EXISTS (
          SELECT 1 FROM public.classrooms
          WHERE id = ca.classroom_id
          AND tutor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Classroom members can create comments"
  ON public.classroom_announcement_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classroom_announcements ca
      WHERE ca.id = announcement_id
      AND (
        EXISTS (
          SELECT 1 FROM public.classroom_students
          WHERE classroom_id = ca.classroom_id
          AND student_id = auth.uid()
          AND status = 'active'
        ) OR EXISTS (
          SELECT 1 FROM public.classrooms
          WHERE id = ca.classroom_id
          AND tutor_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete own comments, tutor can delete any"
  ON public.classroom_announcement_comments
  FOR DELETE
  USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.classroom_announcements ca
      JOIN public.classrooms c ON c.id = ca.classroom_id
      WHERE ca.id = announcement_id
      AND c.tutor_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - Assignments
-- ============================================================================

ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutor can manage assignments in own classroom"
  ON public.classroom_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id
      AND tutor_id = auth.uid()
    )
  );

CREATE POLICY "Enrolled students can view published assignments"
  ON public.classroom_assignments
  FOR SELECT
  USING (
    is_published = TRUE AND EXISTS (
      SELECT 1 FROM public.classroom_students
      WHERE classroom_id = classroom_id
      AND student_id = auth.uid()
      AND status = 'active'
    )
  );

-- ============================================================================
-- RLS POLICIES - Submissions
-- ============================================================================

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can manage own submissions"
  ON public.assignment_submissions
  FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Tutor can view submissions for own assignments"
  ON public.assignment_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_assignments ca
      JOIN public.classrooms c ON c.id = ca.classroom_id
      WHERE ca.id = assignment_id
      AND c.tutor_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - Attendance
-- ============================================================================

ALTER TABLE public.classroom_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutor can manage attendance"
  ON public.classroom_attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms
      WHERE id = classroom_id
      AND tutor_id = auth.uid()
    )
  );

CREATE POLICY "Student can view own attendance"
  ON public.classroom_attendance
  FOR SELECT
  USING (student_id = auth.uid());

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX idx_classroom_announcements_classroom_id ON public.classroom_announcements(classroom_id);
CREATE INDEX idx_classroom_announcements_created_at ON public.classroom_announcements(created_at DESC);
CREATE INDEX idx_announcement_comments_announcement_id ON public.classroom_announcement_comments(announcement_id);
CREATE INDEX idx_assignments_classroom_id ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX idx_attendance_classroom_id ON public.classroom_attendance(classroom_id);
CREATE INDEX idx_attendance_student_id ON public.classroom_attendance(student_id);
CREATE INDEX idx_discussions_classroom_id ON public.classroom_discussions(classroom_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_grade_entries_student_id ON public.grade_entries(student_id);
CREATE INDEX idx_grade_entries_classroom_id ON public.grade_entries(classroom_id);
