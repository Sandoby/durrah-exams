# Durrah Tutors — Full Platform Expansion Plan

> **Goal:** Transform Durrah from an online-exam-only tool into a **complete tutor–student platform** covering everything a private tutor or small institution needs to manage classes, content, communication, and student progress — all in one place.

---

## 1. What Already Exists (Current State)

| Area | Features |
|---|---|
| **Exams** | Create/edit exams, question types (MCQ, true/false, essay, fill-in-blank), anti-cheating proctoring, exam analytics, exam results, kid-friendly quiz mode |
| **Question Bank** | Reusable question pools with categories, tags, difficulty levels, AI question generation |
| **Study Zone** | Pomodoro timer, Leitner flashcards, Blurting method, Feynman notepad, SQ3R reader |
| **Payments** | Subscription plans, trial system, Dodo/Kashier payment providers |
| **Support** | Live chat widget, support agent dashboard |
| **Blog** | Marketing blog with posts |
| **Mobile** | Capacitor-wrapped mobile app, push notifications |
| **Auth** | Email/OTP login, Google OAuth, role-based access (admin/tutor/agent) |
| **i18n** | Arabic + English, RTL support |
| **Analytics** | Exam-level analytics, traffic tracking |

---

## 2. What's Missing (New Modules)

The expansion is organized into **8 major modules**, each broken into phases.

---

### Module A — Student Management & Classrooms

**Why:** Currently there's no formal student roster. Tutors share exam links ad-hoc. We need structured classes.

#### Database Tables

```
classrooms
  id, tutor_id, name, description, subject, grade_level,
  cover_image, color, invite_code (unique 6-char),
  academic_year, is_archived, created_at, updated_at

classroom_students
  id, classroom_id, student_id (FK profiles), enrolled_at,
  status (active/suspended/removed), enrollment_method (invite_code/manual/link)

student_profiles (extend existing profiles)
  + parent_email, parent_phone, grade_level, school_name,
  + date_of_birth, avatar_url, bio, student_number
```

#### Features

- **A1 — Classroom CRUD** *(Phase 1)*
  - Create classrooms with name, subject, grade level, color/cover
  - Generate unique invite codes & shareable join links
  - Archive/unarchive classrooms at end of term
  - Classroom settings (auto-approve students, max capacity)

- **A2 — Student Enrollment** *(Phase 1)*
  - Students join via invite code or link
  - Tutor can manually add students by email
  - Bulk import students via CSV (name, email, parent_email)
  - Enrollment approval workflow (optional)

- **A3 — Student Roster** *(Phase 1)*
  - View all students per classroom with search/filter
  - Student profile cards (name, email, enrollment date, last active)
  - Suspend / remove students
  - Transfer students between classrooms

- **A4 — Student Groups** *(Phase 2)*
  - Create sub-groups within a classroom (e.g., "Group A", "Advanced")
  - Assign content/exams to specific groups
  - Group-based leaderboards

---

### Module B — Course & Lesson Management

**Why:** Tutors need a way to organize lessons, materials, and learning sequences — not just exams.

#### Database Tables

```
courses
  id, classroom_id, tutor_id, title, description, thumbnail,
  is_published, sort_order, created_at, updated_at

course_units
  id, course_id, title, description, sort_order, is_locked

lessons
  id, unit_id, course_id, tutor_id, title, description,
  content_type (text/video/pdf/slides/mixed), content_body (rich text),
  video_url, duration_minutes, sort_order, is_published,
  is_free_preview, created_at, updated_at

lesson_attachments
  id, lesson_id, file_name, file_url, file_type, file_size,
  uploaded_at

lesson_progress
  id, lesson_id, student_id, status (not_started/in_progress/completed),
  progress_percent, time_spent_seconds, last_accessed_at, completed_at
```

#### Features

- **B1 — Course Builder** *(Phase 1)*
  - Create courses with units (chapters) and lessons
  - Drag-and-drop reordering of units and lessons
  - Rich text lesson editor with LaTeX/math support (reuse existing KaTeX)
  - Embed YouTube/Vimeo videos in lessons
  - Upload PDF/PowerPoint/document attachments per lesson

