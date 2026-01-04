# Convex Integration Plan (Supabase Hybrid)

**Objective:** Add Convex as a real-time layer for mission-critical live features while keeping Supabase as the source of truth for auth, data, and storage.

**Primary targets:**
- Live Proctoring Dashboard (real-time student state + violations)
- Simplified Real-time Chat (support + exam rooms)
- Presence/Typing Indicators
- Kids Live Leaderboard (scores pushed from grading)
- Scheduled jobs for cleanups/reminders

---

## 1) Current State (Supabase)

- Auth: Supabase Auth with PKCE (see [frontend/src/lib/supabase.ts](frontend/src/lib/supabase.ts))
- Data: Exams, questions, submissions, analytics in Postgres (see [supabase_schema.sql](supabase_schema.sql))
- Chat: Supabase Realtime, high complexity in [frontend/src/services/RealtimeChatService.ts](frontend/src/services/RealtimeChatService.ts) and [frontend/src/components/support/AgentChatInterface.tsx](frontend/src/components/support/AgentChatInterface.tsx)
- Edge functions: grading, payments, notifications (see [supabase/functions/](supabase/functions))
- Anti-cheat: handled in [frontend/src/pages/ExamView.tsx](frontend/src/pages/ExamView.tsx) with local violation log; no live tutor visibility

Pain points Convex will solve:
- Complex Realtime wiring for chat/presence (multiple channels, cleanup)
- No live tutor visibility into student progress/violations
- No built-in presence/typing; custom broadcast logic
- Leaderboard and reminders not reactive

---

