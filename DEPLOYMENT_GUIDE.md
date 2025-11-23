# 🚀 Deployment & Security Improvements Guide

## Overview
This guide covers the security improvements and deployment steps for the Durrah Exams platform.

---

## ✅ Improvements Implemented

### 1. **Fixed ExamView.tsx Scoring Bug** ✅
**Issue**: The `calculateScore` function had an empty else block, causing all non-multiple-select questions to not be scored.

**Fix**: Added proper comparison logic for:
- Multiple choice questions
- True/False questions  
- Numeric questions
- Dropdown questions

**Location**: `frontend/src/pages/ExamView.tsx` (lines 404-429)

---

### 2. **Server-Side Grading** ✅
**Security Issue**: Client-side grading exposes correct answers to students via network inspection.

**Solutions Provided**:

#### Option A: Supabase Edge Function (Recommended)
**File**: `supabase/functions/grade-exam/index.ts`

**Features**:
- ✅ Correct answers never sent to client
- ✅ Time-based validation
- ✅ Secure grading for all question types
- ✅ Automatic answer storage

**Deployment**:
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy grade-exam

# Set environment variables
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Update Frontend** to use the Edge Function:
```typescript
// In ExamView.tsx handleSubmit function, replace Supabase direct insert with:
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/grade-exam`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      exam_id: id,
      student_data: studentData,
      answers: Object.entries(answers).map(([question_id, answer]) => ({
        question_id,
        answer
      })),
      violations,
      browser_info: browserInfo
    })
  }
);

const result = await response.json();
if (result.success) {
  setScore({
    score: result.score,
    max_score: result.max_score,
    percentage: result.percentage
  });
  setSubmitted(true);
}
```

#### Option B: Enhanced FastAPI Backend
**File**: `backend/server_enhanced.py`

**Features**:
- ✅ Server-side grading
- ✅ Time validation
- ✅ Better error handling
- ✅ Health check endpoint
- ✅ Comprehensive logging

**Deployment**:
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your credentials

# Run the server
python server_enhanced.py

# Or with uvicorn
uvicorn server_enhanced:app --host 0.0.0.0 --port 8000 --reload
```

---

### 3. **Database Schema Updates**

Update your Supabase database to support server-side grading:

```sql
-- Add percentage column if not exists
ALTER TABLE submissions 
ADD COLUMN IF NOT EXISTS percentage NUMERIC;

-- Update RLS policies to allow Edge Function access
-- The Edge Function uses the service role, so it bypasses RLS
-- But we should ensure anonymous users can still submit

-- Verify anonymous submission policy
SELECT * FROM pg_policies WHERE tablename = 'submissions';

-- If needed, recreate the policy
DROP POLICY IF EXISTS "Allow anonymous submissions" ON public.submissions;

CREATE POLICY "Allow anonymous submissions" ON public.submissions
FOR INSERT
TO anon
WITH CHECK (true);

-- Ensure submission_answers allows inserts
DROP POLICY IF EXISTS "Allow anonymous answers" ON public.submission_answers;

CREATE POLICY "Allow anonymous answers" ON public.submission_answers
FOR INSERT
TO anon
WITH CHECK (true);
```

---

### 4. **Security Best Practices**

#### A. Remove Correct Answers from Public Exam Endpoint

Update the RLS policy to hide correct answers:

```sql
-- Create a view that excludes correct answers for students
CREATE OR REPLACE VIEW public.public_questions AS
SELECT 
  id,
  exam_id,
  type,
  question_text,
  options,
  points,
  randomize_options,
  created_at
FROM public.questions;

-- Grant access to anonymous users
GRANT SELECT ON public.public_questions TO anon;
```

Then update frontend to fetch from this view instead:
```typescript
// In ExamView.tsx fetchExam function
const { data: qData } = await supabase
  .from('public_questions')  // Changed from 'questions'
  .select('*')
  .eq('exam_id', id);
```

#### B. Environment Variables Security

**Never commit these to Git**:
```env
# .env.local (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# .env (backend)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key
JWT_SECRET=your-strong-random-secret
MONGO_URL=mongodb://...
```

Add to `.gitignore`:
```
.env
.env.local
.env.production
*.env
```

#### C. Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// Install rate-limit middleware
npm install express-rate-limit

