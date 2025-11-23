# 🎯 Supabase Edge Function Implementation Guide

## Step-by-Step Instructions for Server-Side Grading

---

## ✅ **What You're Implementing**

Server-side grading using Supabase Edge Functions to:
- Hide correct answers from students
- Prevent score manipulation
- Validate exam timing server-side
- Ensure secure, tamper-proof grading

---

## 📋 **Prerequisites**

Before starting, make sure you have:
- [ ] Supabase account and project created
- [ ] Node.js 18+ installed
- [ ] Access to your Supabase project credentials

---

## 🔧 **Step 1: Install Supabase CLI**

Open your terminal and run:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
```

**Expected output**: `supabase version 1.x.x`

---

## 🔑 **Step 2: Login to Supabase**

```bash
# Login to your Supabase account
supabase login

# This will open a browser window
# Click "Authorize" to grant access
```

**Expected output**: `✓ Logged in successfully`

---

## 🔗 **Step 3: Link Your Project**

```bash
# Navigate to your project directory
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new"

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

**How to find your project ref**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

**Expected output**: `✓ Linked to project YOUR_PROJECT_REF`

---

## 🚀 **Step 4: Deploy the Edge Function**

The Edge Function file is already created at:
`supabase/functions/grade-exam/index.ts`

Deploy it with:

```bash
# Deploy the grading function
supabase functions deploy grade-exam

# If you get permission errors, add --no-verify-jwt
supabase functions deploy grade-exam --no-verify-jwt
```

**Expected output**:
```
✓ Deployed Function grade-exam
  URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/grade-exam
```

**Save this URL!** You'll need it in the next step.

---

## 🔐 **Step 5: Set Environment Secrets**

The Edge Function needs access to your Supabase credentials:

```bash
# Set the Supabase URL
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Set the service role key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to find your service role key**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the "service_role" key (⚠️ Keep this secret!)

**Expected output**: `✓ Secrets set successfully`

**Verify secrets**:
```bash
supabase secrets list
```

---

## 📝 **Step 6: Update Frontend to Use Edge Function**

Now we need to update `ExamView.tsx` to call the Edge Function instead of doing client-side grading.

I'll create the updated version for you:

---

## 🧪 **Step 7: Test the Edge Function**

Before updating the frontend, let's test the Edge Function:

```bash
# View the function logs
supabase functions logs grade-exam --tail
```

Keep this terminal open to see logs in real-time.

**Test with curl** (in a new terminal):

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/grade-exam \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "exam_id": "test-exam-id",
    "student_data": {
      "name": "Test Student",
      "email": "test@example.com"
    },
    "answers": [
      {
        "question_id": "q1",
        "answer": "Test Answer"
      }
    ],
    "violations": [],
    "browser_info": {}
  }'
```

**Expected response**:
```json
{
  "success": true,
  "submission_id": "uuid-here",
  "score": 0,
  "max_score": 10,
  "percentage": 0,
  "violations_count": 0
}
```

---

## ✅ **Step 8: Update Environment Variables**

Add the Edge Function URL to your frontend environment:

**File**: `frontend/.env.local`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_EDGE_FUNCTION=true
```

---

## 🎯 **Step 9: Verify Everything Works**

1. **Start your frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Create a test exam**:
   - Login as a tutor
   - Create an exam with various question types
   - Note the exam ID

3. **Take the exam as a student**:
   - Open the exam URL
   - Fill in student details
   - Answer questions
   - Submit

4. **Check the logs**:
   - In the terminal running `supabase functions logs grade-exam --tail`
   - You should see the grading happening server-side

5. **Verify security**:
   - Open browser DevTools → Network tab
   - Submit the exam
   - Check the request to the Edge Function
   - ✅ Correct answers should NOT be visible in the request

---

## 🔍 **Troubleshooting**

### Issue: "Function not found"

**Solution**:
```bash
# Redeploy the function
supabase functions deploy grade-exam --no-verify-jwt
```

### Issue: "Missing environment variables"

**Solution**:
```bash
# Check if secrets are set
supabase secrets list

# If missing, set them again
supabase secrets set SUPABASE_URL=https://...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

### Issue: "CORS error"

**Solution**: The Edge Function already includes CORS headers. If you still get errors:
```bash
# Redeploy with updated CORS settings
supabase functions deploy grade-exam
```

### Issue: "Permission denied"

**Solution**:
```bash
# Check RLS policies in Supabase Dashboard
# Go to: Database → Policies
# Ensure "Allow anonymous submissions" policy exists
```

### Issue: "Timeout"

**Solution**:
```bash
# Check function logs for errors
supabase functions logs grade-exam

# Increase timeout in the function if needed
```

---

## 📊 **Monitoring & Logs**

### View Real-Time Logs:
```bash
supabase functions logs grade-exam --tail
```

### View Recent Logs:
```bash
supabase functions logs grade-exam
```

### In Supabase Dashboard:
1. Go to Edge Functions
2. Click on "grade-exam"
3. View the Logs tab

---

## 🎉 **Success Checklist**

After completing all steps, verify:

- [ ] Supabase CLI installed and logged in
- [ ] Project linked successfully
- [ ] Edge Function deployed
- [ ] Environment secrets set
- [ ] Frontend updated to use Edge Function
- [ ] Test exam created and submitted
- [ ] Logs showing successful grading
- [ ] Correct answers NOT visible in network tab
- [ ] Scores calculated correctly
- [ ] Submissions saved to database

---

## 🚀 **Next Steps**

Once everything is working:

1. **Deploy to Production**:
   ```bash
   cd frontend
   vercel --prod
   ```

2. **Monitor Performance**:
   - Check Edge Function logs regularly
   - Monitor response times
   - Watch for errors

3. **Add Monitoring** (Optional):
   - Set up alerts in Supabase
   - Add error tracking (Sentry)
   - Monitor usage metrics

---

## 📞 **Need Help?**

- **Edge Function Docs**: https://supabase.com/docs/guides/functions
- **Troubleshooting Guide**: See `TROUBLESHOOTING.md`
- **Quick Reference**: See `QUICK_REFERENCE.md`

---

**🎊 Congratulations! You now have secure, server-side grading!**

Students can no longer:
- ❌ View correct answers
- ❌ Manipulate scores
- ❌ Bypass time restrictions

Everything is validated and graded server-side! 🔒

---

*Last Updated: November 23, 2025*  
*Version: 2.0.0*