- **B2 — Content Delivery** *(Phase 1)*
  - Students view lessons in sequential order
  - Mark lessons as complete (manual or auto on video finish)
  - Progress bar per course and per unit
  - Prerequisite locking (must complete Lesson 1 before Lesson 2, optional)

- **B3 — Resource Library** *(Phase 2)*
  - Centralized file manager per classroom
  - Folder organization (by subject/topic/date)
  - Supported file types: PDF, images, audio, video, docs
  - Storage quota per subscription tier
  - Drag-and-drop upload with progress indicator

- **B4 — Lesson Templates** *(Phase 3)*
  - Save lesson structures as reusable templates
  - Community-shared templates (optional future)
  - Clone lessons across courses

---

### Module C — Assignments & Homework

**Why:** Exams are summative. Tutors need a way to assign practice work, homework, and projects with due dates.

#### Database Tables

```
assignments
  id, classroom_id, tutor_id, title, description,
  type (homework/project/worksheet/practice),
  due_date, allow_late_submission, late_penalty_percent,
  max_points, attachments (jsonb), is_published,
  assigned_to (all/group/individual), group_ids (array),
  created_at, updated_at

assignment_submissions
  id, assignment_id, student_id, submitted_at,
  content (rich text), attachments (jsonb),
  grade, feedback (rich text), graded_at, graded_by,
  status (pending/submitted/graded/returned/resubmitted),
  is_late, attempt_number
```

#### Features

- **C1 — Assignment Creation** *(Phase 1)*
  - Create assignments with title, instructions (rich text), attachments
  - Set due date + time with timezone support
  - Point value and rubric (optional)
  - Assign to entire classroom, specific group, or individual students
  - Schedule assignments to publish at a future date

- **C2 — Student Submission** *(Phase 1)*
  - Students submit text responses or file uploads
  - Late submission tracking with optional penalty
  - Multiple attempts (configurable by tutor)
  - Draft saving before final submit

- **C3 — Grading & Feedback** *(Phase 1)*
  - Inline grading interface (view submission + grade side-by-side)
  - Rich text feedback with annotations
  - Quick-grade mode (batch grading with number input)
  - Return submissions for revision
  - Grade with rubric criteria

- **C4 — Plagiarism Awareness** *(Phase 3)*
  - Text similarity comparison between student submissions
  - Flag suspiciously similar submissions
  - Copy-paste tracking (similar to exam proctoring)

---

### Module D — Gradebook & Progress Tracking

**Why:** A unified view of all student performance across exams, assignments, and attendance.

#### Database Tables

```
gradebook_entries
  id, classroom_id, student_id, source_type (exam/assignment/attendance/manual),
  source_id, title, points_earned, points_possible,
  weight, category (homework/exam/participation/project),
  created_at

grade_categories
  id, classroom_id, name, weight_percent, color

report_cards
  id, classroom_id, student_id, period (term/semester/year),
  generated_at, data (jsonb), pdf_url
```

#### Features

- **D1 — Gradebook View** *(Phase 1)*
  - Spreadsheet-style gradebook (students × assignments/exams)
  - Auto-populated from exam results and graded assignments
  - Manual grade entry for participation, projects, etc.
  - Category weighting (e.g., Exams 40%, Homework 30%, Participation 30%)
  - Calculate running averages, letter grades, GPA

- **D2 — Student Progress Dashboard** *(Phase 1)*
  - Per-student view: all grades, lesson progress, attendance
  - Performance trends over time (line charts)
  - Strengths & weaknesses analysis from exam data
  - Comparison to class average (anonymized)

- **D3 — Report Cards** *(Phase 2)*
  - Generate PDF report cards per student per term
  - Customizable template with tutor logo/branding
  - Include grades, comments, attendance summary
  - Email report cards to students/parents

- **D4 — Learning Analytics** *(Phase 3)*
  - AI-powered insights: "Student X is struggling with Chapter 3"
  - Predicted performance based on trends
  - Engagement metrics (login frequency, time on platform, lessons completed)
  - Exportable data for institutional reporting (CSV/Excel)

---

### Module E — Scheduling & Calendar

