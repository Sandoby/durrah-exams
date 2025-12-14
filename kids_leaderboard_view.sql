-- Kids Mode leaderboard view (Phase 4)
-- Best submission per nickname for each exam (kids submissions only).
-- Apply in Supabase SQL editor.
--
-- NOTE: Your schema does not have `submitted_at`, so we use `created_at`.

create or replace view public.exam_leaderboard as
with ranked as (
  select
    s.exam_id,
    coalesce(nullif(s.nickname, ''), s.student_name) as nickname,
    s.score,
    s.max_score,
    s.percentage,
    s.created_at as submitted_at,
    s.id as submission_id,
    row_number() over (
      partition by s.exam_id, coalesce(nullif(s.nickname, ''), s.student_name)
      order by s.percentage desc, s.score desc, s.created_at asc
    ) as rn
  from public.submissions s
  where s.child_mode = true
)
select
  exam_id,
  nickname,
  score,
  max_score,
  percentage,
  submitted_at,
  submission_id
from ranked
where rn = 1;
