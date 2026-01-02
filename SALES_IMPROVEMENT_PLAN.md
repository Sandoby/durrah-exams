# Sales Page & Sales Ops Upgrade Plan

## Objectives
- Equip sales page with high-converting assets, referral/partner flows, and fast outreach tools.
- Enable admin to create/activate/deactivate sales agents, issue access codes, and monitor performance.
- Add analytics and accountability (leaderboards, attribution, conversion funnels, coupon efficacy).
- Keep everything aligned with existing Supabase + React stack.

## Scope (Phases)
1) Foundations (Access, Data, Tracking)
2) Conversion Toolkit (Page UX & Offers)
3) Outreach & Automation (Sequences, links, assets)
4) Analytics & Monitoring (Admin oversight)
5) QA, Security, and Docs

## Phase 1: Foundations
- Data model
  - `sales_agents` (already created): id, name, email, access_code, is_active, created_at, updated_at.
  - `sales_events` (new): id, agent_id (fk), type ("page_view" | "cta_click" | "coupon_used" | "signup" | "upgrade"), metadata jsonb, created_at. Index on agent_id, created_at.
  - `sales_leads` (new): id, agent_id (fk), email, name, status ("new" | "contacted" | "won" | "lost"), notes, created_at, updated_at.
  - `sales_coupons` (optional link to existing coupons): coupon_id (fk to coupons), agent_id (fk), campaign_name, created_at.
- Auth/access
  - Sales login via access_code (already). Add optional PIN/2FA later.
  - Admin can create/deactivate sales agents from AdminPanel (already). Add reset access code flow.
- Routing
  - Sales page at `/sales` (already). Keep offline/low-bandwidth friendly.

## Phase 2: Conversion Toolkit (Sales Page UX)
- Hero & value props: bold CTA, risk-reversal (refund/guarantee), social proof strip.
- Dynamic assets
  - Quick demo carousel (screenshots already; add short animated GIF/WebM optional).
  - Offer cards: time-limited coupon, referral reward, onboarding call slot.
- CTAs
  - Primary: "Create coupon for this lead" (opens coupon modal if allowed for sales; or requests admin to issue).
  - Secondary: "Share referral link" (copy link with `?ref=` + access_code).
- Playbook widgets
  - Objection handling library with copy-to-clipboard.
  - Outreach scripts that auto-insert referral link and coupon code.
  - Email/snippet generator: choose persona + objection → generates snippet.
- Lead capture
  - Inline lead form (name, email, notes) logged to `sales_leads` with agent_id.
  - Fast tags: hot, warm, cold.

## Phase 3: Outreach & Automation
- Link builder
  - Generate share links with UTM/ref params: `?ref=CODE&utm=campaign&utm_medium=whatsapp`.
  - One-click copy for WhatsApp/Email/SMS templates.
- Sequences (lightweight)
  - Prebuilt 3-step follow-up cadence text blocks; track which step sent per lead (store in `sales_leads` metadata or `sales_events`).
- Assets bucket
  - Centralized mockups/screenshots; expose curated URLs with short descriptions for sales.
- Coupon collaboration
  - Admin-facing toggle to allow sales to request coupon; request stored as `sales_events` type "coupon_request" with payload.

## Phase 4: Analytics & Monitoring (Admin)
- Dashboards (AdminPanel → Sales tab)
  - Agent leaderboard: signups/upgrade events per agent (from `sales_events` joined to payments/subscriptions if available).
  - Funnel: views → clicks → signups → paid upgrades.
  - Coupon performance by agent (join coupons/redemptions if present).
  - Lead status summary: new/contacted/won/lost by agent.
- Session/activity feed
  - Recent `sales_events` with type, agent, timestamp, metadata (e.g., link shared, coupon requested).
- QA
  - Admin impersonation/read-only preview of Sales page for any agent to verify scripts/links.

## Phase 5: QA, Security, Docs
- RLS (if enabled): allow service role or admin RPCs; restrict agents to their own data in `sales_events` and `sales_leads`.
- Input validation and rate limiting for lead submission.
- Logging: errors to Sentry (if present) or console fallback.
- Docs: short README for sales workflow, how to get codes, and how attribution works.

## Backend Tasks (Supabase SQL)
- Create `sales_events` table:
  - Columns: id uuid PK default gen_random_uuid(), agent_id uuid references sales_agents(id) on delete cascade, type text, metadata jsonb, created_at timestamptz default now().
  - Indexes: agent_id, created_at.
- Create `sales_leads` table:
  - Columns: id uuid PK, agent_id uuid references sales_agents(id) on delete cascade, email text, name text, status text default 'new', notes text, meta jsonb, created_at timestamptz default now(), updated_at timestamptz default now().
  - Trigger to update updated_at on update.
- (Optional) `sales_coupons` link table: coupon_id uuid references coupons(id), agent_id uuid references sales_agents(id), campaign_name text, created_at timestamptz default now().
- Add RPCs if needed for filtered queries with RLS.

## Frontend Tasks
- Sales page (/sales)
  - Add lead capture form → POST to Supabase `sales_leads` (agent scoped).
  - Add outreach templates with dynamic insertion of ref link and coupon code.
  - Add link builder with UTM preset buttons and copy-to-clipboard.
  - Add activity logging: on share/copy/lead submit → insert into `sales_events`.
  - Add small funnel counters (uses aggregated `sales_events`).
- AdminPanel Sales tab
  - Show sales entry link (done), add leaderboard and recent activity table (queries `sales_events`).
  - Lead status table per agent (queries `sales_leads`).
  - Coupon performance widget (if coupon data accessible).
  - Access code reset/regenerate action; deactivate/activate already present.
- Components/UX
  - Toasts for copy/share; badges for active/inactive; empty states with guidance.

## Analytics & Attribution
- Standardize ref param: `?ref=<ACCESS_CODE>` and optional `utm_campaign`, `utm_medium`, `utm_source`.
- On public landing/student flows, capture ref/utm and write `sales_events` with agent_id if ref matches a sales agent.
- On signup/payment, store attributed agent_id (if ref matched) in user profile or payments table; emit `sales_events` type "signup" / "upgrade".

## Monitoring & Admin Controls
- Sales tab additions:
  - Leaderboard (top agents by signups/upgrade events in last 7/30 days).
  - Recent events feed with filters by agent and type.
  - Lead table with status controls and quick notes update.
  - Coupon requests queue (if implemented).
- Exports: CSV export for leads and events (admin only).

## Sequencing (Suggested Order)
1) Backend tables: `sales_events`, `sales_leads`, triggers, indexes.
2) Sales page: lead form + event logging + link builder + outreach/snippets.
3) AdminPanel: leaderboards, events feed, lead table, copy entry link (already), regenerate code.
4) Attribution in public flows: capture ref/utm and emit events.
5) QA + RLS + docs.

## Minimal Initial Deliverable
- Create `sales_events` and `sales_leads` tables.
- Sales page: lead form (create lead), copy referral link with UTM presets, log share/lead events.
- AdminPanel Sales tab: table of leads (status + notes), recent events feed, active/inactive badges, code copy, regenerate code.
- Basic leaderboard by events in last 30 days.

## Stretch Ideas
- In-app dialer/WhatsApp deeplink buttons per lead.
- Calendar booking links per agent (agent-configured), shown on Sales page.
- Nudge banner in LandingPage if ref is present (“You’re working with <Agent>”).
- Auto-sync leads to a Google Sheet via edge function (optional).

## Notes
- Keep ASCII-only comments and strings as requested.
- Use existing toast/notification patterns and Supabase client.
- Reuse existing mockups/screenshots assets for sales collateral.