**Why:** Tutors need to manage lesson schedules, session bookings, and deadlines in one place.

#### Database Tables

```
calendar_events
  id, tutor_id, classroom_id (nullable), title, description,
  event_type (lesson/session/exam/assignment_due/holiday/custom),
  start_time, end_time, is_all_day, is_recurring,
  recurrence_rule (RRULE string), location (text/url),
  color, reminder_minutes (array), created_at

session_bookings
  id, tutor_id, student_id, event_id,
  status (pending/confirmed/cancelled/completed),
  notes, created_at

tutor_availability
  id, tutor_id, day_of_week, start_time, end_time,
  is_available, effective_from, effective_until
```

#### Features

- **E1 — Calendar View** *(Phase 2)*
  - Monthly/weekly/daily/agenda calendar views
  - Color-coded by event type
  - Drag-and-drop event scheduling
  - Filter by classroom
  - Sync with Google Calendar (export .ics)

- **E2 — Session Scheduling** *(Phase 2)*
  - Tutor sets availability slots
  - Students book 1-on-1 sessions from available slots
  - Confirmation/cancellation workflow
  - Automated reminders (push notification + email)

- **E3 — Timetable** *(Phase 2)*
  - Weekly recurring timetable per classroom
  - Auto-generate timetable from recurring events
  - Print-friendly timetable view

- **E4 — Deadline Tracker** *(Phase 2)*
  - Unified view of all upcoming deadlines (exams, assignments)
  - Student-facing "upcoming" widget on dashboard
  - Overdue alerts

---

### Module F — Communication & Announcements

**Why:** Tutors need structured communication channels beyond the existing support chat.

#### Database Tables

```
announcements
  id, tutor_id, classroom_id (nullable = all classrooms),
  title, content (rich text), priority (normal/important/urgent),
  is_pinned, attachments (jsonb), published_at, created_at

announcement_reads
  id, announcement_id, student_id, read_at

classroom_messages
  id, classroom_id, sender_id, sender_role, content,
  reply_to_id, attachments (jsonb), is_edited,
  created_at, updated_at

discussion_threads
  id, classroom_id, author_id, title, content,
  is_pinned, is_locked, category, created_at

discussion_replies
  id, thread_id, author_id, content, is_answer,
  upvotes, created_at
```

#### Features

- **F1 — Announcements** *(Phase 1)*
  - Post announcements to specific classroom or all classrooms
  - Priority levels with visual indicators
  - Pin important announcements
  - Track who has read each announcement
  - Push notification on new announcement

- **F2 — Classroom Chat** *(Phase 2)*
  - Real-time group chat per classroom (reuse existing Convex/Supabase realtime)
  - File sharing in chat
  - Tutor can mute/moderate chat
  - Pin messages
  - Reply threads

- **F3 — Direct Messaging** *(Phase 2)*
  - 1-on-1 messaging between tutor and individual student
  - Message history
  - Read receipts

- **F4 — Discussion Forum** *(Phase 3)*
  - Per-classroom Q&A forum
  - Students post questions, others answer
  - Tutor can mark "best answer"
  - Upvoting system
  - Category/topic filtering

---

### Module G — Attendance & Participation

**Why:** Tracking attendance is essential for tutors, especially for paid tutoring where session records matter.

#### Database Tables

```
attendance_records
  id, classroom_id, session_date, created_by

attendance_entries
  id, record_id, student_id,
  status (present/absent/late/excused),
  notes, marked_at

participation_points
  id, classroom_id, student_id, points, reason,
  awarded_by, awarded_at
```

#### Features

- **G1 — Attendance Taking** *(Phase 2)*
  - Quick attendance sheet per session (mark present/absent/late/excused)
  - Batch marking (mark all present, then adjust)
  - QR code check-in (students scan to mark attendance)
  - Auto-mark from live session join

- **G2 — Attendance Reports** *(Phase 2)*
  - Attendance percentage per student
  - Calendar heatmap of attendance
  - Exportable attendance sheets (PDF/CSV)
  - Automatic alerts for chronic absenteeism

