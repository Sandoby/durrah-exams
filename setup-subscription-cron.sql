-- =====================================================
-- AUTOMATED SUBSCRIPTION EXPIRY CRON JOB
-- Runs daily at 2 AM UTC to check and deactivate expired subscriptions
-- =====================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing subscription check jobs (to avoid duplicates)
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'check-expiring-subscriptions-daily';

-- Schedule the job to run daily at 2:00 AM UTC
SELECT cron.schedule(
    'check-expiring-subscriptions-daily',  -- Job name
    '0 2 * * *',                            -- Cron expression: Every day at 2:00 AM UTC
    $$
    SELECT
      net.http_post(
          url:='https://khogxhpnuhhebkevaqlg.supabase.co/functions/v1/check-expiring-subscriptions',
          headers:=jsonb_build_object(
              'Content-Type','application/json',
              'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
          ),
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Verify the cron job was created
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job 
WHERE jobname = 'check-expiring-subscriptions-daily';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. This job runs at 2 AM UTC every day
-- 2. To change the schedule, modify the cron expression:
--    '0 2 * * *'  = 2:00 AM daily
--    '0 */6 * * *' = Every 6 hours
--    '0 0 * * 0'  = Weekly on Sunday at midnight
-- 
-- 3. To manually unschedule:
--    SELECT cron.unschedule('check-expiring-subscriptions-daily');
--
-- 4. To view job execution history:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-expiring-subscriptions-daily')
--    ORDER BY start_time DESC LIMIT 10;
-- =====================================================
