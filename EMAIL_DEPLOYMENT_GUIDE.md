# Email Notifications Deployment Guide

## ✅ Files Created
1. `email_notifications_migration.sql` - Database schema updates
2. `supabase/functions/send-welcome-email/index.ts` - Email sending function
3. `supabase/functions/check-expiring-subscriptions/index.ts` - Daily cron job

## 🚀 Deployment Steps

### Step 1: Run Database Migration
Go to your Supabase Dashboard → SQL Editor and run the contents of `email_notifications_migration.sql`

Or use Supabase CLI:
```bash
supabase db push
```

### Step 2: Set Resend API Key in Supabase
1. Go to Supabase Dashboard → Settings → Edge Functions → Secrets
2. Add new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (re_...)

### Step 3: Deploy Edge Functions

#### Using Supabase CLI:
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (you'll need your project reference ID)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy send-welcome-email function
supabase functions deploy send-welcome-email

# Deploy check-expiring-subscriptions function
supabase functions deploy check-expiring-subscriptions
```

### Step 4: Test Welcome Email
Test the welcome email function manually:
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-welcome-email' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "email": "your-test-email@example.com",
    "name": "Test User",
    "emailType": "welcome"
  }'
```

### Step 5: Setup Cron Job for Daily Checks
In Supabase Dashboard:
1. Go to Database → Extensions
2. Enable `pg_cron` extension if not already enabled
3. Go to SQL Editor and run:

```sql
-- Schedule daily subscription check at 9:00 AM UTC
SELECT cron.schedule(
  'check-expiring-subscriptions-daily',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-expiring-subscriptions',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key (from Settings → API)

### Step 6: Verify Domain in Resend
1. Go to Resend Dashboard → Domains
2. Add domain: `durrahsystem.tech`
3. Add DNS records to your domain provider:
   - Add the SPF, DKIM, and DMARC records provided by Resend
4. Wait for verification (usually takes a few minutes)

### Step 7: Update Registration Flow
See `REGISTRATION_UPDATE.md` for code to add to your signup process.

## 🧪 Testing Checklist

- [ ] Database migration completed successfully
- [ ] RESEND_API_KEY secret configured in Supabase
- [ ] Both Edge Functions deployed
- [ ] Domain verified in Resend
- [ ] Welcome email sent on test signup
- [ ] Manual test of subscription reminder emails
- [ ] Cron job scheduled and running
- [ ] Email logs appearing in database

## 📊 Email Types

1. **welcome** - Sent immediately on signup
2. **subscription_reminder_7d** - 7 days before expiry
3. **subscription_reminder_3d** - 3 days before expiry
4. **subscription_expired** - On expiry date
5. **subscription_expired_3d** - 3 days after expiry

## 🔍 Monitoring

Check email logs:
```sql
SELECT * FROM email_logs 
ORDER BY created_at DESC 
LIMIT 50;
```

Check upcoming expirations:
```sql
SELECT 
  email,
  subscription_expires_at,
  last_reminder_sent_at,
  subscription_expires_at - NOW() as days_until_expiry
FROM profiles
WHERE subscription_expires_at IS NOT NULL
  AND subscription_expires_at > NOW() - INTERVAL '3 days'
ORDER BY subscription_expires_at;
```

## 🚨 Troubleshooting

**Emails not sending?**
- Check RESEND_API_KEY is set correctly
- Verify domain in Resend dashboard
- Check email_logs table for error messages
- View Edge Function logs in Supabase Dashboard

**Cron job not running?**
- Verify pg_cron extension is enabled
- Check cron job exists: `SELECT * FROM cron.job;`
- View cron job logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`

**From address not working?**
- Change `from: 'Durrah Exams <noreply@durrahsystem.tech>'` to use verified domain
- Or use Resend's onboarding domain for testing: `from: 'onboarding@resend.dev'`

## 📝 Next Steps

Once deployed:
1. Test signup flow sends welcome email
2. Add email preferences toggle to Settings page
3. Set test subscription expiry dates to verify reminders
4. Monitor email delivery rates in Resend dashboard
