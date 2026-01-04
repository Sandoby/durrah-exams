# Server-Side Exam Backup & Auto-Submit System

## Overview

This document describes the robust exam backup system implemented using Convex for real-time data persistence and server-side timing. The system ensures that:

1. **Student answers are saved in real-time** to Convex as they answer questions
2. **Server-side timer** prevents client-side manipulation
3. **Auto-submit when time expires** even if the student disconnects
4. **Session recovery** if a student refreshes or loses connection

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ExamView.tsx  │────▶│    Convex DB    │────▶│   Supabase DB   │
│   (Student UI)  │     │  (Real-time)    │     │   (Permanent)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ syncAnswers()         │ Auto-submit cron      │ Grade & Store
        │ (every 2s debounce)   │ (every 30s check)     │ Results
        ▼                       ▼                       ▼
   ┌─────────┐           ┌─────────────┐         ┌──────────┐
   │ Answers │           │ expired?    │         │ grade-   │
   │ saved   │           │ auto_submit │         │ exam     │
   │ locally │           │ mark status │         │ function │
   └─────────┘           └─────────────┘         └──────────┘
```

## Key Components Modified

### 1. Convex Schema (`frontend/convex/schema.ts`)

New fields added to `examSessions` table:

```typescript
// Student data for auto-submission
student_data: v.optional(v.any()),

// Server-side timer
time_limit_seconds: v.optional(v.number()),
server_started_at: v.optional(v.number()),

// Real-time answer backup
saved_answers: v.optional(v.any()), // { questionId: { answer: value } }
last_answer_sync: v.optional(v.number()),

// Auto-submit tracking
auto_submit_scheduled: v.optional(v.boolean()),
auto_submitted_at: v.optional(v.number()),
submission_result: v.optional(v.any()),

// New status option
status: v.union(
  v.literal("active"),
  v.literal("disconnected"),
  v.literal("submitted"),
  v.literal("auto_submitted"),  // NEW
  v.literal("expired")
)
```

### 2. Session Mutations (`frontend/convex/sessions.ts`)

New/updated mutations:

- **`startSession`**: Now accepts `time_limit_seconds` and `student_data`, sets `server_started_at` for authoritative timing, returns session recovery data if resuming
- **`syncAnswers`**: New mutation to save answers in real-time, calculates server-side time remaining
- **`getServerTime`**: New query to get authoritative server time for timer sync
- **`endSession`**: Updated to handle `auto_submitted` status
- **`markAutoSubmitted`**: New mutation called after auto-submission
- **`markSyncedToSupabase`**: Mark session as synced after grading

### 3. Cron Handlers (`frontend/convex/cronHandlers.ts`)

New cron handler:

```typescript
autoSubmitExpiredExams: internalMutation({
  // Runs every 30 seconds
  // Finds sessions where:
  //   - auto_submit_scheduled = true
  //   - status = active OR disconnected
  //   - server_started_at + time_limit_seconds + 5s grace < now
  // Marks them as auto_submitted with saved_answers
})
```

### 4. Crons (`frontend/convex/crons.ts`)

New cron job:

```typescript
crons.interval(
  "auto-submit expired exams",
  { seconds: 30 },
  internal.cronHandlers.autoSubmitExpiredExams
);
```

### 5. useConvexProctoring Hook (`frontend/src/hooks/useConvexProctoring.ts`)

Enhanced with:

- **`syncAnswers`**: Debounced function to sync answers to Convex (2s debounce)
- **`serverTimeRemaining`**: Reactive state synced from Convex server time
- **`savedAnswers`**: Current saved answers from Convex
- **`isResumedSession`**: Flag if session was recovered
- **`sessionStatus`**: Current session status
- **`onAutoSubmitted`**: Callback when server auto-submits
- **`onSessionRecovered`**: Callback when session is recovered with saved data

### 6. ExamView (`frontend/src/pages/ExamView.tsx`)

Updated to:

- Start proctoring session with `time_limit_seconds` and `student_data`
- Sync answers to Convex on every answer change
- Use server time for timer (tamper-proof)
- Handle session recovery on reconnect
- Handle auto-submitted notification from server

## Flow Diagrams

### Normal Exam Flow

```
1. Student enters info → clicks Start
2. startSession() called with time_limit_seconds
3. Server records server_started_at
4. Student answers questions
5. Each answer change triggers syncAnswers() (debounced 2s)
6. Timer shows server_time_remaining (synced)
7. Student clicks Submit
8. endSession('submitted') called
9. Answers sent to Supabase grade-exam function
10. Results stored
```

### Disconnection Recovery Flow

```
1. Student is taking exam
2. Network drops / device dies / browser crashes
3. Heartbeat stops → session marked 'disconnected' (after 2 min)
4. Timer continues on server
5. Student returns / reconnects
6. startSession() finds existing session
7. Returns is_resume: true with saved_answers
8. ExamView restores answers and server time
9. Student continues exam
```

### Auto-Submit Flow (Time Expires)

```
1. Student is taking exam (or disconnected)
2. Cron runs every 30 seconds
3. Checks: server_started_at + time_limit_seconds < now
4. Session found with expired timer
5. Marks status = 'auto_submitted'
6. Stores saved_answers in submission_result
7. Flags pending_supabase_sync = true
8. [Future] Background job sends to Supabase for grading
```

## API Endpoints

### HTTP Routes (`frontend/convex/http.ts`)

- `GET /pendingAutoSubmits` - Get sessions pending Supabase sync
- `POST /markSynced` - Mark session as synced after grading

## Testing the System

### Test 1: Answer Persistence
1. Start an exam
2. Answer a few questions
3. Refresh the page
4. Verify answers are restored

### Test 2: Timer Accuracy
1. Start a timed exam
2. Open browser dev tools → Network → Throttle to Slow 3G
3. Verify timer doesn't drift significantly from server time

### Test 3: Auto-Submit
1. Start a 1-minute exam
2. Answer some questions
3. Close browser
4. Wait 90 seconds
5. Check Convex dashboard - session should be 'auto_submitted'

### Test 4: Session Recovery
1. Start an exam
2. Answer questions
3. Close browser tab (don't submit)
4. Reopen same exam URL
5. Should see "Session recovered" toast
6. Answers should be restored

## Environment Variables

No new environment variables required. Uses existing:

- `VITE_CONVEX_URL` - Convex deployment URL
- `VITE_USE_CONVEX_PROCTORING=true` - Enable proctoring

## Deployment

The changes were deployed to Convex production:
```
https://usable-shepherd-176.convex.cloud
```

## Future Enhancements

1. **Automatic Supabase Grading**: Add a scheduled function that:
   - Queries pending auto-submitted sessions
   - Calls Supabase grade-exam edge function
   - Updates Convex with results

2. **Offline Support**: Add service worker to:
   - Queue answer syncs when offline
   - Flush when back online

3. **Admin Dashboard**: Add view for:
   - Sessions pending grading
   - Auto-submit history
   - Timer drift analytics
