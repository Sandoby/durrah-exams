# Registration Flow Update

## Add Welcome Email to Signup Process

### Frontend Update

Find your registration/signup component and add the welcome email call after successful registration.

#### Example Update for React/TypeScript:

```typescript
// In your signup/register function, after creating the user account:

const handleSignup = async (email: string, password: string, fullName: string) => {
  try {
    // 1. Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) throw authError;

    // 2. Send welcome email
    if (authData.user) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            userId: authData.user.id,
            email: email,
            name: fullName,
            emailType: 'welcome',
          },
        });

        if (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't throw - we don't want signup to fail if email fails
        } else {
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue with signup even if email fails
      }
    }

    // 3. Redirect to dashboard or show success message
    toast.success('Account created successfully! Check your email for welcome message.');
    navigate('/dashboard');

  } catch (error) {
    console.error('Signup error:', error);
    toast.error('Failed to create account');
  }
};
```

### Optional: Add Email Preferences to Profile

Allow users to opt-out of notifications in your Settings page:

```typescript
// Settings.tsx or Profile.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const EmailSettings = () => {
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmailPreference();
  }, []);

  const loadEmailPreference = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications_enabled')
      .single();

    if (profile) {
      setEmailNotificationsEnabled(profile.email_notifications_enabled ?? true);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: enabled })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      setEmailNotificationsEnabled(enabled);
      toast.success(`Email notifications ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Email Notifications</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Subscription Reminders</p>
          <p className="text-sm text-gray-600">
            Receive emails about subscription expiration
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={emailNotificationsEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={loading}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
};

export default EmailSettings;
```

### Testing the Integration

1. **Test Signup Flow:**
   ```bash
   # Sign up a new user with your test email
   # Check email inbox for welcome message
   ```

2. **Test Email Function Manually:**
   ```bash
   # Using curl or Postman
   curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-welcome-email' \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "test-user-id",
       "email": "test@example.com",
       "name": "Test User",
       "emailType": "welcome"
     }'
   ```

3. **Check Email Logs:**
   ```sql
   -- In Supabase SQL Editor
   SELECT * FROM email_logs 
   WHERE email_type = 'welcome' 
   ORDER BY created_at DESC;
   ```

### Important Notes

- ✅ Welcome email is sent asynchronously - signup won't fail if email fails
- ✅ Email errors are logged but don't affect user registration
- ✅ Users can disable notifications in settings
- ✅ All emails are logged in `email_logs` table for auditing
- ✅ Email templates are responsive and mobile-friendly

### Error Handling

The implementation includes proper error handling:
- If email fails to send, registration still succeeds
- Errors are logged to console and database
- User experience is not affected by email service issues

### Customization

Want to customize the welcome email template? Edit the templates in:
`supabase/functions/send-welcome-email/index.ts`

Look for the `getEmailTemplate` function and update the HTML/CSS as needed.
