# Quick Email Setup Script

## Step-by-Step Commands

### 1. Run Database Migration
Copy and paste this entire SQL file into Supabase Dashboard → SQL Editor:

File: `email_notifications_migration.sql`

### 2. Configure Resend API Key

```bash
# Get your Resend API key from: https://resend.com/api-keys
# Then go to Supabase Dashboard → Settings → Edge Functions → Secrets
# Add secret: RESEND_API_KEY = re_your_key_here
```

### 3. Install Supabase CLI (if not installed)

```powershell
npm install -g supabase
```

### 4. Login and Link Project

```powershell
# Login to Supabase
supabase login

# Link your project (get project ref from Supabase Dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF
```

### 5. Deploy Edge Functions

```powershell
# Deploy send-welcome-email function
supabase functions deploy send-welcome-email

# Deploy check-expiring-subscriptions function
supabase functions deploy check-expiring-subscriptions
```

### 6. Setup Cron Job

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily subscription check at 9:00 AM UTC
SELECT cron.schedule(
  'check-expiring-subscriptions-daily',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expiring-subscriptions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);

-- Verify cron job was created
SELECT * FROM cron.job;
```

Replace:
- `YOUR_PROJECT_REF` - Get from Supabase Dashboard URL
- `YOUR_SERVICE_ROLE_KEY` - Get from Settings → API → service_role key

### 7. Verify Domain in Resend

1. Go to https://resend.com/domains
2. Add domain: `durrahsystem.tech`
3. Add provided DNS records to your domain
4. Wait for verification (5-10 minutes)

**For Testing:** Use `onboarding@resend.dev` as the from address until domain is verified.

### 8. Test Welcome Email

```powershell
# Test with curl (replace YOUR_PROJECT_REF and YOUR_ANON_KEY)
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-welcome-email" `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{\"userId\":\"test-user-id\",\"email\":\"your-test-email@example.com\",\"name\":\"Test User\",\"emailType\":\"welcome\"}'
```

Or simply register a new user in your app!

### 9. Verify Email Was Sent

Check database:
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 10;
```

Check Resend Dashboard:
https://resend.com/emails

### 10. Test Subscription Reminder (Optional)

```sql
-- Set a test expiry date for your user (7 days from now)
UPDATE profiles 
SET subscription_expires_at = NOW() + INTERVAL '7 days'
WHERE email = 'your-email@example.com';

-- Manually trigger the cron job
SELECT
  net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expiring-subscriptions',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;

-- Check if email was sent
SELECT * FROM email_logs WHERE email_type LIKE 'subscription_%' ORDER BY created_at DESC;
```

## Troubleshooting

**Functions not deploying?**
```powershell
# Check if you're linked to the right project
supabase projects list

# Try relinking
supabase link --project-ref YOUR_PROJECT_REF
```

**Emails not sending?**
- Check RESEND_API_KEY is set in Supabase secrets
- Verify domain or use onboarding@resend.dev for testing
- Check function logs in Supabase Dashboard
- Check email_logs table for errors

**Cron job not running?**
```sql
-- Check if pg_cron is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron job status
SELECT * FROM cron.job_run_details ORDER BY start_time DESC;
```

## Quick Reference

**Email Types:**
- `welcome` - New user signup
- `subscription_reminder_7d` - 7 days before expiry
- `subscription_reminder_3d` - 3 days before expiry  
- `subscription_expired` - On expiry date
- `subscription_expired_3d` - 3 days after expiry

**Key URLs:**
- Resend Dashboard: https://resend.com
- Supabase Dashboard: https://supabase.com/dashboard
- Functions: https://YOUR_PROJECT_REF.supabase.co/functions/v1/

## Done! 🎉

Once setup is complete:
- ✅ New users receive welcome emails automatically
- ✅ Subscription reminders sent daily at 9:00 AM UTC
- ✅ All emails logged in database
- ✅ Users can disable notifications in settings

For detailed docs, see `EMAIL_DEPLOYMENT_GUIDE.md`
