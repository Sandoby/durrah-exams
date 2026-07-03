# Supabase Auth + External Database Guide

## Short Answer

Yes. You can keep Supabase for authentication and move the database to another provider.

The safest setup is:

- Supabase = authentication only
- External database = all application data
- Your backend = the only layer allowed to talk to the database
- Frontend = signs in with Supabase, then calls your backend API for data

This is the best option if you suspect the current issue is database-related and want to reduce lock-in while keeping your existing login flow.

## Why This Works

Supabase Auth issues JWT-based sessions. After login, the client receives a session token with the user identity. That identity can be used independently of where the data lives.

In practice, this means:

- Users still sign in through Supabase
- The app still gets a stable `user.id`
- Your backend can verify the Supabase token
- Your backend can then query any database provider you choose

So authentication and persistence do not have to live in the same service.

## Important Constraint

This only works cleanly if you stop reading and writing application data directly from the browser with the Supabase client.

In this repo, the frontend currently uses Supabase directly in many places, including:

- `frontend/src/lib/supabase.ts`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/StudentPortal.tsx`
- `frontend/src/pages/support/SupportDashboard.tsx`
- `frontend/src/pages/support/AgentDashboard.tsx`
- `frontend/src/services/RealtimeChatService.ts`

That is fine for auth. It is not ideal for a separate external database unless you add a backend API layer or a compatibility layer.

## Recommended Architecture

### Option 1: Supabase Auth + Neon/Postgres + Backend API

This is the most natural replacement if your app already behaves like a relational app.

Use:

- Supabase Auth for sign-in, sign-up, social login, password reset
- Neon, AWS RDS, Railway Postgres, Cloud SQL, or another managed PostgreSQL provider for data
- FastAPI or Node API as the data layer

Best for:

- exams
- submissions
- classrooms
- tickets
- chat records
- subscriptions
- profiles

Why this is the best fit:

- Your current app already uses relational concepts and table-style queries
- PostgreSQL is the closest replacement for Supabase Postgres
- Migration is simpler than moving to a non-relational provider
- You can preserve most of your data model and SQL logic

### Option 2: Supabase Auth + MongoDB Atlas + Backend API

This also works, and your backend already has MongoDB code in `backend/server.py`.

Use this if:

- you want document storage
- you are already leaning into a Python/FastAPI backend
- you are okay rewriting table-style frontend calls into API calls

Tradeoff:

- more rewriting on the frontend
- more data-model changes
- harder to preserve existing Supabase-style queries and realtime behavior

### Option 3: Supabase Auth + Another DB + Direct Frontend Access

This is not recommended.

It usually leads to:

- exposed database credentials
- weak access control
- duplicated logic in the frontend
- harder debugging

If you want security and maintainability, use a backend API between the client and the database.

## What Needs To Change In This Repo

### Keep as-is

- Supabase Auth client in `frontend/src/lib/supabase.ts`
- `AuthContext` session handling
- OAuth sign-in flows
- password reset flows if you want Supabase to keep managing those

### Replace or refactor

Frontend code that currently does direct database access:

- `supabase.from(...).select(...)`
- `supabase.from(...).insert(...)`
- `supabase.from(...).update(...)`
- `supabase.from(...).delete(...)`
- `supabase.rpc(...)`
- `postgres_changes` realtime subscriptions

Those should move to one of these patterns:

- `fetch('/api/...')` to your backend
- backend service layer calling the external DB
- WebSocket or SSE for realtime updates

### Backend code to update

You will need backend endpoints for:

- auth-protected profile lookup
- exam creation and retrieval
- submission saving and grading
- support ticket reads and writes
- chat session and message storage
- subscription and payment records

The exact database provider only changes the storage implementation. The API contract can stay stable.

## Best Provider Choice By Goal

### Choose Neon / Postgres if:

- you want minimal code changes
- your app uses table-like data and joins
- you want the closest replacement for Supabase database behavior

### Choose MongoDB Atlas if:

- your backend is already Mongo-first
- you prefer documents over relational tables
- you are willing to rewrite more of the app data access layer

### Choose AWS RDS if:

- you want enterprise infrastructure
- you need more control over networking and backups
- you are comfortable operating PostgreSQL yourself or through AWS tooling

### Choose Railway / Render managed Postgres if:

- you want a fast setup
- you want simple deployment
- you do not need deep infra control

## Recommended Path For This Project

The lowest-risk path is:

1. Keep Supabase Auth.
2. Move the database to PostgreSQL on Neon or another managed Postgres provider.
3. Add a backend API that becomes the single source of truth for data access.
4. Replace direct Supabase table calls in the frontend with backend requests.
5. Recreate realtime only where you still need it, using WebSockets, SSE, or a managed realtime layer.

This keeps the auth UX familiar while removing the database dependency from Supabase.

## Migration Plan

### Phase 1: Freeze the current data model

- List every Supabase table used by the app
- Identify every RPC function
- Identify every realtime subscription
- Identify every password reset, login, and session dependency

For this repo, the obvious data surfaces include support chat, profiles, tickets, sessions, submissions, exam data, subscriptions, and notes.

### Phase 2: Create the new database schema

Create equivalent tables in the new provider.

Typical tables you will need:

- `users` or `profiles`
- `roles`
- `exams`
- `questions`
- `submissions`
- `submission_answers`
- `support_agents`
- `support_tickets`
- `live_chat_sessions`
- `chat_messages`
- `payments`
- `agent_user_notes`
- `canned_responses`

Keep `supabase_user_id` or `auth_user_id` as a foreign key field so each record stays linked to the Supabase user identity.

### Phase 3: Add auth verification in the backend

The backend should verify Supabase tokens before reading or writing user data.

Typical flow:

1. Frontend gets a Supabase session token.
2. Frontend sends the token in `Authorization: Bearer ...` headers.
3. Backend verifies the token with Supabase JWT validation or the Supabase Auth user endpoint.
4. Backend resolves the current user and role.
5. Backend queries the external database.

### Phase 4: Replace frontend direct queries

Convert each direct Supabase call into an API call.

Example mapping:

- `supabase.from('profiles').select(...)` -> `GET /api/me/profile`
- `supabase.from('support_tickets').select(...)` -> `GET /api/support/tickets`
- `supabase.from('chat_messages').insert(...)` -> `POST /api/chat/messages`
- `supabase.rpc('log_agent_activity', ...)` -> `POST /api/support/agent-activity`

### Phase 5: Rebuild realtime behavior

Supabase realtime is one of the hardest features to move.

If you keep auth only, realtime options become:

- WebSockets from your backend
- Server-Sent Events for simpler read-only streams
- Polling for low-frequency screens
- a separate realtime service if needed

For chat and support dashboards, WebSockets are usually the best fit.

### Phase 6: Data migration

Export data from Supabase and import it into the new database.

Recommended order:

1. reference tables first
2. users and profiles second
3. transactional data third
4. chat and logs last

Always validate row counts and sample records after import.

### Phase 7: Cutover

When the new backend is stable:

- switch frontend data calls to the new API
- keep Supabase Auth live
- monitor login success and session refresh
- watch for any remaining direct Supabase table access

## Environment Variables

### Keep for Supabase Auth

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend, if you need auth verification or user lookup:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE` only if the backend still needs privileged Supabase access