## 2) Hybrid Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Frontend (React/Vite)                                    │
├──────────────────────────────────────────────────────────┤
│ Supabase (source of truth)   │ Convex (real-time layer)  │
│ • Auth, RLS, storage         │ • Proctoring sessions     │
│ • Exams, submissions, chat   │ • Chat/presence (live)    │
│ • Edge functions (grading)   │ • Leaderboard (live)      │
│ • Payments, coupons          │ • Cron jobs (cleanup/rem) │
└──────────────────────────────────────────────────────────┘
```

Principles:
- Supabase keeps all durable data and auth.
- Convex stores ephemeral/operational state for low-latency delivery.
- Sync is event-driven (grade → Convex leaderboard; auth → Convex identity).

---

## 3) Convex Data Model (schema.ts)

**examSessions** (live proctoring)
- exam_id, student_id, student_name
- status: active | submitted | disconnected
- current_question, answered_count
- violations: [{ type, timestamp, detail? }]
- last_heartbeat, started_at, ended_at?

**chatSessions**
- id, scope: exam | support, exam_id?, student_id?, tutor_id?, agent_id?
- status: waiting | active | ended
- assigned_to (agent/tutor), last_message_at

**chatMessages** (index by session_id)
- session_id, sender_id, sender_role, body, attachments?, created_at, read_by: string[]

**presence**
- user_id, display_name, role, scope (global | exam | chat), is_typing, last_seen

**leaderboardEntries** (index by quiz_code)
- quiz_code, exam_id, nickname, score, max_score, percentage, submitted_at

**jobs_meta** (optional)
- key, last_run_at, stats to guard cron execution

---

## 4) Auth Bridge

- Use Supabase JWT as the identity token for Convex client.
- Frontend: fetch session from Supabase; pass `getAuth` to Convex client.
- Server: in Convex `auth.config.ts`, verify Supabase JWT using project JWKS.

Frontend snippet (to add later in [frontend/src/main.tsx](frontend/src/main.tsx)):
```tsx
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { supabase } from './lib/supabase';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
  getAuth: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
});
```

Env vars to add: `VITE_CONVEX_URL`, `CONVEX_DEPLOY_KEY` (build), `CONVEX_SITE_URL` (server).

---

## 5) Feature Plans

### A) Live Proctoring (high priority)
- Hooks/UI: add `useConvexProctoring` hook and `ProctorDashboard` for tutors.
- Heartbeat: ExamView posts heartbeat every 10s with question index, answered count, last activity, network stats.
- Violations: log to Convex immediately (also keep local array). Tutor dashboard shows stream + counts.
- Offline tolerance: on heartbeat failure, flag disconnected; auto-recover on next success.
- Auto-expire: cron cleans sessions stale >2m unless status=submitted.

Client touchpoints:
- [frontend/src/pages/ExamView.tsx](frontend/src/pages/ExamView.tsx): send heartbeat + violations; on submit, mark session submitted.
- New [frontend/src/components/ProctorDashboard.tsx](frontend/src/components/ProctorDashboard.tsx): subscribe to `getExamSessions(exam_id)`.

Convex API:
- mutations: `startSession`, `heartbeat`, `logViolation`, `endSession`
- queries: `getExamSessions`, `getSession(exam_id, student_id)`

### B) Real-time Chat (high priority)
- Goal: replace Supabase Realtime wiring with simpler Convex reactive queries.
- Sessions: support + exam-specific sessions unified in `chatSessions`.
- Messages: optimistic send; use `useQuery` for stream; maintain read receipts via `read_by` array.
- Presence/typing: stored in `presence`, scoped per session.
- Migration path: feature flag to pick backend (Supabase vs Convex) per route/tenant.

Client touchpoints:
- Replace `RealtimeChatService` usage with `useConvexChat(sessionId)`.
- Update [frontend/src/components/ChatWidget.tsx](frontend/src/components/ChatWidget.tsx) and [frontend/src/components/support/AgentChatInterface.tsx](frontend/src/components/support/AgentChatInterface.tsx).

Convex API:
- mutations: `startChat`, `assignAgent`, `sendMessage`, `markRead`, `setTyping`
- queries: `listSessions(scope, user)`, `getMessages(session_id)`

### C) Presence & Typing (medium)
- Store presence rows per scope; expire if `last_seen` > 60s.
- `setTyping` mutation toggles typing flag for chat sessions.
- UI badges in chat headers; optional global presence chip in dashboard.

### D) Kids Live Leaderboard (medium)
- Grading source: [supabase/functions/grade-exam/index.ts](supabase/functions/grade-exam/index.ts) calls Convex HTTP action after grading to push score.
- View: Kids mode page subscribes to `getLeaderboard(quiz_code)` sorted by score desc, then by submitted_at asc.
- Anti-cheat: server-only writes via signing key from Edge Function; clients read-only.

### E) Scheduled Jobs (low)
- Cron: cleanup stale proctoring sessions every 5 minutes; expire presence every 1 minute.
- Cron: optional reminders (upcoming exams) if we push notifications via existing FCM edge function.

---

## 6) Rollout Plan (7 days)

- **Day 0 (prep)**: Add env vars; install Convex; scaffold `convex/` folder; add provider wrapper.
- **Day 1-2 (proctoring)**: Schema + mutations/queries; wire ExamView heartbeat + violation sends; build tutor dashboard; QA with 2 browsers.
- **Day 3-4 (chat)**: Implement chat sessions/messages/presence; wrap existing UI behind feature flag `VITE_USE_CONVEX_CHAT=true`.
- **Day 5 (leaderboard)**: Add action endpoint for Edge Function; build Kids leaderboard widget; backfill from sample submissions.
- **Day 6 (jobs + hardening)**: Add crons; rate-limit heartbeats; add retry/backoff in client hooks.
- **Day 7 (QA + toggle)**: Load test heartbeats/chat; toggle feature flag per environment; document runbooks.

---

## 7) Client Integration Checklist

- Add Convex provider in [frontend/src/main.tsx](frontend/src/main.tsx) wrapping `<App />`.
- Create hooks in `frontend/src/hooks/`:
  - `useConvexAuthBridge` (fetch Supabase JWT, cache, refresh)
  - `useConvexProctoring` (start, heartbeat, violations, end)
  - `useConvexChat` (session list, messages, send, read, typing)
  - `useConvexPresence` (set presence per scope)
- Components:
  - `ProctorDashboard` (live table/cards with filters, alerts)
  - `ExamChat` (exam room chat) and `SupportChat` (agent UI) refactored to Convex
  - `PresenceIndicator` (avatar dots + typing text)
  - `KidsLeaderboard` (sorted list, confetti on change)
- Feature flags: `VITE_USE_CONVEX_CHAT`, `VITE_USE_CONVEX_PROCTORING`, `VITE_USE_CONVEX_LEADERBOARD`.

---

## 8) Server/Convex Implementation

- `convex/schema.ts`: define tables above with indexes (`by_exam`, `by_session`, `by_quiz_code`).
- `convex/auth.config.ts`: validate Supabase JWT (issuer = your Supabase project URL); map claims to `identity` (user_id, role, email).
- `convex/mutations/`:
  - `sessions.ts`: `startSession`, `heartbeat`, `logViolation`, `endSession`
  - `chat.ts`: `startChat`, `assignAgent`, `sendMessage`, `markRead`, `setTyping`
  - `leaderboard.ts`: `pushScore` (action) secured by shared secret for Edge Function calls
  - `presence.ts`: `touchPresence`, `setScope`
- `convex/queries/`:
  - `sessions.ts`: `getExamSessions`, `getSession`
  - `chat.ts`: `listSessions`, `getMessages`
  - `presence.ts`: `listPresence`
  - `leaderboard.ts`: `getLeaderboard`
- `convex/crons.ts`: `cleanupSessions`, `expirePresence`, optional `sendReminders`.

Security/limits:
- Rate-limit heartbeat per user (e.g., reject if <5s since last).
- Validate exam ownership for tutor views (cross-check Supabase exam_id via signed payload from frontend or cached map fetched once).
- Encrypt sensitive message attachments at rest (optional, or keep in Supabase Storage with signed URLs stored in Convex rows).

---

## 9) Data Sync & Boundaries

- Source of truth: Supabase for exams, submissions, chat history archive, payments, profiles.
- Convex holds live operational state; optional archival back to Supabase:
  - Chat: on session end, push transcript to Supabase `chat_messages` for history (optional).
  - Proctoring: on session end, persist summary (violations count, duration) to Supabase `submissions` JSON column.
  - Leaderboard: scores originate from Supabase grading; Convex only displays live view.
- Edge integration: [supabase/functions/grade-exam/index.ts](supabase/functions/grade-exam/index.ts) posts to `convex/actions/pushScore` with signed secret.

---

## 10) Testing Plan

- Unit: Convex mutations/queries (validate auth, rate limits, schema).
- Component: ProctorDashboard with mocked Convex client; Chat components with fake streams.
- E2E (Cypress/Playwright):
  - Two-browser proctoring: student heartbeats and tutor view sync within <2s.
  - Chat send/read/typing across two users.
  - Leaderboard updates after grade-exam Edge Function runs.
- Load: simulate 100 concurrent students heartbeating every 10s → expect <5% error, latency <200ms.

---

## 11) Observability

- Add Convex analytics dashboard widgets: call counts for `heartbeat`, `sendMessage`.
- Client logging: log heartbeat failures with exponential backoff; surface toast only after N consecutive failures.
- Alerts: set thresholds on 5xx rate for `heartbeat` and `sendMessage`.

---

## 12) Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dual backends complexity | Clear boundary: Supabase = durable, Convex = live. Feature flags to roll back. |
| Auth drift (Supabase vs Convex) | Single JWT source (Supabase). Refresh before Convex calls. |
| Heartbeat cost at scale | 10–15s interval; rate-limit; batch fields; consider compressing payload. |
| Chat history persistence | Archive on session end to Supabase; keep Convex trimmed. |
| Offline clients | Retry with backoff; mark disconnected after 2 missed beats; reconcile on resume. |

---

## 13) Milestone Acceptance

- Proctoring: tutors see live grid; disconnects/violations appear within 2s; auto-expire sessions.
- Chat: messages deliver <150ms observed; typing and read receipts visible; fallback flag to Supabase works.
- Leaderboard: score appears within 3s of grading; ordering stable; resistant to duplicate posts.
- Presence: user chips update within 10s idle timeout.

---

## 14) Next Actions

1) Approve this plan and feature-flag names.
2) Add Convex env vars to frontend and CI/CD.
3) Scaffold `convex/` (schema, auth.config, crons) and provider wrapper.
4) Build proctoring flow first (ExamView + dashboard), then chat, then leaderboard.

*Updated: January 4, 2026*
