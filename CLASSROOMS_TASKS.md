# Classrooms System - Implementation Tasks

> **Created:** February 25, 2026
> **Based on:** `CLASSROOMS_SYSTEM_ANALYSIS.md`
> **Total Tasks:** 43 across 8 phases

---

## Phase 1: Critical Bug Fixes & Security

> Fix what's broken and dangerous before building anything new.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 1.1 | Create server-side `join_classroom` RPC that atomically: looks up classroom by code (bypasses RLS), checks capacity, checks duplicate enrollment, inserts enrollment, updates student_count, creates notification, returns result | BUG-01, BUG-02, SEC-02 | [x] |
| 1.2 | Add `due_date TIMESTAMPTZ` and rename/add `assigned_at TIMESTAMPTZ` columns to `classroom_exams` table. Update frontend queries to use correct column names | BUG-04, BUG-05 | [x] |
| 1.3 | Fix `get_classroom_stats` RPC to return `active_students` and `total_exams` keys matching the TypeScript `ClassroomStats` interface | BUG-07 | [x] |
| 1.4 | Create `<TutorRoute>` and `<StudentRoute>` wrapper components that check `profile.role` and redirect unauthorized users. Apply to `/classrooms/*` and `/my/classrooms/*` routes | SEC-01 | [x] |
| 1.5 | Add RLS or convert `classroom_exam_results` view to a SECURITY DEFINER function that filters by tutor ownership or student enrollment | SEC-05 | [x] |
| 1.6 | Add rate limiting to `lookup_classroom_by_code` RPC (max 10 lookups per minute per user) to prevent brute-force invite code scanning | SEC-03 | [x] |

---

## Phase 2: Code Quality & Architecture Refactor

> Clean the foundation before building more features on top.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 2.1 | Split `ClassroomDetail.tsx` (1127 lines) into: `ClassroomDetailLayout.tsx`, `tabs/OverviewTab.tsx`, `tabs/RosterTab.tsx`, `tabs/ExamsTab.tsx`, `tabs/SettingsTab.tsx`, `components/ActivityFeed.tsx`, `components/LinkExamModal.tsx` | CQ-01 | [x] |
| 2.2 | Migrate all classroom data fetching to React Query: `useQuery` for reads, `useMutation` with `invalidateQueries` for writes. Remove all manual `fetchClassrooms()` refetch calls | CQ-02 | [x] |
| 2.3 | Remove all `any` types in classroom files. Add proper TypeScript interfaces for `classroomExams`, `availableExams`, `editForm`, `activities`, and all `.map()` callbacks | CQ-03 | [x] |
| 2.4 | Move duplicated `EnrolledClassroom` interface from `StudentClassroomList.tsx` and `StudentClassroomView.tsx` into `types/classroom.ts` | CQ-06 | [x] |
| 2.5 | Extract inline Supabase calls from settings toggle `onClick` handlers into proper functions in `useClassrooms` hook with error handling and rollback | CQ-07 | [x] |
| 2.6 | Fix all `useEffect` missing dependency warnings in `useClassrooms.ts`, `useClassroomStudents.ts`, and `StudentClassroomView.tsx` | BUG-06 | [x] |

---

## Phase 3: UX Fixes & Missing Implementations

> Finish what's half-built and polish the user experience.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 3.1 | Implement "My Results" tab in `StudentClassroomView`: query `submissions` joined with `classroom_exams` for current student. Show exam name, score, percentage, time taken, submission date | UX-01 | [x] |
| 3.2 | Implement "Student List" tab in `StudentClassroomView`: when `show_student_list_to_students` is enabled, show classmate names, avatars, grade levels (no emails for privacy) | UX-02 | [x] |
| 3.3 | Add server-side pagination (offset/limit) and search (`.ilike()`) for student roster. Show 25 per page with page navigation | UX-03, CQ-04 | [x] |
| 3.4 | Add search input to the "Link Exam" modal so tutors can filter exams by title | UX-04 | [x] |
| 3.5 | Create reusable `<ConfirmationModal>` component. Replace all `confirm()` calls in `ClassroomDetail`, `StudentRoster`, and `EnrollmentModal` with it | UX-06 | [x] |
| 3.6 | Show tutor/instructor name on `StudentClassroomView` by joining `profiles` table in the classroom query | UX-08 | [x] |
| 3.7 | Add helpful empty states: "Add a description to help students" prompt when no description, "Share the invite code to get started" when 0 students | UX-07 | [x] |
| 3.8 | Extract all hardcoded English strings in classroom pages into `i18next` translation keys. Cover `ClassroomDetail`, `StudentRoster`, `StudentClassroomView`, `EnrollmentModal`, `JoinClassroom` | UX-09 | [x] |

---

## Phase 4: Announcements & Communication System

> The most impactful missing feature for daily classroom use.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 4.1 | Create `classroom_announcements` DB table: `id, classroom_id, author_id, title, content (rich text), is_pinned, created_at, updated_at`. Add `classroom_announcement_comments` table. Add RLS policies (tutor CRUD, enrolled students read + comment) | FEAT-01 | [x] |
| 4.2 | Build announcements feed UI: tutor creates announcements with rich text editor (TipTap already installed), student views feed sorted by pinned-first then newest. Add as new "Announcements" tab in classroom detail | FEAT-01 | [x] |
| 4.3 | Add announcement comments: threaded replies below each announcement. Tutor can delete any comment, students can delete their own | FEAT-01 | [x] |
| 4.4 | Wire FCM push notifications: notify all enrolled students when a new announcement is posted. Use existing push notification infrastructure (`@capacitor/push-notifications` already installed) | FEAT-01 | [x] |

---

## Phase 5: Assignments System