- **G3 — Participation Tracking** *(Phase 3)*
  - Award participation points during class
  - Leaderboard by participation (reuse existing leaderboard components)
  - Integrate participation into gradebook

---

### Module H — Parent Portal & Certificates

**Why:** Parents want visibility. Certificates add professional value to tutoring.

#### Database Tables

```
parent_links
  id, parent_email, student_id, relationship (parent/guardian),
  access_token, is_verified, created_at

certificates
  id, tutor_id, student_id, course_id (nullable),
  classroom_id (nullable), title, description,
  template (jsonb), issued_at, certificate_number,
  pdf_url, is_revoked

certificate_templates
  id, tutor_id, name, design (jsonb), background_image,
  created_at
```

#### Features

- **H1 — Parent Portal** *(Phase 3)*
  - Parent receives email invite with secure access link
  - Read-only dashboard: grades, attendance, upcoming exams
  - View report cards
  - No signup required (token-based access)
  - Optional: parent can message tutor

- **H2 — Certificates** *(Phase 2)*
  - Generate course/exam completion certificates
  - Customizable template (tutor logo, colors, text)
  - Unique certificate number for verification
  - Public verification page (enter cert number → see details)
  - Bulk generate for entire class

---

## 3. Implementation Phases

### Phase 1 — Foundation (Weeks 1–6)
> Get the core classroom + content + grading loop working.

| Week | Tasks |
|---|---|
| 1–2 | **A1, A2, A3** — Classroom creation, student enrollment, roster management |
| 3–4 | **B1, B2** — Course builder, lesson delivery with progress tracking |
| 5 | **C1, C2, C3** — Assignments: create, submit, grade |
| 6 | **D1, D2** — Gradebook, student progress dashboard |
| 6 | **F1** — Announcements system |

**Deliverable:** A tutor can create a classroom → invite students → publish lessons → assign homework → grade it → view overall gradebook.

---

### Phase 2 — Engagement & Operations (Weeks 7–12)
> Add scheduling, communication, attendance, and certificates.

| Week | Tasks |
|---|---|
| 7–8 | **E1, E2, E3, E4** — Calendar, session scheduling, timetable, deadlines |
| 9 | **G1, G2** — Attendance taking and reports |
| 10 | **F2, F3** — Classroom chat, direct messaging |
| 11 | **H2** — Certificate generation |
| 12 | **A4, B3** — Student groups, resource library |

**Deliverable:** Full operational toolkit — tutors can schedule, take attendance, chat with students, and issue certificates.

---

### Phase 3 — Advanced & Intelligence (Weeks 13–18)
> AI insights, parent access, community features, polishing.

| Week | Tasks |
|---|---|
| 13–14 | **D3, D4** — Report cards, AI learning analytics |
| 15 | **H1** — Parent portal |
| 16 | **F4** — Discussion forum |
| 17 | **G3, C4** — Participation tracking, plagiarism detection |
| 18 | **B4** — Lesson templates, polish, final QA |

**Deliverable:** Intelligent platform with parent access, advanced analytics, and community features.

---

## 4. Tech Architecture Decisions

### Frontend (Extend Existing)
- **Framework:** React + TypeScript + Vite (already in use)
- **UI:** Existing Tailwind + shadcn/ui components
- **State:** React Query for server state, Context for auth (already in use)
- **Realtime:** Supabase Realtime for chat/notifications (already in use)
- **Rich Text:** Extend existing QuestionTextEditor for lesson content
- **Calendar:** `@fullcalendar/react` or custom with `date-fns`
- **Drag & Drop:** `@dnd-kit/core` for course builder reordering

### Backend (Extend Existing)
- **Database:** Supabase (PostgreSQL) — add new tables with RLS policies
- **Storage:** Supabase Storage for file uploads (lessons, attachments, resources)
- **Auth:** Existing Supabase Auth — add parent role
- **Edge Functions:** Supabase Edge Functions for certificate PDF generation, report cards
- **Notifications:** Extend existing push notification system

### Mobile (Extend Existing)
- **Framework:** Capacitor (already in use)
- **New Screens:** Student dashboard, lesson viewer, assignment submission, chat

