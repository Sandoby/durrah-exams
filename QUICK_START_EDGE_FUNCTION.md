# 🚀 Quick Start - Deploy Edge Function

## One-Command Setup Script

Copy and paste these commands in order:

---

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

---

## Step 2: Login and Link Project

```bash
# Login to Supabase
supabase login

# Link your project (replace YOUR_PROJECT_REF with your actual project reference)
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams new"
supabase link --project-ref YOUR_PROJECT_REF
```

**How to get YOUR_PROJECT_REF:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → General → Reference ID

---

## Step 3: Deploy Edge Function

```bash
# Deploy the grading function
supabase functions deploy grade-exam
```

---

## Step 4: Set Secrets

```bash
# Set Supabase URL (replace with your actual URL)
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co

# Set Service Role Key (replace with your actual key)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**How to get Service Role Key:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Settings → API → service_role key (⚠️ Secret!)

---

## Step 5: Update Frontend Environment

Edit `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Step 6: Update ExamView.tsx

Replace the `handleSubmit` function in `frontend/src/pages/ExamView.tsx` with the version in:
`frontend/src/pages/ExamView_handleSubmit_UPDATE.tsx`

**Quick way:**
1. Open `ExamView_handleSubmit_UPDATE.tsx`
2. Copy the entire `handleSubmit` function
3. Open `ExamView.tsx`
4. Find the existing `handleSubmit` function (around line 410)
5. Replace it with the copied version

---

## Step 7: Test

```bash
# Start frontend
cd frontend
npm run dev

# In another terminal, watch Edge Function logs
supabase functions logs grade-exam --tail
```

Then:
1. Create a test exam
2. Take it as a student
3. Submit
4. Check logs to see server-side grading in action!

---

## ✅ Verification Checklist

After completing all steps:

- [ ] Supabase CLI installed (`supabase --version` works)
- [ ] Logged in to Supabase (`supabase login` completed)
- [ ] Project linked (`supabase link` completed)
- [ ] Edge Function deployed (got success message)
- [ ] Secrets set (both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)
- [ ] Frontend .env.local updated
- [ ] ExamView.tsx handleSubmit function updated
- [ ] Frontend running (`npm run dev`)
- [ ] Test exam created and submitted successfully
- [ ] Logs show grading happening server-side
- [ ] Network tab shows NO correct answers in requests

---

## 🎉 Success!

If all checkboxes are checked, you now have:
- ✅ Secure server-side grading
- ✅ Correct answers hidden from students
- ✅ Time validation enforced server-side
- ✅ Production-ready exam platform

---

## 🐛 Common Issues

### "Command not found: supabase"
**Solution**: Restart your terminal after installing Supabase CLI

### "Project not found"
**Solution**: Double-check your project reference ID

### "Permission denied"
**Solution**: Make sure you're logged in (`supabase login`)

### "Function not found" when testing
**Solution**: Redeploy with `supabase functions deploy grade-exam`

---

## 📞 Need Help?

- Full guide: `EDGE_FUNCTION_SETUP.md`
- Troubleshooting: `TROUBLESHOOTING.md`
- Quick reference: `QUICK_REFERENCE.md`

---

**Total time: ~10 minutes** ⏱️

Good luck! 🚀
