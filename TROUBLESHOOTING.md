# Troubleshooting Submission Errors

## Issue: "Failed to submit exam"

If students are getting submission errors, follow these steps:

### Step 1: Check Browser Console
1. Open the exam as a student
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Try to submit the exam
5. Look for error messages in red

### Step 2: Common Issues & Solutions

#### Error: "new row violates row-level security policy"
**Cause**: RLS policies are blocking anonymous submissions

**Solution**: The `submissions` table needs to allow INSERT for anonymous users (students)

Run this in Supabase SQL Editor:
```sql
-- Allow anyone to insert submissions (students are not authenticated)
CREATE POLICY "Allow anonymous submissions" ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);
```

#### Error: "null value in column 'student_name' violates not-null constraint"
**Cause**: Database requires student_name but it's empty

**Solution**: Already fixed in the code - it now provides fallback values:
- If no name: uses student_id or "Anonymous"
- If no email: generates placeholder email

#### Error: "insert or update on table 'submissions' violates foreign key constraint"
**Cause**: The exam_id doesn't exist in the exams table

**Solution**: Make sure you're using a valid exam link

#### Error: "permission denied for table submissions"
**Cause**: Supabase RLS is blocking the insert

**Solution**: Check RLS policies on the `submissions` table:

```sql
-- View current policies
SELECT * FROM pg_policies WHERE tablename = 'submissions';

-- If no INSERT policy for anon exists, add it:
CREATE POLICY "Enable insert for anonymous users" ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);
```

### Step 3: Verify Database Schema

Make sure your `submissions` table has these columns:
- `id` (uuid, primary key)
- `exam_id` (uuid, foreign key to exams)
- `student_name` (text, not null)
- `student_email` (text, not null)
- `score` (integer)
- `max_score` (integer)
- `violations` (jsonb)
- `browser_info` (jsonb)
- `created_at` (timestamp)

### Step 4: Check RLS Policies

The `submissions` table needs these policies:

```sql
-- Allow anonymous users to insert submissions
CREATE POLICY "Allow anonymous submissions" ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow tutors to view their own exam submissions
CREATE POLICY "Tutors can view their exam submissions" ON public.submissions
FOR SELECT
TO authenticated
USING (
    exam_id IN (
        SELECT id FROM public.exams WHERE tutor_id = auth.uid()
    )
);
```

### Step 5: Test with Console Logging

If the error persists, the updated code now shows the actual error message in the toast notification. Check:

1. The toast message (top of screen)
2. Browser console (F12 → Console tab)
3. Network tab (F12 → Network) - look for failed requests to Supabase

### Quick Fix SQL Script

Run this in your Supabase SQL Editor to ensure proper permissions:

```sql
-- Enable RLS on submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.submissions;
DROP POLICY IF EXISTS "Tutors can view their exam submissions" ON public.submissions;

-- Create new policies
CREATE POLICY "Allow anonymous submissions" ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Tutors can view their exam submissions" ON public.submissions
FOR SELECT
TO authenticated
USING (
    exam_id IN (
        SELECT id FROM public.exams WHERE tutor_id = auth.uid()
    )
);
```

### Still Not Working?

Share the exact error message from:
1. The toast notification
2. Browser console (F12)
3. Supabase logs (Dashboard → Logs)

This will help identify the specific issue!
