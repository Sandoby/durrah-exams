# 🚀 Quick Reference Guide

Quick commands and code snippets for common tasks in Durrah Exams.

---

## 📦 Installation & Setup

### First Time Setup
```bash
# Clone repository
git clone https://github.com/yourusername/durrah-exams.git
cd durrah-exams

# Frontend setup
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev

# Backend setup (optional)
cd ../backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
python server_enhanced.py
```

---

## 🔧 Development Commands

### Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

### Backend
```bash
# Run server
python server_enhanced.py

# Or with uvicorn
uvicorn server_enhanced:app --reload

# Run tests
pytest

# Run with specific port
uvicorn server_enhanced:app --port 8080
```

---

## 🗄️ Database Operations

### Run Schema
```sql
-- In Supabase SQL Editor
-- Copy and paste contents of supabase_schema.sql
```

### Common Queries
```sql
-- View all exams
SELECT * FROM exams ORDER BY created_at DESC;

-- View submissions for an exam
SELECT * FROM submissions WHERE exam_id = 'your-exam-id';

-- View violations
SELECT student_name, violations 
FROM submissions 
WHERE exam_id = 'your-exam-id' 
AND jsonb_array_length(violations) > 0;

-- Export results
SELECT 
  student_name,
  student_email,
  score,
  max_score,
  percentage,
  jsonb_array_length(violations) as violation_count,
  created_at
FROM submissions
WHERE exam_id = 'your-exam-id'
ORDER BY percentage DESC;
```

### Add Indexes (Performance)
```sql
-- Improve query performance
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_tutor_id ON exams(tutor_id);
CREATE INDEX IF NOT EXISTS idx_submission_answers_submission_id ON submission_answers(submission_id);
```

---

## 🚢 Deployment

### Deploy Frontend to Vercel
```bash
cd frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy grade-exam

# View logs
supabase functions logs grade-exam

# Set secrets
supabase secrets set SUPABASE_URL=https://...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Deploy Backend to Railway
```bash
cd backend

# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Set variables
railway variables set SUPABASE_URL=...
railway variables set SUPABASE_SERVICE_ROLE=...

# View logs
railway logs
```

---

## 🧪 Testing

### Test Exam Creation
```typescript
// In browser console
const testExam = {
  title: "Test Exam",
  description: "Testing all features",
  required_fields: ["name", "email"],
  questions: [
    {
      type: "multiple_choice",
      question_text: "What is 2+2?",
      options: ["3", "4", "5"],
      correct_answer: "4",
      points: 1
    }
  ],
  settings: {
    require_fullscreen: false,
    detect_tab_switch: true,
    max_violations: 3,
    time_limit_minutes: 10
  }
};
```

### Test Server-Side Grading
```bash
# Using curl
curl -X POST https://your-project.supabase.co/functions/v1/grade-exam \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "exam_id": "exam-id",
    "student_data": {"name": "Test Student", "email": "test@example.com"},
    "answers": [{"question_id": "q-id", "answer": "4"}],
    "violations": [],
    "browser_info": {}
  }'
```

---

## 🔍 Debugging

### View Supabase Logs
```bash
# Edge Function logs
supabase functions logs grade-exam --tail

# Database logs (in Supabase Dashboard)
# Go to: Database → Logs
```

### Frontend Debug Mode
```typescript
// In browser console
localStorage.setItem('debug', 'true');

// View stored exam state
const examState = localStorage.getItem('durrah_exam_EXAM_ID_state');
console.log(JSON.parse(examState));

// View pending submissions
const pending = localStorage.getItem('durrah_pending_submissions');
console.log(JSON.parse(pending));

// Clear all exam data
Object.keys(localStorage)
  .filter(key => key.startsWith('durrah_'))
  .forEach(key => localStorage.removeItem(key));
```

### Backend Debugging
```python
# Add to server_enhanced.py
import logging
logging.basicConfig(level=logging.DEBUG)

# View request details
@api_router.post("/exams/{exam_id}/submit")
async def submit_exam(exam_id: str, submission: ExamSubmission, request: Request):
    logger.debug(f"Request headers: {request.headers}")
    logger.debug(f"Request body: {submission.model_dump()}")
    # ... rest of code
```

---

## 📊 Common Code Snippets

### Fetch Exam with Questions
```typescript
const { data: exam } = await supabase
  .from('exams')
  .select('*, questions(*)')
  .eq('id', examId)
  .single();
```

### Create Submission
```typescript
const { data: submission, error } = await supabase
  .from('submissions')
  .insert({
    exam_id: examId,
    student_name: 'John Doe',
    student_email: 'john@example.com',
    score: 15,
    max_score: 20,
    percentage: 75,
    violations: [],
    browser_info: {}
  })
  .select()
  .single();
```

### Export to Excel
```typescript
import * as XLSX from 'xlsx';

const exportToExcel = (submissions: any[], examTitle: string) => {
  const worksheet = XLSX.utils.json_to_sheet(submissions);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  XLSX.writeFile(workbook, `${examTitle}_results.xlsx`);
};
```

### Retry with Backoff
```typescript
import { retryWithBackoff } from '@/lib/errorHandling';

const result = await retryWithBackoff(
  async () => {
    const response = await fetch('/api/endpoint');
    if (!response.ok) throw new Error('Failed');
    return response.json();
  },
  3, // max retries
  1000 // base delay (ms)
);
```

---

## 🔐 Security Checklist

### Before Production
- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable RLS on all tables
- [ ] Review database policies
- [ ] Hide service role key
- [ ] Enable 2FA on Supabase
- [ ] Set up monitoring/alerts

### Environment Variables
```bash
# Frontend (.env.local)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...

# Backend (.env)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE=eyJ...
JWT_SECRET=your-strong-secret
MONGO_URL=mongodb://...
CORS_ORIGINS=https://yourdomain.com
```

---

## 📱 Mobile Testing

### iOS Safari
```bash
# Test on iOS Safari
# 1. Open Safari on iPhone
# 2. Go to Settings → Safari
# 3. Disable "Prevent Cross-Site Tracking"
# 4. Disable "Block All Cookies"
# 5. Visit your exam URL
```

### Android Chrome
```bash
# Test on Android Chrome
# 1. Open Chrome on Android
# 2. Visit your exam URL
# 3. Test fullscreen mode
# 4. Test tab switching detection
```

---

## 🛠️ Maintenance

### Update Dependencies
```bash
# Frontend
cd frontend
npm update
npm audit fix

# Backend
cd backend
pip list --outdated
pip install --upgrade package-name
```

### Backup Database
```bash
# In Supabase Dashboard
# Go to: Database → Backups
# Or use pg_dump:
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql
```

### Monitor Performance
```sql
-- Slow queries
SELECT * FROM pg_stat_statements 
ORDER BY total_exec_time DESC 
LIMIT 10;

-- Table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📞 Support

### Get Help
- Documentation: See `/docs` folder
- Issues: GitHub Issues
- Email: support@durrahexams.com

### Useful Links
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Vercel Docs](https://vercel.com/docs)

---

**Last Updated**: November 2025  
**Version**: 2.0.0
