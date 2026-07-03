-- ============================================================================
-- Migration: Normalize notifications schema alignment
-- Description: Ensure notifications tables include the columns currently used
--              by the app and notification services.
-- ============================================================================

ALTER TABLE IF EXISTS public.notifications
ADD COLUMN IF NOT EXISTS related_id UUID;

CREATE INDEX IF NOT EXISTS idx_notifications_related_id
  ON public.notifications(related_id);