// In backend
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@api_router.post("/exams/{exam_id}/submit")
@limiter.limit("5/minute")  # Max 5 submissions per minute per IP
async def submit_exam(request: Request, exam_id: str, submission: ExamSubmission):
    # ... existing code
```

---

## 📦 Deployment Options

### Option 1: Vercel (Frontend) + Supabase (Backend)

**Frontend Deployment**:
```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

**Backend**: Use Supabase Edge Functions (no separate backend needed)

### Option 2: Full Stack Deployment

**Frontend**: Vercel/Netlify
**Backend**: Railway/Render/Heroku
**Database**: Supabase

**Railway Deployment** (Backend):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set environment variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_ROLE=...
```

---

## 🧪 Testing the Improvements

### Test Server-Side Grading

1. **Create a test exam** with various question types
2. **Take the exam** as a student
3. **Open browser DevTools** → Network tab
4. **Submit the exam**
5. **Verify**: 
   - ✅ Correct answers are NOT visible in the request
   - ✅ Score is calculated server-side
   - ✅ Response contains only the final score

### Test Time Validation

1. **Create an exam** with start/end times
2. **Try to access before start time** → Should show error
3. **Try to submit after end time** → Should show error
4. **Access during valid window** → Should work

### Test Question Scoring

Create an exam with:
- Multiple choice (single answer)
- True/False
- Numeric
- Multiple select (multiple answers)
- Short answer (manual grading)

Submit with correct and incorrect answers, verify scoring is accurate.

---

## 📊 Monitoring & Logging

### Supabase Logs

View Edge Function logs:
```bash
supabase functions logs grade-exam
```

Or in Supabase Dashboard:
1. Go to **Edge Functions**
2. Click on **grade-exam**
3. View **Logs** tab

### Backend Logs

The enhanced backend includes comprehensive logging:
```python
logger.info("Submission received")
logger.warning("Invalid time format")
logger.error("Supabase submission failed")
logger.exception("Unhandled exception")
```

View logs:
```bash
# If using Railway
railway logs

# If running locally
python server_enhanced.py
```

---

## 🔒 Security Checklist

- [ ] Server-side grading implemented
- [ ] Correct answers hidden from public endpoints
- [ ] Time-based validation enforced server-side
- [ ] Environment variables secured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] HTTPS enabled in production
- [ ] Database RLS policies reviewed
- [ ] Service role key kept secret
- [ ] JWT secret is strong and random
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't expose passwords/keys

---

## 🐛 Troubleshooting

### Edge Function Not Working

**Error**: "Function not found"
```bash
# Redeploy
supabase functions deploy grade-exam --no-verify-jwt
```

**Error**: "Missing environment variables"
```bash
# Check secrets
supabase secrets list

# Set missing secrets
supabase secrets set KEY=value
```

### Backend Connection Issues

**Error**: "Supabase not configured"
```bash
# Verify .env file
cat backend/.env

# Ensure variables are set
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE=...
```

### CORS Errors

Update CORS settings in backend:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📈 Performance Optimization

### Database Indexes

Add indexes for faster queries:
```sql
-- Index on exam_id for submissions
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id 
ON submissions(exam_id);

-- Index on submission_id for answers
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id 
ON submission_answers(submission_id);

-- Index on tutor_id for exams
CREATE INDEX IF NOT EXISTS idx_exams_tutor_id 
ON exams(tutor_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_submissions_created_at 
ON submissions(created_at DESC);
```

### Caching

Implement caching for frequently accessed exams:
```typescript
// In frontend
const examCache = new Map();

const fetchExam = async (id: string) => {
  if (examCache.has(id)) {
    return examCache.get(id);
  }
  
  const exam = await supabase.from('exams').select('*').eq('id', id).single();
  examCache.set(id, exam);
  return exam;
};
```

---

## 🎯 Next Steps

1. **Deploy Edge Function** or Enhanced Backend
2. **Update Frontend** to use server-side grading
3. **Test thoroughly** with various question types
4. **Monitor logs** for errors
5. **Add analytics** to track exam performance
6. **Implement email notifications** for exam results
7. **Add admin dashboard** for system monitoring

---

## 📚 Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [FastAPI Best Practices](https://fastapi.tiangolo.com/tutorial/)
- [Vercel Deployment](https://vercel.com/docs)
- [Railway Deployment](https://docs.railway.app/)

---

**✨ All improvements are now ready for deployment!**