### New Role: `student`
- Currently the system has: `admin`, `tutor`, `agent`
- Add: `student` role with its own dashboard, course view, assignment submission
- Add: `parent` (read-only access via token)

---

## 5. Navigation Restructure

### Tutor Dashboard (after login)
```
📊 Dashboard (overview: classrooms, recent activity, quick stats)
├── 🏫 Classrooms
│   ├── [Classroom Name]
│   │   ├── 📋 Roster
│   │   ├── 📚 Courses & Lessons
│   │   ├── 📝 Exams (existing)
│   │   ├── 📄 Assignments
│   │   ├── 📊 Gradebook
│   │   ├── 📅 Schedule
│   │   ├── ✅ Attendance
│   │   ├── 📢 Announcements
│   │   ├── 💬 Chat
│   │   └── 📁 Resources
│   └── + New Classroom
├── ❓ Question Bank (existing)
├── 🏆 Certificates
├── 📈 Analytics (expanded)
├── 💳 Subscription (existing)
└── ⚙️ Settings (existing)
```

### Student Dashboard (after login)
```
📊 My Dashboard (overview: upcoming deadlines, recent grades, announcements)
├── 🏫 My Classrooms
│   ├── [Classroom Name]
│   │   ├── 📚 Lessons
│   │   ├── 📝 Exams
│   │   ├── 📄 Assignments
│   │   ├── 📊 My Grades
│   │   ├── 📅 Schedule
│   │   ├── 📢 Announcements
│   │   ├── 💬 Chat
│   │   └── 📁 Resources
├── 📖 Study Zone (existing)
├── 🏆 My Certificates
├── 📈 My Progress
└── ⚙️ Settings
```

---

## 6. New Routes

```typescript
// Classroom routes
/classrooms                           // List all classrooms
/classrooms/new                       // Create classroom
/classrooms/:id                       // Classroom overview
/classrooms/:id/roster                // Student roster
/classrooms/:id/courses               // Course list
/classrooms/:id/courses/new           // Create course
/classrooms/:id/courses/:courseId      // Course detail (units + lessons)
/classrooms/:id/courses/:courseId/lessons/:lessonId  // Lesson view/edit
/classrooms/:id/assignments           // Assignment list
/classrooms/:id/assignments/new       // Create assignment
/classrooms/:id/assignments/:assignmentId  // Assignment detail
/classrooms/:id/gradebook             // Gradebook
/classrooms/:id/schedule              // Calendar/schedule
/classrooms/:id/attendance            // Attendance
/classrooms/:id/announcements         // Announcements
/classrooms/:id/chat                  // Classroom chat
/classrooms/:id/resources             // Resource library

// Student-specific routes
/my/classrooms                        // Student's enrolled classrooms
/my/classrooms/:id                    // Student classroom view
/my/grades                            // All grades across classrooms
/my/assignments                       // All assignments across classrooms
/my/certificates                      // Earned certificates

// Parent routes
/parent/:token                        // Parent portal (token-based)

// Certificate verification
/verify/:certificateNumber            // Public certificate verification
```

---

## 7. Database Schema Overview (New Tables)

> All tables use UUID primary keys and include Row Level Security (RLS) policies.

| Table | Purpose | RLS Policy |
|---|---|---|
| `classrooms` | Classroom definitions | Tutor owns; students read enrolled |
| `classroom_students` | Enrollment records | Tutor manages; student reads own |
| `courses` | Course structure | Tutor owns; enrolled students read |
| `course_units` | Chapter/section grouping | Inherits from course |
| `lessons` | Individual lesson content | Inherits from course |
| `lesson_attachments` | Files attached to lessons | Inherits from lesson |
| `lesson_progress` | Student completion tracking | Student owns own; tutor reads all |
| `assignments` | Homework/projects | Tutor creates; enrolled students read |
| `assignment_submissions` | Student work submissions | Student owns; tutor grades |
| `gradebook_entries` | Aggregated grades | Tutor manages; student reads own |
| `grade_categories` | Grade weight categories | Tutor manages |
| `report_cards` | Generated report cards | Tutor generates; student/parent reads |
| `calendar_events` | Schedule entries | Tutor manages; enrolled students read |
| `session_bookings` | 1-on-1 session bookings | Tutor + student involved |
| `tutor_availability` | Available time slots | Tutor manages; students read |
| `announcements` | Tutor announcements | Tutor creates; enrolled students read |
| `announcement_reads` | Read tracking | Student creates own |
| `classroom_messages` | Group chat messages | Classroom members |
| `discussion_threads` | Forum threads | Classroom members |
| `discussion_replies` | Forum replies | Classroom members |
| `attendance_records` | Session attendance headers | Tutor creates |
| `attendance_entries` | Per-student attendance | Tutor marks; student reads own |
| `participation_points` | Extra credit / participation | Tutor awards |
| `parent_links` | Parent access tokens | System manages |
| `certificates` | Issued certificates | Tutor issues; student reads own |
| `certificate_templates` | Reusable cert designs | Tutor owns |

