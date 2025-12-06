# Configure Supabase SMTP with Resend

This guide will help you configure Supabase to use Resend for **all** authentication emails, including:
- Email verification
- Password reset emails
- Magic link emails

## Why Configure SMTP?

By default, Supabase uses their own email service which has limitations:
- ❌ Limited sending volume
- ❌ Generic "no-reply@mail.app.supabase.com" sender
- ❌ May go to spam
- ❌ Can't customize branding fully

With Resend SMTP:
- ✅ Unlimited sending (based on your plan)
- ✅ Custom branded sender "Durrah for Tutors <noreply@durrahsystem.tech>"
- ✅ Better deliverability
- ✅ Full control over email templates

## Step 1: Get Resend SMTP Credentials

1. Go to [Resend Dashboard](https://resend.com/overview)
2. Navigate to **Settings** → **SMTP**
3. You'll find your SMTP credentials:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL) or `587` (TLS)
   - **Username:** `resend`
   - **Password:** Your API Key (starts with `re_`)

## Step 2: Configure Supabase SMTP

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **khogxhpnuhhebkevaqlg**
3. Navigate to **Settings** → **Authentication**
4. Scroll down to **SMTP Settings**
5. Click **Enable Custom SMTP**

### Enter the following details:

```
Host: smtp.resend.com
Port: 465
Username: resend
Password: [Your Resend API Key - starts with re_]
Sender Email: noreply@durrahsystem.tech
Sender Name: Durrah for Tutors
```

6. Click **Save**
7. Test the configuration by clicking **Send Test Email**

## Step 3: Customize Email Templates

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. You can customize the following templates:
   - **Confirm signup** - Email verification
   - **Reset password** - Password reset
   - **Magic Link** - Passwordless login
   - **Change Email Address** - Email change confirmation

### Recommended Template Customization:

For each template, you can use these variables:
- `{{ .ConfirmationURL }}` - Verification/reset link
- `{{ .Token }}` - Verification token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email

### Example Password Reset Template:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 40px 20px; background: #f1f5f9; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; padding: 40px; text-align: center; }
    .content { padding: 40px; }
    .button { display: inline-block; padding: 14px 32px; background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { padding: 30px; background: #f8fafc; color: #64748b; font-size: 14px; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reset Your Password 🔑</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>We received a request to reset your password for your Durrah for Tutors account.</p>
      <p>Click the button below to create a new password:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      </p>
      <p style="font-size: 14px; color: #64748b;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2025 Durrah for Tutors. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

## Step 4: Verify Configuration

### Test Password Reset:
1. Go to your app: https://tutors.durrahsystem.tech/forgot-password
2. Enter your email
3. Check your inbox for the reset email
4. Verify it comes from "Durrah for Tutors <noreply@durrahsystem.tech>"

### Test Email Verification:
1. Register a new account
2. Check for the verification email
3. Click the verification link

## Troubleshooting

### Emails not sending:
- ✅ Check SMTP credentials are correct
- ✅ Verify Resend API key is valid
- ✅ Check Resend dashboard for delivery logs
- ✅ Ensure `noreply@durrahsystem.tech` is verified in Resend

### Emails going to spam:
- ✅ Add SPF, DKIM, and DMARC records to your domain
- ✅ In Resend dashboard, verify your domain
- ✅ Check [Resend Domain Setup](https://resend.com/docs/dashboard/domains/introduction)

### Wrong sender email:
- ✅ Make sure "Sender Email" in Supabase SMTP settings matches your verified domain
- ✅ Resend free tier only allows sending from verified domains

## Important Notes

1. **Domain Verification:** You must verify `durrahsystem.tech` in Resend to send from `noreply@durrahsystem.tech`

2. **Rate Limits:** 
   - Resend Free: 100 emails/day
   - Resend Pro: 50,000 emails/month
   - Adjust plan based on your needs

3. **Templates:** You can keep using Supabase's default templates or customize them with your branding

4. **Fallback:** If SMTP fails, Supabase will fall back to their default email service

## Next Steps

After configuring SMTP, your authentication flow will be:

1. **User registers** → Supabase sends verification email via Resend SMTP
2. **User forgets password** → Supabase sends reset email via Resend SMTP  
3. **Welcome email** → Your Edge Function sends via Resend API (already configured ✅)
4. **Subscription reminders** → Your Edge Function sends via Resend API (already configured ✅)

This gives you:
- ✅ Consistent branding across all emails
- ✅ Better deliverability
- ✅ Professional sender address
- ✅ Full control over email content
