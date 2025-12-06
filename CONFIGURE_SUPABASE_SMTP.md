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

### Professional Password Reset Template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Durrah for Tutors</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
    }
    .email-wrapper {
      background-color: #f1f5f9;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .logo-container {
      margin-bottom: 20px;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }
    .logo img {
      max-width: 100%;
      height: auto;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
      color: #334155;
    }
    .security-notice {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .security-notice strong {
      color: #1e40af;
      display: block;
      margin-bottom: 8px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(120deg, #0f172a 0%, #1d4ed8 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
    }
    .alternative-link {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
      font-size: 14px;
      color: #64748b;
      word-break: break-all;
    }
    .warning-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #f8fafc;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-links {
      margin-top: 16px;
    }
    .footer-links a {
      color: #3b82f6;
      text-decoration: none;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo">
            <img src="https://durrah-clinic-managment.web.app/logo.jpeg" alt="Durrah for Tutors">
          </div>
        </div>
        <h1>Reset Your Password</h1>
      </div>
      
      <div class="content">
        <p><strong>Hello,</strong></p>
        
        <p>We received a request to reset the password for your <strong>Durrah for Tutors</strong> account associated with {{ .Email }}.</p>
        
        <div class="security-notice">
          <strong>🔒 Security Notice</strong>
          This is a secure password reset request. Click the button below to set a new password for your account.
        </div>
        
        <div class="button-container">
          <a href="{{ .ConfirmationURL }}" class="button">Reset My Password</a>
        </div>
        
        <p style="text-align: center; color: #64748b; font-size: 14px;">This link will expire in <strong>1 hour</strong></p>
        
        <div class="alternative-link">
          <strong style="color: #334155;">Link not working?</strong><br>
          Copy and paste this URL into your browser:<br>
          {{ .ConfirmationURL }}
        </div>
        
        <div class="warning-box">
          <strong style="color: #991b1b;">⚠️ Didn't request this?</strong><br>
          If you didn't request a password reset, please ignore this email or contact our support team if you're concerned about your account security.
        </div>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 32px;">
          <strong>Why am I receiving this?</strong><br>
          This email was sent because a password reset was requested for your account. If you didn't make this request, no action is needed.
        </p>
      </div>
      
      <div class="footer">
        <p><strong>Durrah for Tutors</strong></p>
        <p>Building better exam experiences for educators</p>
        <div class="footer-links">
          <a href="https://tutors.durrahsystem.tech">Visit Website</a> |
          <a href="https://tutors.durrahsystem.tech/support">Support</a>
        </div>
        <p style="margin-top: 16px;">© 2025 Durrah for Tutors. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

### Professional Email Verification Template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - Durrah for Tutors</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f1f5f9;
    }
    .email-wrapper {
      background-color: #f1f5f9;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(120deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .logo-container {
      margin-bottom: 20px;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
    }
    .logo img {
      max-width: 100%;
      height: auto;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 30px;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
      color: #334155;
    }
    .welcome-box {
      background: linear-gradient(120deg, #ecfdf5 0%, #d1fae5 100%);
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .welcome-box h3 {
      margin: 0 0 8px 0;
      color: #065f46;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(120deg, #10b981 0%, #059669 100%);
      color: white !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .alternative-link {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      margin: 24px 0;
      border-radius: 8px;
      font-size: 14px;
      color: #64748b;
      word-break: break-all;
    }
    .features {
      margin: 32px 0;
    }
    .feature-item {
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .feature-item:last-child {
      border-bottom: none;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background-color: #f8fafc;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-links {
      margin-top: 16px;
    }
    .footer-links a {
      color: #10b981;
      text-decoration: none;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <div class="logo">
            <img src="https://durrah-clinic-managment.web.app/logo.jpeg" alt="Durrah for Tutors">
          </div>
        </div>
        <h1>Welcome to Durrah for Tutors! 🎉</h1>
      </div>
      
      <div class="content">
        <p><strong>Hello,</strong></p>
        
        <p>Thanks for signing up! We're excited to have you join the <strong>Durrah for Tutors</strong> community.</p>
        
        <div class="welcome-box">
          <h3>✉️ One More Step...</h3>
          <p style="margin: 0;">Please verify your email address ({{ .Email }}) to activate your account and start creating amazing exams.</p>
        </div>
        
        <div class="button-container">
          <a href="{{ .ConfirmationURL }}" class="button">Verify My Email</a>
        </div>
        
        <div class="alternative-link">
          <strong style="color: #334155;">Button not working?</strong><br>
          Copy and paste this URL into your browser:<br>
          {{ .ConfirmationURL }}
        </div>
        
        <div class="features">
          <p><strong>Once verified, you'll be able to:</strong></p>
          <div class="feature-item">
            ✅ <strong>Create unlimited exams</strong> with AI-powered question extraction
          </div>
          <div class="feature-item">
            ✅ <strong>Track student performance</strong> with real-time analytics
          </div>
          <div class="feature-item">
            ✅ <strong>Generate QR codes</strong> for easy exam distribution
          </div>
          <div class="feature-item">
            ✅ <strong>Access priority support</strong> from our team
          </div>
        </div>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 32px;">
          <strong>Need help?</strong><br>
          If you have any questions or need assistance, our support team is here to help.
        </p>
      </div>
      
      <div class="footer">
        <p><strong>Durrah for Tutors</strong></p>
        <p>Building better exam experiences for educators</p>
        <div class="footer-links">
          <a href="https://tutors.durrahsystem.tech">Visit Website</a> |
          <a href="https://tutors.durrahsystem.tech/support">Support</a> |
          <a href="https://tutors.durrahsystem.tech/docs">Documentation</a>
        </div>
        <p style="margin-top: 16px;">© 2025 Durrah for Tutors. All rights reserved.</p>
      </div>
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
