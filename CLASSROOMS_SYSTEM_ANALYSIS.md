# Classrooms System - Full Analysis Report

> **Date:** February 25, 2026
> **Scope:** Frontend (Tutor + Student), Backend (Supabase), Database Schema
> **Branch:** `001-redesign-hero`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Current Architecture](#2-current-architecture)
3. [Bugs & Issues](#3-bugs--issues)
4. [Code Quality Problems](#4-code-quality-problems)
5. [Security Vulnerabilities](#5-security-vulnerabilities)
6. [UX/UI Problems](#6-uxui-problems)
7. [Improvement Recommendations](#7-improvement-recommendations)
8. [New Features for Institution-Grade System](#8-new-features-for-institution-grade-system)

---

## 1. System Overview

### What Exists Today

| Area | Status |
|------|--------|
| Classroom CRUD (tutor) | Functional |
| Invite code system | Functional |
| Student enrollment | Functional (invite code + manual + CSV) |
| Student roster management | Functional |
| Exam linking to classrooms | Functional |
| Student classroom view | Partially implemented |
| Student exam results | **Stub only - "Coming Soon"** |
| Student list (student side) | **Stub only - "Coming Soon"** |
| Classroom analytics | Basic stats only |
| Real-time features | None |
| Announcements/Communication | None |
| Grading system | None |
| Attendance tracking | None |

### Tech Stack

- **Frontend:** React 19 + TypeScript, Vite, TailwindCSS, Framer Motion, React Router v7
- **Backend:** Supabase (PostgreSQL + RLS + RPCs), no dedicated server-side classroom logic
- **Database:** Supabase PostgreSQL with 3 core tables + 1 view
- **State:** Local `useState` hooks (no React Query for classrooms, no global state)

---

## 2. Current Architecture

### Database Tables

```
classrooms
├── id (UUID PK)
├── tutor_id (UUID FK -> profiles)
├── name, description, subject, grade_level
├── cover_image, color, invite_code (UNIQUE)
├── academic_year, is_archived
├── settings (JSONB)
├── student_count (denormalized)
├── created_at, updated_at

classroom_students
├── id (UUID PK)
├── classroom_id (FK -> classrooms)
├── student_id (FK -> profiles)
├── enrolled_at, status, enrollment_method, notes
├── UNIQUE(classroom_id, student_id)

classroom_exams
├── id (UUID PK)
├── classroom_id (FK -> classrooms)
├── exam_id (FK -> exams)
├── added_at
├── UNIQUE(classroom_id, exam_id)

classroom_exam_results (VIEW)
└── Joins submissions + exams + classrooms
```

### Frontend Routes

| Route | Component | Role |
|-------|-----------|------|
| `/classrooms` | `ClassroomList` | Tutor |
| `/classrooms/new` | `ClassroomCreate` | Tutor |
| `/classrooms/:id` | `ClassroomDetail` | Tutor |
| `/my/classrooms` | `StudentClassroomList` | Student |
| `/my/classrooms/:id` | `StudentClassroomView` | Student |
| `/join` | `JoinClassroom` | Student |
| `/join/:code` | `JoinClassroom` | Student |

### Key Files

```
frontend/src/
├── types/classroom.ts              # Type definitions
├── hooks/
│   ├── useClassrooms.ts            # Tutor CRUD operations
│   ├── useClassroomStudents.ts     # Student management
│   └── useInviteCode.ts            # Join flow
├── pages/classrooms/
│   ├── ClassroomList.tsx           # Tutor list page
│   ├── ClassroomCreate.tsx         # Create form
│   ├── ClassroomDetail.tsx         # Detail + tabs (1127 lines - VERY large)
│   ├── StudentClassroomList.tsx    # Student list page
│   ├── StudentClassroomView.tsx    # Student detail view
│   ├── JoinClassroom.tsx           # Join flow
│   └── components/
│       ├── ClassroomCard.tsx       # Card component
│       ├── StudentRoster.tsx       # Student roster
│       ├── EnrollmentModal.tsx     # Add student modal
│       └── InviteCodeDisplay.tsx   # Invite code + sharing
```

---

## 3. Bugs & Issues

### BUG-01: `joinClassroom` directly queries `classrooms` table bypassing RLS

**File:** `frontend/src/hooks/useInviteCode.ts:71-74`
**Severity:** High

The `joinClassroom` function queries the `classrooms` table directly with `.eq('invite_code', ...)`, but due to the privacy fix migration (`FIX_CLASSROOM_PRIVACY`), students can no longer SELECT classrooms they're not enrolled in. This means the join flow will **fail silently** after the privacy fix was applied because RLS blocks the SELECT.

The `lookupClassroom` function correctly uses the `lookup_classroom_by_code` RPC (SECURITY DEFINER), but `joinClassroom` bypasses it.

```typescript
// BROKEN: Direct query blocked by RLS
const { data: classroom } = await supabase
  .from('classrooms')
  .select('*')
  .eq('invite_code', inviteCode.toUpperCase().trim())
  .single();
```

**Fix:** Use the `lookup_classroom_by_code` RPC in `joinClassroom` too, or create a dedicated `join_classroom` RPC.

---

### BUG-02: `student_count` race condition with `max_capacity` check

**File:** `frontend/src/hooks/useInviteCode.ts:89-93`
**Severity:** Medium

Capacity check uses `classroom.student_count` which is a denormalized value updated via a trigger. Multiple students joining simultaneously could bypass the capacity limit because the check happens client-side before the insert, and the trigger updates afterward.

```typescript
const maxCapacity = classroom.settings?.max_capacity || 100;
if (classroom.student_count >= maxCapacity) { ... }
```

**Fix:** Implement a server-side `join_classroom` RPC that atomically checks capacity and inserts.

---

### BUG-03: `useClassrooms` hook fetches ALL classrooms on every mutation

**File:** `frontend/src/hooks/useClassrooms.ts:74,97,117,144,199`
**Severity:** Medium (Performance)

Every create, update, delete, archive, and regenerate operation calls `fetchClassrooms()` which re-fetches the entire list. For tutors with many classrooms, this is wasteful.

---

### BUG-04: `classroom_exams` missing `assigned_at` column

**File:** `frontend/src/pages/classrooms/StudentClassroomView.tsx:87`
**Severity:** Low

The `StudentClassroomView` queries for `assigned_at` but the database column is actually called `added_at`. This will return `null` for `assigned_at`.

```typescript
// StudentClassroomView.tsx queries for assigned_at
.select(`id, exam_id, assigned_at, due_date, exam:exams(...)`)

// But the DB column is added_at (from migration)
added_at TIMESTAMPTZ DEFAULT now()
```

---

### BUG-05: `classroom_exams` missing `due_date` column

**File:** `frontend/src/pages/classrooms/StudentClassroomView.tsx:18,86`
**Severity:** Medium

The `StudentClassroomView` references `due_date` on classroom exams, but this column doesn't exist in the `classroom_exams` table schema. The UI shows due dates that will always be `null`.

---

### BUG-06: `useEffect` missing dependency warnings

**File:** `frontend/src/hooks/useClassrooms.ts:209`
**Severity:** Low

```typescript
useEffect(() => {
  fetchClassrooms();
}, [includeArchived]); // fetchClassrooms not in deps
```

Similar issue in `useClassroomStudents.ts:296` and `StudentClassroomView.tsx:40-43`.

---

### BUG-07: `get_classroom_stats` missing `active_students` and `total_exams`

**File:** `supabase/migrations/20260215000000_create_classrooms.sql:273-306`
**Severity:** Medium

The `ClassroomStats` TypeScript interface expects `active_students` and `total_exams`, but the RPC returns `total_students` (which actually counts active ones) and `linked_exams`. The frontend expects different keys than what the RPC returns.

```typescript
// Expected by frontend (types/classroom.ts)
interface ClassroomStats {
  total_students: number;
  active_students: number;   // Not returned by RPC
  total_exams: number;       // RPC returns linked_exams instead
  ...
}
```

---

### BUG-08: Duplicate/overlapping RLS policies on `classrooms`

**File:** Multiple migration files
**Severity:** Medium (Security/Performance)

The migration history shows the same policies being dropped and recreated across 3+ migration files. The `FIX_CLASSROOM_PRIVACY_RUN_IN_SUPABASE.sql` file exists as a manual fix separate from the numbered migration, suggesting the migration chain didn't cleanly apply. There is a risk of leftover permissive policies.

---

## 4. Code Quality Problems

### CQ-01: ClassroomDetail.tsx is 1127 lines - massive monolith

This file handles 4 tabs (Overview, Roster, Exams, Settings), a dropdown menu, activity feed, exam linking modal, and inline settings form. It should be broken into separate components:

- `OverviewTab.tsx`
- `ExamsTab.tsx`
- `SettingsTab.tsx`
- `ActivityFeed.tsx`
- `LinkExamModal.tsx`

---

### CQ-02: No React Query / TanStack Query for classroom data

The entire classrooms module uses raw `useState` + `useEffect` for data fetching. The rest of the app uses `@tanstack/react-query` (it's in `package.json`). This causes:

- No caching between pages (navigating away and back refetches everything)
- No optimistic updates
- Manual refetch after every mutation (`fetchClassrooms()` calls everywhere)
- No stale-while-revalidate

---

### CQ-03: Excessive `any` type usage

Multiple files use `any` type for state and data:

- `ClassroomDetail.tsx:46` - `classroomExams: any[]`
- `ClassroomDetail.tsx:47` - `availableExams: any[]`
- `ClassroomDetail.tsx:56` - `editForm: any`
- `ClassroomDetail.tsx:61` - `activities: any[]`
- `StudentRoster.tsx:90-93` - `item: any` in map callbacks
- `StudentClassroomList.tsx:43` - `item: any`

---

### CQ-04: Client-side search filtering instead of server-side

**File:** `useClassroomStudents.ts:47-54`, `ClassroomList.tsx:16-38`

Student search and classroom search are done client-side after fetching all data. For large institutions with hundreds of students per classroom, this won't scale.

---

### CQ-05: No loading/error boundaries

All components implement their own loading spinners and error handling. There's no shared error boundary or skeleton loading pattern for the classrooms module.

---

### CQ-06: Duplicated `EnrolledClassroom` interface

The `EnrolledClassroom` type is defined independently in both `StudentClassroomList.tsx:12-15` and `StudentClassroomView.tsx:10-13` instead of being in `types/classroom.ts`.

---

### CQ-07: Settings toggle directly calls Supabase inline

**File:** `ClassroomDetail.tsx:1000-1030`

The settings toggle buttons contain inline async Supabase calls directly in their `onClick` handlers instead of using a proper hook or function. This makes error handling inconsistent and the code hard to test.

---

## 5. Security Vulnerabilities

### SEC-01: No role-based route protection for classrooms

**File:** `App.tsx:223-231`

Both tutor routes (`/classrooms/*`) and student routes (`/my/classrooms/*`) use the same generic `<ProtectedRoute>`. There's no enforcement that only tutors access `/classrooms` and only students access `/my/classrooms`. A student could navigate to `/classrooms/new` and create a classroom.

---

### SEC-02: `joinClassroom` does full classroom SELECT including `settings`

**File:** `useInviteCode.ts:71`

When joining, the full classroom object is fetched including `settings` JSON, which may contain configuration a student shouldn't see before joining (though in this case settings are relatively benign).

---

### SEC-03: No rate limiting on invite code lookups

The `lookup_classroom_by_code` RPC has no rate limiting. An attacker could brute-force 6-character invite codes (30^6 = ~729 million combinations, but with automated requests it's feasible to find active classrooms).

---

### SEC-04: Enrollment doesn't verify student role

**File:** `useInviteCode.ts:118-142`

When a student joins, the code optionally sets their profile role to `'student'`, but it doesn't prevent a tutor from joining as a student. There's no role validation on enrollment.

---

### SEC-05: `classroom_exam_results` view has no RLS

**File:** `20260215060000_add_classroom_tracking_to_submissions.sql:39`

The view grants `SELECT` to all authenticated users (`GRANT SELECT ... TO authenticated`). Any authenticated user can query all classroom exam results across all classrooms.

---

## 6. UX/UI Problems

### UX-01: "My Results" tab is a dead end

**File:** `StudentClassroomView.tsx:292-301`

The "My Results" tab shows a permanent "Coming Soon" placeholder. Students have no way to see their exam scores within a classroom context.

---

### UX-02: "Student List" tab is a dead end

**File:** `StudentClassroomView.tsx:304-313`

Even when the tutor enables `show_student_list_to_students`, the student just sees a "Coming Soon" message.

---

### UX-03: No pagination for student roster

Large classrooms (100+ students) will render all students at once with no pagination or virtualization.

---

### UX-04: Exam linking modal has no search

**File:** `ClassroomDetail.tsx:743-793`

When linking exams, tutors must scroll through all their exams with no search/filter capability. Tutors with 50+ exams will struggle.

---

### UX-05: No confirmation toast/feedback when toggling settings

The toggle switches in the Settings tab directly write to the database. If the update fails (network issue), the toggle visually flips but the UI state and the database are now out of sync - there's no rollback.

---

### UX-06: `confirm()` used for destructive actions

**Files:** `ClassroomDetail.tsx:282,291,300` and `StudentRoster.tsx:134,148`

Browser `confirm()` dialogs are used for archive, delete, unlink, and remove student. These are ugly, non-customizable, and break the design system. A custom confirmation modal should be used.

---

### UX-07: No empty state for classroom description

When a classroom has no description, the description area just disappears instead of showing a helpful prompt like "Add a description to help students understand this classroom."

---

### UX-08: Tutor name not shown on student classroom view

Students see classroom details but there's no tutor/instructor name displayed, which is an expected feature for any LMS.

---

### UX-09: Hard-coded English strings in some places

While the app uses `i18next`, many strings in `ClassroomDetail.tsx`, `StudentRoster.tsx`, `StudentClassroomView.tsx`, and `EnrollmentModal.tsx` are hard-coded in English (e.g., "Pending Approvals", "Add Student", "Overview", etc.).

---

## 7. Improvement Recommendations

### IMP-01: Create a dedicated `join_classroom` RPC (CRITICAL)

Replace the client-side join logic with a single server-side RPC that:
- Looks up the classroom by code (bypasses RLS safely)
- Checks capacity atomically
- Checks if already enrolled
- Inserts enrollment
- Updates student count
- Creates notification
- Returns result

This fixes BUG-01, BUG-02, and SEC-02 in one change.

---

### IMP-02: Migrate to React Query for all classroom data

Replace manually managed `useState`/`useEffect` patterns with React Query:
- `useQuery('classrooms', ...)` for fetching
- `useMutation` with `invalidateQueries` for mutations
- Automatic caching, background refetching, optimistic updates

---

### IMP-03: Add `due_date` and `assigned_at` columns to `classroom_exams`

```sql
ALTER TABLE classroom_exams
  ADD COLUMN assigned_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN due_date TIMESTAMPTZ,
  ADD COLUMN instructions TEXT DEFAULT '';
```

This enables exam scheduling and per-classroom exam instructions.

---

### IMP-04: Break up `ClassroomDetail.tsx`

Split into:
- `ClassroomDetailLayout.tsx` (header + tabs)
- `tabs/OverviewTab.tsx`
- `tabs/RosterTab.tsx`
- `tabs/ExamsTab.tsx`
- `tabs/SettingsTab.tsx`
- `components/ActivityFeed.tsx`
- `components/LinkExamModal.tsx`

---

### IMP-05: Add server-side pagination and search

For the student roster and classroom list, implement server-side:
- Pagination (offset/limit or cursor-based)
- Search using Supabase `.ilike()` or full-text search
- Sort options (name, date enrolled, status)

---

### IMP-06: Fix `get_classroom_stats` to match TypeScript interface

Update the RPC to return all expected fields:
```sql
'total_students', COUNT(*) WHERE status IN ('active', 'pending', 'suspended'),
'active_students', COUNT(*) WHERE status = 'active',
'total_exams', COUNT(*) FROM classroom_exams,
```

---

### IMP-07: Add role-based route guards

Create separate route guards:
```typescript
<Route path="/classrooms/*" element={<TutorRoute><Outlet /></TutorRoute>} />
<Route path="/my/classrooms/*" element={<StudentRoute><Outlet /></StudentRoute>} />
```

---

### IMP-08: Implement RLS for `classroom_exam_results` view

Either add a security policy wrapper or make it a SECURITY DEFINER function that filters by tutor/student ownership.

---

### IMP-09: Add rate limiting to invite code lookup

On the Supabase side, add a rate-limit check (e.g., max 10 lookups per minute per user) inside the `lookup_classroom_by_code` RPC.

---

### IMP-10: Replace `confirm()` with custom modal

Create a reusable `<ConfirmationModal>` component that matches the app's design system for all destructive actions.

---

### IMP-11: Implement the "My Results" tab for students

Query `submissions` joining `classroom_exams` for the current student to show:
- Exam name, score, percentage, time taken
- Submission date
- Comparison to classroom average (optional)

---

### IMP-12: Implement the student list tab

When `show_student_list_to_students` is enabled, show classmates with:
- Name, avatar
- Grade level
- (No email - privacy)

---

## 8. New Features for Institution-Grade System

The current system covers basic classroom management. Below are features required to compete with platforms like Google Classroom, Schoology, Canvas, and ClassDojo.

---

### FEAT-01: Announcements & Communication System

**Priority:** Critical

| Feature | Description |
|---------|-------------|
| Classroom announcements | Tutor posts text/rich updates visible to all students |
| Announcement comments | Students can reply to announcements |
| Pinned announcements | Pin important messages to the top |
| Push notifications | Notify students of new announcements via FCM |
| Email notifications | Send announcement summaries via email |
| Scheduled announcements | Post at a scheduled time |

---

### FEAT-02: Assignment System (Beyond Exams)

**Priority:** Critical

| Feature | Description |
|---------|-------------|
| Homework assignments | Create assignments with description, attachments, due dates |
| File submissions | Students upload files (PDF, DOCX, images) as submissions |
| Grading rubrics | Define rubrics for consistent grading |
| Late submission handling | Configurable late penalty policies |
| Assignment categories | Homework, Project, Quiz, Midterm, Final |
| Draft assignments | Save and publish later |

---

### FEAT-03: Gradebook & Report Cards

**Priority:** Critical

| Feature | Description |
|---------|-------------|
| Weighted grade categories | Exams 40%, Homework 30%, Projects 30% |
| Grade calculation | Auto-calculate cumulative grades |
| Grade export (CSV/XLSX/PDF) | Export class grades for admin use |
| Individual student reports | Per-student progress PDF |
| Parent report cards | Formatted report cards for printing |
| Grade history | Track grade changes over time |
| GPA calculation | Configurable GPA scale |

---

### FEAT-04: Attendance Tracking

**Priority:** High

| Feature | Description |
|---------|-------------|
| Daily attendance | Mark present, absent, late, excused |
| Attendance reports | Per-student and per-class reports |
| Auto-attendance via QR scan | Students scan QR code to check in |
| Attendance alerts | Notify parents after X absences |
| Attendance percentage | Track and display attendance rates |

---

### FEAT-05: Multi-Tutor / Co-Teacher Support

**Priority:** High

| Feature | Description |
|---------|-------------|
| Co-teachers | Assign multiple tutors to a classroom |
| Role-based permissions | Owner vs. co-teacher vs. teaching assistant |
| Shared classrooms | Multiple tutors manage the same classroom |
| Teacher notes | Internal notes visible only to teachers |

---

### FEAT-06: Classroom Content / Resource Library

**Priority:** High

| Feature | Description |
|---------|-------------|
| File sharing | Upload PDF, DOCX, PPTX, videos to classroom |
| Organized by topic/unit | Folder structure or tags |
| Student access control | Release materials on a schedule |
| External links | Link to YouTube videos, websites |
| Content versioning | Update files without breaking links |

---

### FEAT-07: Calendar & Scheduling

**Priority:** High

| Feature | Description |
|---------|-------------|
| Classroom calendar | View all exams, assignments, due dates |
| Schedule view | Weekly/monthly calendar view |
| iCal export | Export to Google Calendar / Apple Calendar |
| Exam scheduling | Set exam availability windows (start/end) |
| Reminder notifications | 24h and 1h before due dates |

---

### FEAT-08: Parent Portal

**Priority:** Medium-High

| Feature | Description |
|---------|-------------|
| Parent accounts | Linked to student accounts |
| Grade visibility | Parents see student grades in real-time |
| Attendance visibility | Parents see attendance records |
| Message to tutor | Direct parent-tutor messaging |
| Weekly digest email | Auto-summary of student activity |

---

### FEAT-09: Analytics Dashboard (Tutor)

**Priority:** Medium-High

| Feature | Description |
|---------|-------------|
| Class-level analytics | Average scores, score distribution, pass rates |
| Student-level analytics | Individual progress tracking |
| Exam analytics | Question-level difficulty analysis |
| Comparison across classrooms | Cross-classroom performance comparison |
| Trend charts | Score trends over time (line charts) |
| At-risk student identification | Flag students performing below threshold |
| Export analytics | PDF reports for administrators |

---

### FEAT-10: Classroom Groups / Sections

**Priority:** Medium

| Feature | Description |
|---------|-------------|
| Sub-groups within classroom | Create study groups, lab sections |
| Group assignments | Assign work to specific groups |
| Group-based seating | Virtual seating arrangement |
| Group discussions | Discussion threads per group |

---

### FEAT-11: Discussion Forum / Q&A

**Priority:** Medium

| Feature | Description |
|---------|-------------|
| Threaded discussions | Per-topic discussion threads |
| Q&A board | Students ask, tutor or peers answer |
| Upvoting | Best answers rise to the top |
| Mark as answered | Tutor marks questions resolved |
| Anonymous posting | Optional anonymous questions |

---

### FEAT-12: Notification Center

**Priority:** Medium

| Feature | Description |
|---------|-------------|
| In-app notification center | Bell icon with notification list |
| Push notifications | Mobile push via FCM (already partially set up) |
| Email digests | Daily/weekly summaries |
| Notification preferences | Per-type opt-in/opt-out |
| Read/unread tracking | Mark as read functionality |

---

### FEAT-13: Classroom Templates

**Priority:** Low-Medium

| Feature | Description |
|---------|-------------|
| Save as template | Save a classroom setup as a reusable template |
| Clone classroom | Duplicate classroom for a new semester |
| Template library | Institution-wide shared templates |
| Auto-populate from template | Create classroom pre-filled from template |

---

### FEAT-14: Bulk Operations

**Priority:** Low-Medium

| Feature | Description |
|---------|-------------|
| Bulk student import via CSV | Already exists but basic |
| Bulk email students | Send email to all or filtered students |
| Bulk grade entry | Enter grades for multiple students at once |
| Bulk transfer | Move students between classrooms |
| Bulk archive | Archive multiple classrooms at once |

---

### FEAT-15: Accessibility & Localization

**Priority:** Medium

| Feature | Description |
|---------|-------------|
| Full Arabic RTL support | Ensure all classroom UI is RTL-ready |
| Complete i18n | All strings translated (currently many hardcoded) |
| Keyboard navigation | Full keyboard accessibility |
| Screen reader support | ARIA labels on all interactive elements |
| High contrast mode | For visually impaired users |

---

### FEAT-16: API & Integrations

**Priority:** Low (Future)

| Feature | Description |
|---------|-------------|
| REST/GraphQL API | For third-party integrations |
| LTI support | Integrate with other LMS platforms |
| Google Workspace integration | Import students from Google Classroom |
| Microsoft Teams integration | Sync with MS Teams classes |
| Zoom/Meet integration | Schedule and link virtual classes |
| Webhook notifications | Notify external systems on events |

---

## Summary Priority Matrix

| Priority | Items |
|----------|-------|
| **CRITICAL (Fix Now)** | BUG-01 (join broken by RLS), BUG-02 (race condition), SEC-01 (no role guard), SEC-05 (view no RLS), IMP-01 (join RPC) |
| **HIGH (Next Sprint)** | BUG-04/05 (column mismatch), IMP-02 (React Query), IMP-04 (split monolith), IMP-07 (role guards), FEAT-01 (announcements), FEAT-02 (assignments) |
| **MEDIUM (Roadmap)** | CQ-01 through CQ-07, IMP-03/05/06, FEAT-03 through FEAT-09 |
| **LOW (Backlog)** | UX-07/08, IMP-10/11/12, FEAT-10 through FEAT-16 |

---

*Generated by codebase analysis - February 2026*
