import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Schema for Durrah Exams
 * 
 * This schema defines ephemeral/real-time tables that complement the
 * Supabase database (source of truth for exams, submissions, profiles).
 * 
 * Tables:
 * - examSessions: Live proctoring state per student
 * - chatSessions: Support and exam chat rooms
 * - chatMessages: Real-time messages
 * - presence: Online/typing status
 * - leaderboardEntries: Kids mode live scores
 */

export default defineSchema({
  // ============================================
  // LIVE PROCTORING
  // ============================================
  examSessions: defineTable({
    // Links to Supabase
    exam_id: v.string(),
    student_id: v.string(),
    student_name: v.string(),
    student_email: v.optional(v.string()),
    
    // Full student data for auto-submission
    student_data: v.optional(v.any()), // Full student form data
    
    // Session state
    status: v.union(
      v.literal("active"),
      v.literal("submitted"),
      v.literal("disconnected"),
      v.literal("expired"),
      v.literal("auto_submitted") // New status for server-side auto-submit
    ),
    
    // Progress tracking
    current_question: v.number(),
    answered_count: v.number(),
    total_questions: v.number(),
    
    // Server-side timer (authoritative)
    time_limit_seconds: v.optional(v.number()),     // Total exam duration
    server_started_at: v.optional(v.number()),      // Server timestamp when exam started
    time_remaining_seconds: v.optional(v.number()), // Calculated from server time
    
    // Saved answers (real-time backup)
    saved_answers: v.optional(v.any()), // { questionId: { answer: value } }
    last_answer_sync: v.optional(v.number()), // Last time answers were synced
    
    // Violations stream
    violations: v.array(v.object({
      type: v.string(),        // tab_switch, copy_attempt, fullscreen_exit, right_click, etc.
      timestamp: v.number(),   // Unix ms
      detail: v.optional(v.string()),
    })),
    violations_count: v.number(),
    
    // Heartbeat tracking
    last_heartbeat: v.number(),      // Unix ms
    heartbeat_count: v.number(),
    network_quality: v.optional(v.union(
      v.literal("good"),
      v.literal("fair"),
      v.literal("poor")
    )),
    
    // Timestamps
    started_at: v.number(),
    ended_at: v.optional(v.number()),
    
    // Auto-submission tracking
    auto_submit_scheduled: v.optional(v.boolean()),
    auto_submitted_at: v.optional(v.number()),
    submission_result: v.optional(v.any()), // Store submission result from edge function
    
    // Browser/device info (optional)
    user_agent: v.optional(v.string()),
    screen_resolution: v.optional(v.string()),
  })
    .index("by_exam", ["exam_id"])
    .index("by_exam_student", ["exam_id", "student_id"])
    .index("by_status", ["status"])
    .index("by_last_heartbeat", ["last_heartbeat"])
    .index("by_auto_submit", ["status", "auto_submit_scheduled"]),

  // ============================================
  // CHAT SESSIONS
  // ============================================
  chatSessions: defineTable({
    // Scope determines the chat type
    scope: v.union(
      v.literal("support"),     // General support chat
      v.literal("exam")         // Exam-specific chat room
    ),
    
    // Context references (optional based on scope)
    exam_id: v.optional(v.string()),
    
    // Participants
    user_id: v.string(),           // Initiator (student/tutor)
    user_name: v.string(),
    user_email: v.optional(v.string()),
    user_role: v.union(v.literal("student"), v.literal("tutor")),
    
    // Assignment
    assigned_to: v.optional(v.string()),       // Agent/tutor ID
    assigned_name: v.optional(v.string()),
    
    // Status
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("ended")
    ),
    
    // Metadata
    subject: v.optional(v.string()),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    )),
    
    // Timestamps
    created_at: v.number(),
    last_message_at: v.optional(v.number()),
    ended_at: v.optional(v.number()),
    ended_by: v.optional(v.string()),    // ID of who ended the session
    
    // Rating (after session ends)
    rating: v.optional(v.number()),      // 1-5
    feedback: v.optional(v.string()),
  })
    .index("by_scope", ["scope"])
    .index("by_user", ["user_id"])
    .index("by_assigned", ["assigned_to"])
    .index("by_status", ["status"])
    .index("by_exam", ["exam_id"]),

  // ============================================
  // CHAT MESSAGES
  // ============================================
  chatMessages: defineTable({
    session_id: v.id("chatSessions"),
    
    // Sender info
    sender_id: v.string(),
    sender_name: v.string(),
    sender_role: v.union(
      v.literal("user"),
      v.literal("agent"),
      v.literal("tutor"),
      v.literal("system")
    ),
    
    // Content
    body: v.string(),
    attachments: v.optional(v.array(v.object({
      url: v.string(),
      name: v.string(),
      type: v.string(),      // image, file, etc.
      size: v.optional(v.number()),
    }))),
    
    // Read tracking
    read_by: v.array(v.string()),    // Array of user IDs who have read
    
    // Timestamps
    created_at: v.number(),
    edited_at: v.optional(v.number()),
    
    // Message type
    message_type: v.optional(v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("file"),
      v.literal("system")     // Join/leave notifications
    )),
  })
    .index("by_session", ["session_id"])
    .index("by_session_time", ["session_id", "created_at"]),

  // ============================================
  // PRESENCE / TYPING
  // ============================================
  presence: defineTable({
    user_id: v.string(),
    display_name: v.string(),
    role: v.union(
      v.literal("student"),
      v.literal("tutor"),
      v.literal("agent"),
      v.literal("admin")
    ),
    
    // Scope for presence
    scope: v.union(
      v.literal("global"),
      v.literal("exam"),
      v.literal("chat")
    ),
    scope_id: v.optional(v.string()),    // exam_id or session_id
    
    // Status
    status: v.union(
      v.literal("online"),
      v.literal("away"),
      v.literal("busy"),
      v.literal("offline")
    ),
    is_typing: v.boolean(),
    typing_in: v.optional(v.string()),   // session_id where typing
    
    // Timestamps
    last_seen: v.number(),
    connected_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_scope", ["scope", "scope_id"])
    .index("by_status", ["status"])
    .index("by_last_seen", ["last_seen"]),

  // ============================================
  // KIDS LEADERBOARD
  // ============================================
  leaderboardEntries: defineTable({
    // Quiz identifier
    quiz_code: v.string(),           // Short code for kids to join
    exam_id: v.string(),             // Links to Supabase exam
    
    // Participant
    nickname: v.string(),            // Display name (not real name for privacy)
    student_id: v.optional(v.string()),
    avatar: v.optional(v.string()),  // Emoji or avatar ID
    
    // Score
    score: v.number(),
    max_score: v.number(),
    percentage: v.number(),
    
    // Ranking
    rank: v.optional(v.number()),
    
    // Timing
    submitted_at: v.number(),
    time_taken_seconds: v.optional(v.number()),
    
    // Streak/bonus (gamification)
    streak_bonus: v.optional(v.number()),
    perfect_answers: v.optional(v.number()),
  })
    .index("by_quiz_code", ["quiz_code"])
    .index("by_exam", ["exam_id"])
    .index("by_score", ["quiz_code", "score"])
    .index("by_submitted", ["quiz_code", "submitted_at"]),

  // ============================================
  // JOBS METADATA (for cron state)
  // ============================================
  jobsMeta: defineTable({
    job_key: v.string(),             // Unique job identifier
    last_run_at: v.number(),
    next_run_at: v.optional(v.number()),
    run_count: v.number(),
    last_result: v.optional(v.string()),
    stats: v.optional(v.object({
      processed: v.number(),
      errors: v.number(),
    })),
  })
    .index("by_key", ["job_key"]),

  // ============================================
  // WEBHOOK DEDUPLICATION (Dodo Payments)
  // ============================================
  webhookEvents: defineTable({
    webhook_id: v.string(),          // From webhook-id header
    event_type: v.string(),          // subscription.active, etc.
    provider: v.string(),            // dodo, kashier, paysky
    processed_at: v.number(),        // Unix timestamp
    user_id: v.optional(v.string()), // Resolved user
    subscription_id: v.optional(v.string()),
    payload_hash: v.optional(v.string()), // SHA-256 of payload for extra safety
  })
    .index("by_webhook_id", ["webhook_id"])
    .index("by_processed_at", ["processed_at"])
    .index("by_provider", ["provider", "processed_at"]),

  // ============================================
  // SUBSCRIPTION SYNC STATE
  // ============================================
  subscriptionSync: defineTable({
    user_id: v.string(),             // Supabase user ID
    last_synced_at: v.number(),      // Last successful sync
    last_status: v.string(),         // active, cancelled, expired, payment_failed
    last_end_date: v.optional(v.number()), // subscription_end_date
    dodo_customer_id: v.optional(v.string()),
    sync_source: v.string(),         // webhook, cron, manual, direct_verify
    error_count: v.number(),         // Failed sync attempts
    last_error: v.optional(v.string()),
  })
    .index("by_user", ["user_id"])
    .index("by_last_synced", ["last_synced_at"])
    .index("by_status", ["last_status"]),
});
