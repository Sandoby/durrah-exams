# Kids Mode (Nickname + Code) — Task Panel

## Phase 0 — Ground rules (MVP)
- Kids enter **Nickname + Quiz Code only**.
- Tutor controls (per exam):
  - `settings.child_mode_enabled: boolean`
  - `settings.attempt_limit: number | null`
  - `settings.leaderboard_visibility: 'hidden' | 'after_submit' | 'always'`
- Kids quizzes use existing grading Edge Function `grade-exam`.

---

## Phase 1 — Frontend routing + landing page
- [x] Add new page: `frontend/src/pages/KidsLanding.tsx`
- [x] Add routes in `frontend/src/App.tsx`
  - `/kids` → `KidsLanding`
  - `/kids/quiz/:id` → `KidsExamView`
- [x] In `KidsLanding`, resolve `quiz_code` → `exam.id`
- [x] Check attempts (frontend MVP) before entering quiz
- [x] Create `frontend/src/pages/KidsExamView.tsx`

## Phase 2 — Kids quiz page (Option B)
- [x] Fetch exam + questions in `KidsExamView.tsx`
- [x] Render kid UI (big buttons + colorful layout)
- [x] Submit to `grade-exam` with `child_mode/nickname/quiz_code`
- [x] Use `leaderboard_visibility` from exam settings (not only query param)

## Phase 3 — Attempt limiting (real enforcement)
- [ ] Add DB columns/JSON:
  - `exams.quiz_code` unique
  - `submissions.nickname`, `submissions.child_mode`, `submissions.quiz_code`
- [ ] Update Edge Function `grade-exam`:
  - Fetch exam settings
  - If child mode and attempt_limit reached for nickname, reject

## Phase 4 — Leaderboard
- [ ] Create SQL view `exam_leaderboard` (best submission per nickname per exam)
- [ ] Add `KidsLeaderboard` component:
  - show top N
  - show current kid rank
- [ ] Display based on `leaderboard_visibility`

## Phase 5 — Deepen the game (optional)
- [ ] Stars + streak HUD (make it depend on correctness later)
- [ ] Badges on submit
- [ ] Realtime leaderboard updates if `leaderboard_visibility='always'`