> Go beyond multiple-choice exams with full assignment workflows.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 5.1 | Create DB tables: `classroom_assignments` (id, classroom_id, title, description, instructions, category, due_date, max_score, allow_late, late_penalty_percent, attachments JSONB, is_published, created_at) and `assignment_submissions` (id, assignment_id, student_id, content, files JSONB, score, feedback, submitted_at, graded_at, is_late). Add RLS policies | FEAT-02 | [x] |
| 5.2 | Build assignment create/edit form (tutor side): title, rich-text instructions, file attachments, due date picker, category selector (Homework/Project/Quiz/Midterm/Final), max score, late policy toggle. Add as new tab or section in classroom detail | FEAT-02 | [x] |
| 5.3 | Build assignment view + submission (student side): view instructions and attachments, upload files (PDF/DOCX/images via Supabase Storage), text submission, see grade and feedback after grading | FEAT-02 | [x] |
| 5.4 | Build assignment grading interface (tutor side): list all submissions for an assignment, view each submission, enter score + rich-text feedback, bulk download submissions | FEAT-02 | [x] |

---

## Phase 6: Gradebook & Analytics

> Automatic grade calculation and data-driven insights.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 6.1 | Create gradebook DB schema: `grade_categories` (id, classroom_id, name, weight_percent), `grade_entries` (id, category_id, student_id, classroom_id, source_type, source_id, score, max_score, created_at). Add functions for weighted average calculation | FEAT-03 | [ ] |
| 6.2 | Build gradebook UI (tutor side): spreadsheet-style view with students as rows, assignments/exams as columns. Show per-category weighted subtotals and final grade. Support manual grade override | FEAT-03 | [ ] |
| 6.3 | Build tutor analytics dashboard: class average scores (bar chart), score distribution (histogram), pass rate per exam, student progress trends (line chart), at-risk student flags (below configurable threshold). Use Recharts (already installed) | FEAT-09 | [ ] |
| 6.4 | Add export functionality: export grades to CSV/XLSX (already have `xlsx` and `papaparse` installed), export report cards and analytics to PDF (already have `jspdf` installed) | FEAT-03 | [ ] |

---

## Phase 7: Attendance & Calendar

> Track presence and give students a unified schedule view.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 7.1 | Create `classroom_attendance` DB table: `id, classroom_id, student_id, date, status (present/absent/late/excused), notes, marked_by, created_at`. Build daily attendance UI for tutors: date picker, student list with status toggles, bulk mark all present. Build attendance summary for students | FEAT-04 | [ ] |
| 7.2 | Build classroom calendar view: monthly/weekly calendar showing exams (from `classroom_exams`), assignments (from `classroom_assignments`), due dates. Color-coded by type. Visible to both tutor and student | FEAT-07 | [ ] |
| 7.3 | Add reminder notifications: schedule push notifications 24h and 1h before exam availability windows and assignment due dates. Use Supabase Edge Functions or pg_cron for scheduling | FEAT-07 | [ ] |

---

## Phase 8: Advanced Features

> Scale to full institution-grade platform.

| # | Task | Ref | Status |
|---|------|-----|--------|
| 8.1 | Add co-teacher support: create `classroom_teachers` table (classroom_id, teacher_id, role: owner/co-teacher/assistant, permissions JSONB). Update RLS policies to allow co-teachers. Update UI to invite and manage co-teachers | FEAT-05 | [x] |
| 8.2 | Build classroom resource library: create `classroom_resources` table (id, classroom_id, title, type, file_url, folder, sort_order). File upload to Supabase Storage. Folder/topic organization. Student read access | FEAT-06 | [x] |
| 8.3 | Add classroom templates + cloning: "Save as Template" button, "Clone Classroom" for new semesters (copies structure, exams, settings but not students), institution-wide template library | FEAT-13 | [ ] |
| 8.4 | Build parent portal: create `parent_student_links` table, parent account type, dashboard showing linked student's grades + attendance + announcements, direct messaging to tutor, weekly email digest | FEAT-08 | [ ] |
| 8.5 | Add discussion forum per classroom: create `classroom_discussions` table (threads) + `discussion_replies` table. Threaded UI, upvoting, "mark as answered", optional anonymous posting | FEAT-11 | [x] |
| 8.6 | Build notification center: in-app bell icon with dropdown list, read/unread tracking, notification preferences page (per-type opt-in/opt-out), daily/weekly email digest option | FEAT-12 | [ ] |
| 8.7 | Add bulk operations: bulk grade entry (paste from spreadsheet), bulk student transfer between classrooms, bulk archive classrooms, bulk email to filtered students | FEAT-14 | [ ] |
| 8.8 | Full RTL Arabic support + complete i18n: audit all classroom components for RTL layout issues, ensure all strings use `t()`, add Arabic translations for all classroom keys, keyboard navigation, ARIA labels | FEAT-15 | [ ] |

---

## Progress Tracker

| Phase | Tasks | Done | Progress |
|-------|-------|------|----------|
| 1 - Critical Fixes | 6 | 6 | ██████████ 100% |
| 2 - Code Quality | 6 | 6 | ██████████ 100% |
| 3 - UX Fixes | 8 | 8 | ██████████ 100% |
| 4 - Announcements | 4 | 4 | ██████████ 100% |
| 5 - Assignments | 4 | 4 | ██████████ 100% |
| 6 - Gradebook | 4 | 0 | ░░░░░░░░░░ 0% |
| 7 - Attendance | 3 | 0 | ░░░░░░░░░░ 0% |
| 8 - Advanced | 8 | 3 | ███░░░░░░░ 37.5% |
| **Total** | **43** | **31** | ███████░░░ **72%** |

---

*Generated from CLASSROOMS_SYSTEM_ANALYSIS.md - February 2026*
