# Phase 1 — Student Management & Classrooms: Detailed Implementation Plan

> **Module A** from the Full Platform Plan  
> **Timeline:** Weeks 1–2  
> **Goal:** Tutors can create classrooms, invite students, manage rosters, and link exams to classrooms.

---

## Table of Contents

1. [Prerequisites & Preparation](#1-prerequisites--preparation)
2. [Database Schema (Supabase Migration)](#2-database-schema-supabase-migration)
3. [Row Level Security (RLS) Policies](#3-row-level-security-rls-policies)
4. [Backend: Supabase Edge Functions](#4-backend-supabase-edge-functions)
5. [Auth System Changes](#5-auth-system-changes)
6. [Frontend: New Types](#6-frontend-new-types)
7. [Frontend: Hooks & Services](#7-frontend-hooks--services)
8. [Frontend: Pages & Components](#8-frontend-pages--components)
9. [Frontend: Routing Updates](#9-frontend-routing-updates)
10. [i18n Translations](#10-i18n-translations)
11. [Dashboard Redesign](#11-dashboard-redesign)
12. [Student-Side Experience](#12-student-side-experience)
13. [Mobile (Capacitor) Considerations](#13-mobile-capacitor-considerations)
14. [Testing Plan](#14-testing-plan)
15. [Task Breakdown (Day-by-Day)](#15-task-breakdown-day-by-day)

---

## 1. Prerequisites & Preparation

### Before starting any code:

- [ ] **Backup current database** — Export existing Supabase schema and data
- [ ] **Create feature branch** — `feature/classrooms-module`
- [ ] **Install new dependencies:**
  ```bash
  cd frontend
  npm install @dnd-kit/core @dnd-kit/sortable papaparse
  npm install -D @types/papaparse
  ```
- [ ] **Create new folders:**
  ```
  frontend/src/
  ├── pages/classrooms/
  │   ├── ClassroomList.tsx
  │   ├── ClassroomCreate.tsx
  │   ├── ClassroomDetail.tsx
  │   ├── ClassroomSettings.tsx
  │   └── components/
  │       ├── ClassroomCard.tsx
  │       ├── InviteCodeDisplay.tsx
  │       ├── StudentRoster.tsx
  │       ├── EnrollmentModal.tsx
  │       ├── BulkImportModal.tsx
  │       ├── StudentProfileCard.tsx
  │       ├── TransferStudentModal.tsx
  │       └── ClassroomSidebar.tsx
  ├── hooks/
  │   ├── useClassrooms.ts
  │   ├── useClassroomStudents.ts
  │   └── useInviteCode.ts
  ├── types/
  │   └── classroom.ts
  ```

---

## 2. Database Schema (Supabase Migration)

### Migration file: `supabase/migrations/20260215000000_create_classrooms.sql`

```sql
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

-- 8. Notification on student join (reuse existing notifications table)
-- Students joining a classroom will trigger a notification for the tutor.
```

---

## 3. Row Level Security (RLS) Policies

```sql
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
```

---

## 4. Backend: Supabase Edge Functions

### 4.1 — `join-classroom` Edge Function

**Path:** `supabase/functions/join-classroom/index.ts`

**Purpose:** Validates invite code, checks capacity, handles auto-approve vs pending, notifies tutor.

```
Request:  POST { invite_code: string }
Response: { success: true, classroom: { id, name, subject }, status: 'active' | 'pending' }
Errors:   404 (invalid code), 403 (classroom full), 409 (already enrolled), 403 (archived)
```

**Logic:**
1. Get authenticated user from JWT
2. Lookup classroom by `invite_code`
3. Validate: not archived, not at max capacity
4. Check if already enrolled → return 409
5. Determine status: `active` if `auto_approve_students` is true, else `pending` 
6. Insert into `classroom_students`
7. If user profile has no role → set `role: 'student'`
8. Create notification for tutor: "New student {name} joined {classroom}"
9. Return classroom info + enrollment status

### 4.2 — `generate-classroom-code` RPC Function

**Already handled by the SQL function** `generate_invite_code()`. Called in the frontend before insert:

```typescript
const { data } = await supabase.rpc('generate_invite_code');
```

### 4.3 — `classroom-stats` RPC Function

**Path:** SQL RPC in migration

```sql
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
```

---

## 5. Auth System Changes

### 5.1 — Update `UserRole` type

**File:** `frontend/src/context/AuthContext.tsx`

```typescript
// BEFORE:
type UserRole = 'admin' | 'agent' | 'tutor' | null;

// AFTER:
type UserRole = 'admin' | 'agent' | 'tutor' | 'student' | null;
```

### 5.2 — Update `ProtectedRoute` component

**File:** `frontend/src/components/ProtectedRoute.tsx`

Add a new `TutorRoute` that blocks students from tutor-only pages:

```typescript
export function TutorRoute({ children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'student') return <Navigate to="/my/classrooms" replace />;
  
  return <>{children}</>;
}
```

### 5.3 — Role-Based Dashboard Redirect

**File:** `frontend/src/App.tsx`

After login, redirect based on role:
- `tutor` / `admin` → `/dashboard`
- `student` → `/my/classrooms`
- `agent` → `/agent`

```typescript
// In the "/" route:
element={
  loading ? null :
  user ? (
    role === 'student' ? <Navigate to="/my/classrooms" replace /> :
    <Navigate to="/dashboard" replace />
  ) : (isNative ? <MobileWelcome /> : <LandingPage />)
}
```

---

## 6. Frontend: New Types

### File: `frontend/src/types/classroom.ts`

```typescript
export interface Classroom {
  id: string;
  tutor_id: string;
  name: string;
  description: string;
  subject: string;
  grade_level: string;
  cover_image: string | null;
  color: string;
  invite_code: string;
  academic_year: string;
  is_archived: boolean;
  settings: ClassroomSettings;
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClassroomSettings {
  auto_approve_students: boolean;
  max_capacity: number;
  allow_student_chat: boolean;
  show_student_list_to_students: boolean;
}

export interface ClassroomStudent {
  id: string;
  classroom_id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'pending' | 'suspended' | 'removed';
  enrollment_method: 'invite_code' | 'manual' | 'link' | 'csv_import';
  notes: string;
  // Joined from profiles:
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    grade_level: string | null;
    school_name: string | null;
  };
}

export interface ClassroomExam {
  id: string;
  classroom_id: string;
  exam_id: string;
  added_at: string;
  // Joined from exams:
  exam?: {
    title: string;
    description: string;
    is_active: boolean;
    created_at: string;
  };
}

export type ClassroomTab = 'overview' | 'roster' | 'exams' | 'settings';

export interface ClassroomFormData {
  name: string;
  description: string;
  subject: string;
  grade_level: string;
  color: string;
  academic_year: string;
  settings: ClassroomSettings;
}

export interface BulkImportRow {
  name: string;
  email: string;
  parent_email?: string;
}
```

---

## 7. Frontend: Hooks & Services

### 7.1 — `useClassrooms.ts`

**File:** `frontend/src/hooks/useClassrooms.ts`

```typescript
// Responsibilities:
// - Fetch tutor's classrooms (with optional archived filter)
// - Create classroom (generate invite code, insert)
// - Update classroom
// - Delete classroom
// - Archive/unarchive classroom
// - Get single classroom by ID

// Key functions:
export function useClassrooms() {
  // State: classrooms[], isLoading, error
  
  fetchClassrooms(includeArchived?: boolean)
  // SELECT * FROM classrooms WHERE tutor_id = auth.uid()
  // ORDER BY is_archived ASC, created_at DESC
  
  createClassroom(data: ClassroomFormData): Promise<Classroom>
  // 1. Call supabase.rpc('generate_invite_code')
  // 2. INSERT into classrooms with generated code
  // 3. Return new classroom
  
  updateClassroom(id: string, data: Partial<ClassroomFormData>): Promise<void>
  // UPDATE classrooms SET ... WHERE id = $id AND tutor_id = auth.uid()
  
  deleteClassroom(id: string): Promise<void>
  // DELETE FROM classrooms WHERE id = $id AND tutor_id = auth.uid()
  // (CASCADE will remove classroom_students and classroom_exams)
  
  archiveClassroom(id: string, archive: boolean): Promise<void>
  // UPDATE classrooms SET is_archived = $archive WHERE id = $id
  
  getClassroom(id: string): Promise<Classroom>
  // SELECT * FROM classrooms WHERE id = $id
}
```

### 7.2 — `useClassroomStudents.ts`

**File:** `frontend/src/hooks/useClassroomStudents.ts`

```typescript
// Responsibilities:
// - Fetch enrolled students with profile data
// - Add student manually by email
// - Bulk import students from CSV
// - Update student status (approve, suspend, remove)
// - Transfer student to another classroom

export function useClassroomStudents(classroomId: string) {
  // State: students[], isLoading, error

  fetchStudents(filters?: { status?: string; search?: string })
  // SELECT cs.*, p.full_name, p.email, p.avatar_url, p.grade_level, p.school_name
  // FROM classroom_students cs
  // JOIN profiles p ON p.id = cs.student_id
  // WHERE cs.classroom_id = $classroomId
  // ORDER BY cs.enrolled_at DESC

  addStudentByEmail(email: string): Promise<{ success: boolean; status: string }>
  // 1. Lookup user by email in profiles
  // 2. If not found → create invitation (store email, send notification)
  // 3. If found → INSERT into classroom_students
  // 4. Check for duplicates (UNIQUE constraint)

  bulkImportStudents(rows: BulkImportRow[]): Promise<BulkImportResult>
  // 1. Parse CSV rows
  // 2. For each row: lookup profile by email
  // 3. Batch insert into classroom_students
  // 4. Return: { imported: number, skipped: number, errors: string[] }

  updateStudentStatus(studentId: string, status: 'active' | 'suspended' | 'removed')
  // UPDATE classroom_students SET status = $status WHERE classroom_id AND student_id

  approveStudent(studentId: string)
  // UPDATE classroom_students SET status = 'active' WHERE ... AND status = 'pending'

  removeStudent(studentId: string)
  // DELETE FROM classroom_students WHERE classroom_id AND student_id

  transferStudent(studentId: string, targetClassroomId: string)
  // 1. INSERT into classroom_students (target classroom)
  // 2. DELETE from classroom_students (current classroom)
}
```

### 7.3 — `useInviteCode.ts`

**File:** `frontend/src/hooks/useInviteCode.ts`

```typescript
// Used by students to join a classroom

export function useInviteCode() {
  joinClassroom(inviteCode: string): Promise<JoinResult>
  // 1. SELECT classroom by invite_code
  // 2. Validate not archived, not full
  // 3. Check not already enrolled
  // 4. INSERT into classroom_students
  // 5. Return result
  
  lookupClassroom(inviteCode: string): Promise<ClassroomPreview>
  // SELECT id, name, subject, grade_level, tutor:profiles(full_name)
  // FROM classrooms WHERE invite_code = $code AND is_archived = false
}
```

---

## 8. Frontend: Pages & Components

### 8.1 — `ClassroomList.tsx` (Tutor View)

**Route:** `/classrooms`

**Layout:**
```
┌──────────────────────────────────────────────────┐
│  ← Dashboard    My Classrooms         + New Class │
│                                                    │
│  [🔍 Search]  [Filter: Active ▾]  [Sort: Recent ▾] │
│                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │ 🔵         │  │ 🟢         │  │ 🟡         │  │
│  │ Math 101   │  │ Physics    │  │ English    │  │
│  │ Grade 10   │  │ Grade 11   │  │ Grade 9    │  │
│  │ 24 students│  │ 18 students│  │ 32 students│  │
│  │ 5 exams    │  │ 3 exams    │  │ 8 exams    │  │
│  └────────────┘  └────────────┘  └────────────┘  │
│                                                    │
│  ── Archived ──                                    │
│  ┌────────────┐                                    │
│  │ 🗄️ Bio 2024│                                    │
│  └────────────┘                                    │
└──────────────────────────────────────────────────┘
```

**Features:**
- Grid of `ClassroomCard` components
- Search by name/subject
- Filter: Active / Archived / All
- Sort: Recent / Name / Student Count
- Empty state with illustration + "Create your first classroom" CTA
- Quick stats per card (student count, exam count)

### 8.2 — `ClassroomCreate.tsx`

**Route:** `/classrooms/new`

**Form Fields:**
```
┌──────────────────────────────────────────┐
│  Create New Classroom                     │
│                                          │
│  Classroom Name *     [_______________]  │
│  Subject              [_______________]  │
│  Grade Level          [_______________]  │
│  Academic Year        [2025-2026    ▾]   │
│  Description          [_______________]  │
│                       [_______________]  │
│                                          │
│  Color   [🔵][🟢][🟡][🟠][🔴][🟣][⚫]  │
│                                          │
│  Settings                                │
│  ☑ Auto-approve students                 │
│  Max capacity    [100_]                  │
│  ☐ Show student list to students         │
│                                          │
│           [Cancel]  [Create Classroom]   │
└──────────────────────────────────────────┘
```

**Validation (Zod):**
```typescript
const classroomSchema = z.object({
  name: z.string().min(2).max(100),
  subject: z.string().max(50).optional(),
  grade_level: z.string().max(30).optional(),
  academic_year: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  settings: z.object({
    auto_approve_students: z.boolean(),
    max_capacity: z.number().min(1).max(1000),
    allow_student_chat: z.boolean(),
    show_student_list_to_students: z.boolean(),
  }),
});
```

### 8.3 — `ClassroomDetail.tsx`

**Route:** `/classrooms/:id`

**Layout — Tabbed interface:**
```
┌──────────────────────────────────────────────────────┐
│  ← Classrooms    Math 101 — Grade 10                  │
│  🔵 24 students · 5 exams · Invite: ABC123            │
│                                                        │
│  [Overview] [Roster] [Exams] [Settings]                │
│  ──────────────────────────────────────                │
│                                                        │
│  (Tab content below)                                   │
└──────────────────────────────────────────────────────┘
```

#### Tab: Overview
```
┌──────────────────────────────────────────┐
│  Quick Stats                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
│  │  24  │ │  5   │ │ 142  │ │ 78%  │    │
│  │studs │ │exams │ │subms │ │ avg  │    │
│  └──────┘ └──────┘ └──────┘ └──────┘    │
│                                          │
│  Invite Students                          │
│  ┌──────────────────────────────┐        │
│  │  Code: ABC123    [📋 Copy]   │        │
│  │  Link: durrah.../join/ABC123 │        │
│  │  [📤 Share via WhatsApp]     │        │
│  └──────────────────────────────┘        │
│                                          │
│  Recent Activity                          │
│  • Sara submitted Math Exam 3  (2h ago)  │
│  • Ahmed joined the classroom  (5h ago)  │
│  • New exam "Quiz 4" was linked (1d ago) │
└──────────────────────────────────────────┘
```

#### Tab: Roster (StudentRoster component)
```
┌────────────────────────────────────────────────────┐
│  [🔍 Search]  [+ Add Student]  [📥 Import CSV]     │
│  [Filter: All ▾]                                    │
│                                                     │
│  ┌──┬──────────────┬─────────────┬────────┬──────┐ │
│  │  │ Student      │ Email       │ Status │ ···  │ │
│  ├──┼──────────────┼─────────────┼────────┼──────┤ │
│  │🟢│ Sara Ahmed   │ sara@...    │ Active │ [⋮]  │ │
│  │🟢│ Mohamed Ali  │ moh@...     │ Active │ [⋮]  │ │
│  │🟡│ Fatima Noor  │ fat@...     │Pending │ [⋮]  │ │
│  │🔴│ Youssef K.   │ ysk@...     │Suspnd. │ [⋮]  │ │
│  └──┴──────────────┴─────────────┴────────┴──────┘ │
│                                                     │
│  [⋮] Menu: View Profile | Suspend | Remove |       │
│             Transfer to...                          │
│                                                     │
│  Pending Approvals (if auto-approve is OFF):        │
│  ┌──────────────────────────────────────┐           │
│  │ Layla M. wants to join  [✓ Approve] [✗ Reject] │ │
│  └──────────────────────────────────────┘           │
└────────────────────────────────────────────────────┘
```

#### Tab: Exams
```
┌──────────────────────────────────────────────┐
│  [+ Link Existing Exam]                       │
│                                               │
│  Linked Exams:                                │
│  ┌────────────────────────────────────┐       │
│  │ 📝 Math Quiz 1     Active  [🔗][✕] │       │
│  │ 📝 Midterm Exam    Active  [🔗][✕] │       │
│  │ 📝 Algebra Final   Draft   [🔗][✕] │       │
│  └────────────────────────────────────┘       │
│                                               │
│  [+ Create New Exam for this Class]           │
└──────────────────────────────────────────────┘
```

#### Tab: Settings
```
┌──────────────────────────────────────────┐
│  Classroom Settings                       │
│                                          │
│  Name          [Math 101___________]     │
│  Subject       [Mathematics________]     │
│  Grade Level   [Grade 10___________]     │
│  Color         [🔵]                      │
│  Academic Year [2025-2026__________]     │
│                                          │
│  Enrollment                              │
│  ☑ Auto-approve students                 │
│  Max capacity    [100_]                  │
│                                          │
│  Invite Code: ABC123                     │
│  [🔄 Regenerate Code]                    │
│                                          │
│  Danger Zone                             │
│  [🗄️ Archive Classroom]                  │
│  [🗑️ Delete Classroom]                   │
│                                          │
│           [Save Changes]                 │
└──────────────────────────────────────────┘
```

### 8.4 — Components

#### `ClassroomCard.tsx`
- Color-coded top bar from `classroom.color`
- Name, subject, grade level
- Student count badge
- Exam count badge
- Archive indicator (faded styling)
- Click → navigate to `/classrooms/:id`

#### `InviteCodeDisplay.tsx`
- Shows invite code in large, copyable format
- Copy button (copies code)
- Share link button (copies full URL)
- WhatsApp share button (opens wa.me with pre-filled message)
- QR code generation (future-ready)

#### `EnrollmentModal.tsx`
- Input for student email
- Lookup → shows preview (name, avatar) if exists
- "Student not on platform yet" message + invite anyway option
- Success/error feedback

#### `BulkImportModal.tsx`
- CSV file upload dropzone
- Template download link ("Download CSV template")
- Preview parsed rows in table
- Show validation errors per row
- Confirm import button
- Progress indicator
- Results summary (X imported, Y skipped, Z errors)

**CSV Template:**
```csv
name,email,parent_email
Sara Ahmed,sara@example.com,parent@example.com
Mohamed Ali,moh@example.com,
```

#### `StudentProfileCard.tsx`
- Avatar (or initials fallback)
- Name, email
- Grade level, school
- Enrollment date
- Status badge (Active/Pending/Suspended)
- Last active timestamp
- Action dropdown (suspend, remove, transfer)

#### `TransferStudentModal.tsx`
- Shows student info
- Dropdown of tutor's other active classrooms
- Confirm transfer button
- Option: keep in original + add to new (multi-enrollment)

#### `ClassroomSidebar.tsx`
- Left sidebar within ClassroomDetail
- Navigation tabs: Overview, Roster, Exams, Settings
- Quick invite code display
- Used on desktop; bottom tabs on mobile

---

## 9. Frontend: Routing Updates

### File: `frontend/src/App.tsx`

Add these routes inside the `<Routes>` block:

```typescript
{/* Classroom Routes (Tutor) */}
<Route path="/classrooms" element={<TutorRoute><ClassroomList /></TutorRoute>} />
<Route path="/classrooms/new" element={<TutorRoute><ClassroomCreate /></TutorRoute>} />
<Route path="/classrooms/:id" element={<TutorRoute><ClassroomDetail /></TutorRoute>} />
<Route path="/classrooms/:id/settings" element={<TutorRoute><ClassroomSettings /></TutorRoute>} />

{/* Student Classroom Routes */}
<Route path="/my/classrooms" element={<ProtectedRoute><StudentClassroomList /></ProtectedRoute>} />
<Route path="/my/classrooms/:id" element={<ProtectedRoute><StudentClassroomView /></ProtectedRoute>} />

{/* Join Classroom (any authenticated user) */}
<Route path="/join/:inviteCode" element={<ProtectedRoute><JoinClassroom /></ProtectedRoute>} />
```

### New page imports:

```typescript
import ClassroomList from './pages/classrooms/ClassroomList';
import ClassroomCreate from './pages/classrooms/ClassroomCreate';
import ClassroomDetail from './pages/classrooms/ClassroomDetail';
import ClassroomSettings from './pages/classrooms/ClassroomSettings';
import StudentClassroomList from './pages/classrooms/StudentClassroomList';
import StudentClassroomView from './pages/classrooms/StudentClassroomView';
import JoinClassroom from './pages/classrooms/JoinClassroom';
```

---

## 10. i18n Translations

### Add to `frontend/src/locales/en/translation.json`:

```json
{
  "classrooms": {
    "title": "My Classrooms",
    "createNew": "New Classroom",
    "empty": {
      "title": "No classrooms yet",
      "description": "Create your first classroom to start organizing your students and exams.",
      "cta": "Create Classroom"
    },
    "form": {
      "name": "Classroom Name",
      "namePlaceholder": "e.g. Mathematics — Grade 10",
      "subject": "Subject",
      "subjectPlaceholder": "e.g. Mathematics",
      "gradeLevel": "Grade Level",
      "gradeLevelPlaceholder": "e.g. Grade 10",
      "academicYear": "Academic Year",
      "description": "Description",
      "descriptionPlaceholder": "Brief description of this classroom...",
      "color": "Color",
      "settings": "Settings",
      "autoApprove": "Auto-approve students",
      "autoApproveHint": "Students will be added immediately when they join",
      "maxCapacity": "Maximum students",
      "showStudentList": "Show student list to students",
      "createButton": "Create Classroom",
      "updateButton": "Save Changes"
    },
    "detail": {
      "overview": "Overview",
      "roster": "Roster",
      "exams": "Exams",
      "settings": "Settings",
      "students": "students",
      "inviteCode": "Invite Code",
      "copyCode": "Copy Code",
      "copyLink": "Copy Invite Link",
      "shareWhatsApp": "Share via WhatsApp",
      "codeCopied": "Invite code copied!",
      "linkCopied": "Invite link copied!",
      "recentActivity": "Recent Activity",
      "quickStats": "Quick Stats"
    },
    "roster": {
      "title": "Student Roster",
      "addStudent": "Add Student",
      "importCSV": "Import CSV",
      "downloadTemplate": "Download Template",
      "search": "Search students...",
      "filterAll": "All",
      "filterActive": "Active",
      "filterPending": "Pending",
      "filterSuspended": "Suspended",
      "status": {
        "active": "Active",
        "pending": "Pending",
        "suspended": "Suspended",
        "removed": "Removed"
      },
      "actions": {
        "viewProfile": "View Profile",
        "approve": "Approve",
        "suspend": "Suspend",
        "remove": "Remove",
        "transfer": "Transfer to..."
      },
      "pendingApprovals": "Pending Approvals",
      "enrolledOn": "Enrolled on",
      "noStudents": "No students enrolled yet",
      "noStudentsHint": "Share the invite code to get students to join"
    },
    "exams": {
      "linkExisting": "Link Existing Exam",
      "createNew": "Create New Exam",
      "noExams": "No exams linked to this classroom",
      "unlinkConfirm": "Remove this exam from the classroom?",
      "selectExam": "Select an exam to link"
    },
    "archive": {
      "archiveButton": "Archive Classroom",
      "unarchiveButton": "Unarchive",
      "archiveConfirm": "Archive this classroom? Students will no longer be able to access it.",
      "archived": "Archived"
    },
    "delete": {
      "deleteButton": "Delete Classroom",
      "deleteConfirm": "This will permanently delete the classroom, remove all enrolled students, and unlink all exams. This cannot be undone.",
      "deleteConfirmType": "Type the classroom name to confirm:"
    },
    "join": {
      "title": "Join Classroom",
      "enterCode": "Enter invite code",
      "codePlaceholder": "e.g. ABC123",
      "joinButton": "Join",
      "joining": "Joining...",
      "success": "Successfully joined!",
      "pending": "Your enrollment is pending approval from the tutor.",
      "alreadyEnrolled": "You're already in this classroom",
      "classroomFull": "This classroom is full",
      "invalidCode": "Invalid invite code",
      "classroomArchived": "This classroom is no longer accepting students"
    },
    "import": {
      "title": "Import Students from CSV",
      "dropzone": "Drop a CSV file here, or click to browse",
      "template": "Download CSV template",
      "preview": "Preview",
      "importing": "Importing...",
      "results": {
        "title": "Import Results",
        "imported": "Successfully imported",
        "skipped": "Skipped (already enrolled)",
        "errors": "Errors"
      }
    },
    "transfer": {
      "title": "Transfer Student",
      "selectClassroom": "Select destination classroom",
      "keepOriginal": "Also keep in current classroom",
      "transferButton": "Transfer"
    }
  }
}
```

### Add to `frontend/src/locales/ar/translation.json`:

```json
{
  "classrooms": {
    "title": "فصولي الدراسية",
    "createNew": "فصل جديد",
    "empty": {
      "title": "لا توجد فصول بعد",
      "description": "أنشئ أول فصل دراسي لتنظيم طلابك واختباراتك.",
      "cta": "إنشاء فصل"
    },
    "form": {
      "name": "اسم الفصل",
      "namePlaceholder": "مثال: رياضيات — الصف العاشر",
      "subject": "المادة",
      "subjectPlaceholder": "مثال: رياضيات",
      "gradeLevel": "المستوى الدراسي",
      "gradeLevelPlaceholder": "مثال: الصف العاشر",
      "academicYear": "العام الدراسي",
      "description": "الوصف",
      "descriptionPlaceholder": "وصف مختصر لهذا الفصل...",
      "color": "اللون",
      "settings": "الإعدادات",
      "autoApprove": "قبول الطلاب تلقائياً",
      "autoApproveHint": "سيتم إضافة الطلاب فوراً عند انضمامهم",
      "maxCapacity": "الحد الأقصى للطلاب",
      "showStudentList": "عرض قائمة الطلاب للطلاب",
      "createButton": "إنشاء الفصل",
      "updateButton": "حفظ التغييرات"
    },
    "detail": {
      "overview": "نظرة عامة",
      "roster": "قائمة الطلاب",
      "exams": "الاختبارات",
      "settings": "الإعدادات",
      "students": "طالب",
      "inviteCode": "رمز الدعوة",
      "copyCode": "نسخ الرمز",
      "copyLink": "نسخ رابط الدعوة",
      "shareWhatsApp": "مشاركة عبر واتساب",
      "codeCopied": "تم نسخ رمز الدعوة!",
      "linkCopied": "تم نسخ رابط الدعوة!",
      "recentActivity": "النشاط الأخير",
      "quickStats": "إحصائيات سريعة"
    },
    "roster": {
      "title": "قائمة الطلاب",
      "addStudent": "إضافة طالب",
      "importCSV": "استيراد CSV",
      "downloadTemplate": "تحميل القالب",
      "search": "البحث عن طلاب...",
      "filterAll": "الكل",
      "filterActive": "نشط",
      "filterPending": "معلق",
      "filterSuspended": "موقوف",
      "status": {
        "active": "نشط",
        "pending": "معلق",
        "suspended": "موقوف",
        "removed": "محذوف"
      },
      "actions": {
        "viewProfile": "عرض الملف",
        "approve": "قبول",
        "suspend": "إيقاف",
        "remove": "حذف",
        "transfer": "نقل إلى..."
      },
      "pendingApprovals": "طلبات الانضمام المعلقة",
      "enrolledOn": "انضم في",
      "noStudents": "لا يوجد طلاب مسجلون بعد",
      "noStudentsHint": "شارك رمز الدعوة ليتمكن الطلاب من الانضمام"
    },
    "exams": {
      "linkExisting": "ربط اختبار موجود",
      "createNew": "إنشاء اختبار جديد",
      "noExams": "لا توجد اختبارات مرتبطة بهذا الفصل",
      "unlinkConfirm": "إزالة هذا الاختبار من الفصل؟",
      "selectExam": "اختر اختباراً لربطه"
    },
    "archive": {
      "archiveButton": "أرشفة الفصل",
      "unarchiveButton": "إلغاء الأرشفة",
      "archiveConfirm": "أرشفة هذا الفصل؟ لن يتمكن الطلاب من الوصول إليه.",
      "archived": "مؤرشف"
    },
    "delete": {
      "deleteButton": "حذف الفصل",
      "deleteConfirm": "سيؤدي هذا إلى حذف الفصل نهائياً وإزالة جميع الطلاب وإلغاء ربط جميع الاختبارات. لا يمكن التراجع.",
      "deleteConfirmType": "اكتب اسم الفصل للتأكيد:"
    },
    "join": {
      "title": "الانضمام للفصل",
      "enterCode": "أدخل رمز الدعوة",
      "codePlaceholder": "مثال: ABC123",
      "joinButton": "انضمام",
      "joining": "جارٍ الانضمام...",
      "success": "تم الانضمام بنجاح!",
      "pending": "طلب انضمامك في انتظار موافقة المعلم.",
      "alreadyEnrolled": "أنت مسجل بالفعل في هذا الفصل",
      "classroomFull": "هذا الفصل ممتلئ",
      "invalidCode": "رمز دعوة غير صالح",
      "classroomArchived": "هذا الفصل لم يعد يقبل طلاب"
    },
    "import": {
      "title": "استيراد طلاب من CSV",
      "dropzone": "اسحب ملف CSV هنا أو انقر للاستعراض",
      "template": "تحميل نموذج CSV",
      "preview": "معاينة",
      "importing": "جارٍ الاستيراد...",
      "results": {
        "title": "نتائج الاستيراد",
        "imported": "تم الاستيراد بنجاح",
        "skipped": "تم التخطي (مسجل مسبقاً)",
        "errors": "أخطاء"
      }
    },
    "transfer": {
      "title": "نقل طالب",
      "selectClassroom": "اختر الفصل المستهدف",
      "keepOriginal": "الاحتفاظ بالطالب في الفصل الحالي أيضاً",
      "transferButton": "نقل"
    }
  }
}
```

---

## 11. Dashboard Redesign

### Tutor Dashboard Changes

**File:** `frontend/src/pages/Dashboard.tsx`

Add a **"Classrooms" section** above the existing exams list:

```
┌──────────────────────────────────────────────────┐
│  Dashboard                                        │
│                                                    │
│  📊 Overview Stats                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │  3   │ │  67  │ │  12  │ │ 82%  │            │
│  │class │ │studs │ │exams │ │ avg  │            │
│  └──────┘ └──────┘ └──────┘ └──────┘            │
│                                                    │
│  🏫 My Classrooms            [View All →]          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Math 101 │ │ Physics  │ │ + New    │          │
│  │ 24 studs │ │ 18 studs │ │ Class    │          │
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                    │
│  📝 My Exams               [+ Create Exam]         │
│  (existing exam cards...)                          │
└──────────────────────────────────────────────────┘
```

**Changes:**
1. Add classrooms horizontal scroll section at top
2. Add link to `/classrooms` ("View All")
3. Add "+ New Classroom" card
4. Keep all existing exam functionality intact
5. Add overall stats including classroom count and total students

### Sidebar / Navigation Addition

Add "Classrooms" to the mobile menu and any navigation:

```typescript
// In the mobile menu items:
{ icon: BookOpen, label: t('classrooms.title'), path: '/classrooms', dataTour: 'classrooms' },
```

---

## 12. Student-Side Experience

### 12.1 — `StudentClassroomList.tsx`

**Route:** `/my/classrooms`

```
┌──────────────────────────────────────────────────┐
│  🎓 My Classrooms                                 │
│                                                    │
│  [Enter Code: ______] [Join →]                     │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ 🔵 Mathematics — Grade 10            │          │
│  │ Tutor: Mr. Ahmed                     │          │
│  │ 5 exams available                    │          │
│  │ Joined: Feb 10, 2026                │          │
│  └──────────────────────────────────────┘          │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ 🟢 Physics — Grade 10               │          │
│  │ Tutor: Ms. Fatima                    │          │
│  │ 3 exams available                    │          │
│  │ Joined: Feb 12, 2026                │          │
│  └──────────────────────────────────────┘          │
│                                                    │
│  ── Pending ──                                     │
│  ┌──────────────────────────────────────┐          │
│  │ 🟡 English — Pending approval        │          │
│  └──────────────────────────────────────┘          │
└──────────────────────────────────────────────────┘
```

### 12.2 — `StudentClassroomView.tsx`

**Route:** `/my/classrooms/:id`

```
┌──────────────────────────────────────────────────┐
│  ← My Classrooms     Mathematics — Grade 10       │
│  Tutor: Mr. Ahmed                                  │
│                                                    │
│  📝 Exams                                          │
│  ┌──────────────────────────────────────┐          │
│  │ Math Quiz 1         Active  [Take →] │          │
│  │ Midterm Exam        Active  [Take →] │          │
│  │ Algebra Final       Not Yet          │          │
│  └──────────────────────────────────────┘          │
│                                                    │
│  📊 My Results in this Class                       │
│  ┌──────────────────────────────────────┐          │
│  │ Math Quiz 1:  85/100 (85%)          │          │
│  │ Midterm Exam: 72/100 (72%)          │          │
│  └──────────────────────────────────────┘          │
└──────────────────────────────────────────────────┘
```

### 12.3 — `JoinClassroom.tsx`

**Route:** `/join/:inviteCode`

```
┌──────────────────────────────────────────┐
│                                          │
│  🏫 Join Classroom                        │
│                                          │
│  You've been invited to join:            │
│                                          │
│  ┌──────────────────────────────┐        │
│  │ 🔵 Mathematics — Grade 10    │        │
│  │ Tutor: Mr. Ahmed             │        │
│  │ 24 students enrolled         │        │
│  └──────────────────────────────┘        │
│                                          │
│  [Join Classroom]                        │
│                                          │
│  Not a student? [Login as Tutor →]       │
└──────────────────────────────────────────┘
```

**Flow:**
1. Parse `inviteCode` from URL
2. Lookup classroom → show preview
3. If not logged in → redirect to login with `?redirect=/join/CODE`
4. If logged in → show join button
5. On join → call `useInviteCode().joinClassroom(code)`
6. Success → redirect to `/my/classrooms/:id`

---

## 13. Mobile (Capacitor) Considerations

### Deep Linking

Add to Capacitor app URL handler in `App.tsx`:
```typescript
// Handle /join/:code deep links
if (url.pathname.startsWith('/join/')) {
  navigate(url.pathname);
  return;
}
```

### Responsive Layout

- `ClassroomList`: 1 column on mobile, 2–3 on desktop
- `ClassroomDetail`: Bottom tab bar instead of sidebar on mobile
- `StudentRoster`: Swipe-to-reveal actions on mobile cards
- `BulkImportModal`: Full-screen on mobile
- `InviteCodeDisplay`: Large tappable buttons, native share sheet integration

### Share Integration

```typescript
import { Share } from '@capacitor/share';

const shareInvite = async (code: string, name: string) => {
  if (Capacitor.isNativePlatform()) {
    await Share.share({
      title: t('classrooms.join.title'),
      text: `Join my classroom "${name}" on Durrah Tutors!\nCode: ${code}`,
      url: `https://durrahtutors.com/join/${code}`,
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(`https://durrahtutors.com/join/${code}`);
    toast.success(t('classrooms.detail.linkCopied'));
  }
};
```

---

## 14. Testing Plan

### Unit Tests

| Test | File | What to test |
|---|---|---|
| Invite code generation | `generate_invite_code.test.ts` | Uniqueness, format (6 chars, no ambiguous chars) |
| Classroom form validation | `ClassroomCreate.test.tsx` | Zod schema, required fields, max lengths |
| CSV parser | `BulkImport.test.ts` | Valid CSV, missing columns, duplicate emails, malformed rows |
| Student status transitions | `useClassroomStudents.test.ts` | active→suspended, pending→active, etc. |

### Integration Tests

| Test | Scenario |
|---|---|
| Create classroom flow | Tutor creates → invite code generated → appears in list |
| Join classroom flow | Student enters code → enrolled → appears in roster |
| Auto-approve OFF | Student joins → status=pending → tutor approves → status=active |
| Capacity check | Classroom full → student gets error |
| Archive flow | Tutor archives → students can't access → unarchive restores |
| Bulk import | Upload CSV → 3 imported, 1 skipped, 1 error |
| Link exam | Select existing exam → appears in classroom exams tab |
| Transfer student | Transfer from Class A to Class B → removed from A, added to B |
| Role assignment | New user joins via code → role set to 'student' |

### E2E Tests

| Flow | Steps |
|---|---|
| Full tutor flow | Login → Create classroom → Share code → View empty roster |
| Full student flow | Login → Enter code → Join → View classroom → Take exam |
| Invite link flow | Open /join/CODE → Login required → Auto-join after login |

---

## 15. Task Breakdown (Day-by-Day)

### Day 1: Database & Auth Foundation
- [x] Create migration file `20260215000000_create_classrooms.sql`
- [ ] Run migration on Supabase
- [x] Add RLS policies
- [x] Create `generate_invite_code()` SQL function
- [x] Create `get_classroom_stats()` SQL RPC
- [x] Update `UserRole` type in `AuthContext.tsx` to include `'student'`
- [x] Add `TutorRoute` component to `ProtectedRoute.tsx`
- [x] Install frontend dependencies (`papaparse`)

### Day 2: Types, Hooks, Services
- [x] Create `types/classroom.ts` with all interfaces
- [x] Implement `useClassrooms.ts` hook (CRUD + archive)
- [x] Implement `useClassroomStudents.ts` hook (fetch, add, status, transfer)
- [x] Implement `useInviteCode.ts` hook (join, lookup)
- [ ] Test hooks manually via browser console

### Day 3: Classroom List & Create Pages
- [x] Build `ClassroomCard.tsx` component
- [x] Build `ClassroomList.tsx` page (grid, search, filter, empty state)
- [x] Build `ClassroomCreate.tsx` page (form with Zod validation)
- [x] Add routes to `App.tsx`
- [x] Add "Classrooms" link to Dashboard navigation/menu
- [ ] Add EN + AR translations for classroom list & create

### Day 4: Classroom Detail — Overview & Exams
- [x] Build `ClassroomSidebar.tsx` (tab navigation)
- [x] Build `ClassroomDetail.tsx` (container with tabs)
- [x] Build Overview tab (stats cards, invite code display, recent activity)
- [x] Build `InviteCodeDisplay.tsx` (copy, share, WhatsApp)
- [x] Build Exams tab (link existing exams, unlink, create new)
- [x] Create `classroom_exams` linking UI
- [ ] Add EN + AR translations for detail page

### Day 5: Student Roster — Core
- [ ] Build `StudentRoster.tsx` component (table/list view)
- [ ] Build `StudentProfileCard.tsx` (student card with actions)
- [ ] Build `EnrollmentModal.tsx` (add by email)
- [ ] Implement search and filter (all/active/pending/suspended)
- [ ] Implement status change actions (suspend, activate, remove)
- [ ] Build pending approvals section (approve/reject)
- [ ] Add EN + AR translations for roster

### Day 6: Bulk Import & Transfer
- [ ] Build `BulkImportModal.tsx` (CSV upload, preview, import)
- [ ] Implement CSV parsing with `papaparse`
- [ ] Implement CSV template download
- [ ] Build `TransferStudentModal.tsx` (select target classroom)
- [ ] Implement transfer logic in hook
- [ ] Add EN + AR translations for import/transfer

### Day 7: Classroom Settings & Archive
- [ ] Build Settings tab in `ClassroomDetail.tsx`
- [ ] Implement edit classroom form (pre-filled)
- [ ] Implement "Regenerate Code" action
- [ ] Implement Archive/Unarchive with confirmation
- [ ] Implement Delete with type-to-confirm
- [ ] Show archived classrooms section in list (faded style)

### Day 8: Student-Side Pages
- [x] Build `StudentClassroomList.tsx` (student's enrolled classrooms)
- [x] Build `StudentClassroomView.tsx` (view exams, results per classroom)
- [x] Build `JoinClassroom.tsx` page (/join/:code flow)
- [ ] Update `/` route for role-based redirect (student → /my/classrooms)
- [ ] Update `StudentPortal.tsx` to show joined classrooms
- [ ] Add inline join-by-code input
- [ ] Add EN + AR translations for student pages

### Day 9: Dashboard Integration & Polish
- [ ] Add classrooms section to tutor `Dashboard.tsx`
- [ ] Add total student/classroom stats to dashboard stats bar
- [ ] Add Classrooms to mobile menu
- [ ] Capacitor: deep link support for `/join/CODE` URLs
- [ ] Capacitor: native share sheet for invite codes
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] RTL testing for all new pages (Arabic)

### Day 10: Testing & QA
- [ ] Manual test all flows: create, join, manage, archive, delete
- [ ] Test bulk CSV import with various edge cases
- [ ] Test RLS policies (student can't see other classrooms, tutor can't see other tutor's data)
- [ ] Test pending approval workflow
- [ ] Test capacity limit
- [ ] Test invite code regeneration
- [ ] Cross-browser testing
- [ ] Fix bugs and polish UI
- [ ] Update `FULL_TUTOR_PLATFORM_PLAN.md` → Mark Module A as complete

---

## Appendix A: File Tree (New Files)

```
frontend/src/
├── types/
│   └── classroom.ts                          ← NEW
├── hooks/
│   ├── useClassrooms.ts                      ← NEW
│   ├── useClassroomStudents.ts               ← NEW
│   └── useInviteCode.ts                      ← NEW
├── pages/
│   └── classrooms/
│       ├── ClassroomList.tsx                  ← NEW
│       ├── ClassroomCreate.tsx                ← NEW
│       ├── ClassroomDetail.tsx                ← NEW
│       ├── ClassroomSettings.tsx              ← NEW
│       ├── StudentClassroomList.tsx           ← NEW
│       ├── StudentClassroomView.tsx           ← NEW
│       ├── JoinClassroom.tsx                  ← NEW
│       └── components/
│           ├── ClassroomCard.tsx              ← NEW
│           ├── InviteCodeDisplay.tsx          ← NEW
│           ├── StudentRoster.tsx              ← NEW
│           ├── EnrollmentModal.tsx            ← NEW
│           ├── BulkImportModal.tsx            ← NEW
│           ├── StudentProfileCard.tsx         ← NEW
│           ├── TransferStudentModal.tsx        ← NEW
│           └── ClassroomSidebar.tsx           ← NEW
├── components/
│   └── ProtectedRoute.tsx                    ← MODIFIED (add TutorRoute)
├── context/
│   └── AuthContext.tsx                       ← MODIFIED (add 'student' role)
├── locales/
│   ├── en/translation.json                   ← MODIFIED (add classrooms keys)
│   └── ar/translation.json                   ← MODIFIED (add classrooms keys)
└── App.tsx                                   ← MODIFIED (add routes + role redirect)

supabase/migrations/
└── 20260215000000_create_classrooms.sql      ← NEW
```

## Appendix B: Color Palette for Classrooms

```typescript
export const CLASSROOM_COLORS = [
  { value: '#3B82F6', name: 'Blue' },
  { value: '#10B981', name: 'Green' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#EF4444', name: 'Red' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#06B6D4', name: 'Cyan' },
  { value: '#F97316', name: 'Orange' },
  { value: '#6366F1', name: 'Indigo' },
  { value: '#14B8A6', name: 'Teal' },
];
```

## Appendix C: Subscription Limits Check

```typescript
// In useClassrooms.ts, before creating:
export async function checkClassroomLimit(userId: string, subscriptionStatus: string): Promise<boolean> {
  const { count } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
    .eq('tutor_id', userId)
    .eq('is_archived', false);
    
  const limits: Record<string, number> = {
    'free': 1,
    'basic': 3,
    'pro': 10,
    'institution': Infinity,
  };
  
  const tier = subscriptionStatus || 'free';
  return (count || 0) < (limits[tier] || 1);
}
```

---

*This detailed plan covers every file, component, query, translation, and test needed to fully implement Module A — Student Management & Classrooms.*