---

## 8. Subscription Tier Adjustments

| Feature | Free | Basic | Pro | Institution |
|---|---|---|---|---|
| Classrooms | 1 | 3 | 10 | Unlimited |
| Students per classroom | 15 | 30 | 100 | Unlimited |
| Storage | 100 MB | 1 GB | 10 GB | 50 GB |
| Courses per classroom | 1 | 5 | Unlimited | Unlimited |
| Exams (existing) | 3 | 15 | Unlimited | Unlimited |
| Assignments | 5 | 30 | Unlimited | Unlimited |
| Certificates | ❌ | 10/month | Unlimited | Unlimited |
| AI Question Gen (existing) | 5/day | 20/day | Unlimited | Unlimited |
| Analytics | Basic | Standard | Advanced + AI | Advanced + AI |
| Parent Portal | ❌ | ❌ | ✅ | ✅ |
| Discussion Forum | ❌ | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |

---

## 9. Key UX Principles

1. **Classroom-Centric:** Everything is organized around classrooms. A tutor's dashboard shows their classrooms first, then drills down.
2. **Mobile-First:** All new features must work on the existing Capacitor mobile app. Design for touch interactions.
3. **Arabic-First:** All new UI strings must be in both Arabic and English from day one. RTL layouts must be tested.
4. **Progressive Disclosure:** Don't overwhelm new tutors. Show features gradually as they set up their first classroom.
5. **Offline Resilience:** Students should be able to view downloaded lessons and draft assignments offline (queue sync).
6. **Consistency:** Reuse existing UI patterns (toast notifications, modals, card layouts, color scheme).

---

## 10. Migration Strategy

1. **Existing tutors** keep all their current exams and data — nothing changes for them.
2. **New "Classrooms" section** is added to the dashboard sidebar.
3. **Existing exams** can be optionally linked to a classroom (but standalone exams still work).
4. **Student role** is introduced — when someone joins via invite code, they get `role: 'student'` and see the student dashboard.
5. **No breaking changes** to the current exam link-sharing flow.

---

## 11. Success Metrics

| Metric | Target (6 months post-launch) |
|---|---|
| Classrooms created | 500+ |
| Students enrolled | 5,000+ |
| Lessons published | 2,000+ |
| Assignments graded | 10,000+ |
| Tutor retention (monthly active) | 60%+ |
| Student daily active rate | 40%+ |
| Average session duration | 15+ minutes |
| Subscription conversion (free → paid) | 8%+ |

---

## 12. Risk & Mitigation

| Risk | Mitigation |
|---|---|
| Feature bloat overwhelming the UI | Progressive disclosure; phased rollout; feature flags |
| Storage costs from file uploads | Per-tier quotas; lazy loading; compression |
| Real-time chat scaling | Supabase Realtime handles moderate scale; Convex for high throughput (already integrated) |
| Mobile performance with new features | Lazy route loading; skeleton screens; offline caching |
| Existing exam users confused by changes | Exams still work standalone; classroom is additive, not mandatory |
| Arabic translation backlog | Enforce i18n-first development; no PR merged without both language keys |

---

*This plan turns Durrah from an exam tool into a complete tutor operating system — exams, lessons, assignments, grades, communication, and parent visibility — all under one roof.*
