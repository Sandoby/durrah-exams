# Deploy Edge Function for Exam Grading

## Problem Fixed
The analytics page was showing 0% scores and no question performance data because:
1. ExamView was calling the wrong endpoint (`/functions/v1/dynamic-worker` instead of `/functions/v1/grade-exam`)
2. The Edge Function `grade-exam` exists but wasn't deployed to Supabase

## Deploy the Edge Function

### Step 1: Install Supabase CLI
```powershell
# Install via npm (if not already installed)
npm install -g supabase

# Or via scoop (Windows package manager)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 2: Login to Supabase
```powershell
supabase login
```
This will open your browser for authentication.

### Step 3: Link Your Project
```powershell
cd "C:\Users\Elsaid Ahmed\Desktop\durrah exams new"

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

To find your project ref:
- Go to https://supabase.com/dashboard
- Click on your project
- Go to Settings > General
- Copy the "Reference ID"

### Step 4: Deploy the Edge Function
```powershell
# Deploy the grade-exam function
supabase functions deploy grade-exam

# Verify deployment
supabase functions list
```

### Step 5: Set Environment Variables (if needed)
The function uses:
- `SUPABASE_URL` - automatically provided
- `SUPABASE_SERVICE_ROLE_KEY` - automatically provided

These are injected by Supabase automatically when deployed.

## Test the Edge Function

### Manual Test via curl:
```powershell
# Replace YOUR_PROJECT_URL and YOUR_ANON_KEY
curl -X POST "https://YOUR_PROJECT_URL.supabase.co/functions/v1/grade-exam" `
  -H "Authorization: Bearer YOUR_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "exam_id": "test-exam-id",
    "student_data": {"name": "Test Student", "email": "test@example.com"},
    "answers": [],
    "violations": [],
    "browser_info": {}
  }'
```

### Test via your app:
1. Open your deployed app
2. Take any exam
3. Submit answers
4. Check the analytics page - you should now see:
   - Correct score percentages
   - Question performance data (correct/incorrect counts)
   - Success rates for each question

## Expected Results After Deployment

✅ **Submissions table**: Should have correct `score`, `max_score`, and `percentage` values
✅ **Submission_answers table**: Should have entries with `question_id`, `answer`, and `is_correct` flag
✅ **Analytics page**: Should show accurate question performance and student scores

## Troubleshooting

### Function not found (404):
- Verify function is deployed: `supabase functions list`
- Check function name matches: `grade-exam` (not `dynamic-worker`)

### Permission errors (403):
- Run the SQL from `fix_analytics_permissions.sql` in Supabase SQL Editor
- Ensure RLS policies allow tutors to view their exam submissions

### Grading errors (500):
- Check Edge Function logs in Supabase Dashboard > Edge Functions > grade-exam > Logs
- Verify questions table has correct `correct_answer` data

## Alternative: Quick Deploy via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "Edge Functions"
4. Click "Deploy a new function"
5. Name it: `grade-exam`
6. Copy the code from `supabase/functions/grade-exam/index.ts`
7. Click "Deploy function"

Done! Your analytics should now work perfectly.
