-- Kids Mode schema updates (Phase 3)
-- Apply in Supabase SQL editor.

-- 1) Exams: quiz_code (used by kids to join)
alter table if exists public.exams
add column if not exists quiz_code text;

-- Make it unique (case-insensitive uniqueness)
create unique index if not exists exams_quiz_code_unique
on public.exams (upper(quiz_code));

-- 2) Submissions: mark and identify kids submissions
alter table if exists public.submissions
add column if not exists child_mode boolean not null default false;

alter table if exists public.submissions
add column if not exists nickname text;

alter table if exists public.submissions
add column if not exists quiz_code text;

-- Helpful index for attempts counting + leaderboard queries
create index if not exists submissions_exam_nickname_idx
on public.submissions (exam_id, nickname);

create index if not exists submissions_exam_child_mode_idx
on public.submissions (exam_id, child_mode);

-- Optional: keep quiz_code on submissions aligned to exam for easier leaderboard
-- (You can enforce with a trigger later if you want.)