### Add for external database

For PostgreSQL:

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

For MongoDB:

- `MONGO_URL`
- `DB_NAME`

## Security Rules

Follow these rules if you split auth and storage:

- Never expose the external database admin credentials to the frontend
- Do not let the browser talk to the new database directly unless the provider is designed for safe client access
- Use Supabase only for identity and session state
- Use backend authorization checks for every data endpoint
- Treat `user.id` from Supabase as the stable application identity key

## Pros And Cons

### Benefits

- less vendor lock-in
- easier to change the database later
- clearer separation between auth and data
- better control over scaling and backups

### Costs

- more backend work
- more code to maintain
- realtime needs a replacement
- frontend direct queries must be rewritten

## What I Would Do Here

For this repo, I would choose:

- Supabase Auth stays in place
- Neon Postgres or another managed Postgres provider for application data
- backend API becomes the only place that reads and writes database records

That gives you the smallest rewrite with the least disruption to login, roles, and user identity.

## Suggested Implementation Order

1. Add backend auth verification for Supabase sessions.
2. Add one API endpoint for a single high-value screen, such as profile or support tickets.
3. Move the frontend screen from direct Supabase reads to the API.
4. Migrate chat and exam submissions next.
5. Recreate realtime last.
6. Remove unused Supabase table permissions once the migration is complete.

## Bottom Line

Yes, the architecture is valid.

If your main goal is to keep authentication and replace the database, the cleanest design is:

Supabase Auth + external Postgres + backend API.

That preserves sign-in while giving you full control over the data layer.