# Supabase Setup Guide

## ✅ Migration Summary

Your Durrah Exams application has been successfully migrated from FastAPI/MongoDB to Supabase! Here's what was completed:

### Frontend Components Migrated:
- ✅ **AuthContext.tsx** - Now uses Supabase Auth for session management
- ✅ **Login.tsx** - Uses `supabase.auth.signInWithPassword()`
- ✅ **Register.tsx** - Uses `supabase.auth.signUp()`
- ✅ **Dashboard.tsx** - Fetches and manages exams from Supabase
- ✅ **ExamEditor.tsx** - Creates/edits exams and questions in Supabase
- ✅ **ExamView.tsx** - Students take exams and submit answers to Supabase

### Database Schema:
- ✅ Complete PostgreSQL schema with Row Level Security (RLS)
- ✅ Tables: profiles, exams, questions, submissions, submission_answers
- ✅ Secure policies for data isolation
- ✅ Automated profile creation trigger

---

## 🚀 Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Choose an organization (or create one)
5. Fill in project details:
   - **Project Name**: durrah-exams (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose closest to your users
6. Click **"Create new project"** and wait for provisioning (1-2 minutes)

### Step 2: Get Your API Keys

1. In your Supabase project dashboard, click **"Project Settings"** (gear icon)
2. Navigate to **"API"** section
3. Copy the following:
   - **Project URL** (looks like: `https://xxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long JWT token starting with `eyJ...`)

### Step 3: Configure Environment Variables

1. Navigate to the frontend directory:
   ```bash
   cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams\frontend"
   ```

2. Create `.env.local` file:
   ```bash
   copy .env.example .env.local
   ```

3. Open `.env.local` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Step 4: Run Database Schema

1. In your Supabase project dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open `supabase_schema.sql` from this project root
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** to execute the schema
6. You should see success messages for all tables and policies created

### Step 5: Verify Setup

1. In Supabase dashboard, click **"Table Editor"**
2. You should see these tables:
   - profiles
   - exams
   - questions
   - submissions
   - submission_answers

### Step 6: Configure Email Templates (Optional)

By default, Supabase sends confirmation emails. To customize:

1. Go to **"Authentication"** → **"Email Templates"**
2. Customize the templates for:
   - Confirm signup
   - Reset password
   - Change email address

### Step 7: Disable Email Confirmation (Development Only)

For faster development, you can disable email confirmation:

1. Go to **"Authentication"** → **"Providers"**
2. Under **"Email"**, toggle off **"Confirm email"**
3. ⚠️ **Remember to re-enable this in production!**

---

## 🧪 Testing Your Setup

### 1. Start the Frontend

```bash
cd "c:\Users\Elsaid Ahmed\Desktop\durrah exams\frontend"
npm run dev
```

### 2. Test User Registration

1. Navigate to `http://localhost:5173/register`
2. Create a new account
3. Check Supabase **"Authentication"** → **"Users"** to see your new user

### 3. Test Login

1. Go to `http://localhost:5173/login`
2. Sign in with your credentials
3. You should be redirected to the dashboard

### 4. Test Exam Creation

1. In the dashboard, click **"Create New Exam"**
2. Fill in exam details and add questions
3. Click **"Save Exam"**
4. Check Supabase **"Table Editor"** → **"exams"** to see your exam

### 5. Test Student Exam View

1. Copy an exam ID from the dashboard
2. Navigate to `http://localhost:5173/exam/{exam-id}`
3. Fill in student details and start the exam
4. Submit answers
5. Check **"submissions"** and **"submission_answers"** tables

---

## 🔒 Security Notes

### Row Level Security (RLS)
All tables have RLS enabled with the following policies:

- **Exams**: Tutors can only see/edit their own exams
- **Questions**: Tutors can only manage questions for their exams
- **Submissions**: Students can submit, tutors can view submissions for their exams
- **Students can view public exams and questions** (to take exams)

### Important Considerations

⚠️ **Client-Side Grading**: Currently, exam grading is done on the client-side. This means:
- The `correct_answer` is sent to students (visible in network requests)
- Students could theoretically manipulate scores

**For production, consider:**
1. Using Supabase Edge Functions to grade exams server-side
2. Not sending `correct_answer` to students
3. Implementing secure grading after submission

---

## 📝 Backend Status

The Python/FastAPI backend (`backend/server.py`) is now **deprecated** for this frontend. You can:

- **Keep it running** if you have other services using it
- **Stop it** if you're fully migrated to Supabase
- **Archive it** for reference

To stop the backend:
```bash
# Press Ctrl+C in the terminal running uvicorn
```

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure `.env.local` exists in the `frontend` folder
- Verify the file contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart the dev server after creating/editing `.env.local`

### Authentication Not Working
- Check that you've run the database schema (especially the `handle_new_user` trigger)
- Verify your Supabase project URL and key are correct
- Check browser console for errors

### RLS Policy Errors
- Make sure you're logged in (check `supabase.auth.getUser()` in console)
- Verify the schema was applied correctly
- Check that the logged-in user's ID matches the `tutor_id` in exams

### Can't See Exams in Dashboard
- Ensure you're logged in as the user who created the exams
- Check RLS policies are correctly applied
- Verify exams exist in the Supabase table editor

---

## 🎯 Next Steps

1. **Test thoroughly** with different user accounts
2. **Customize email templates** in Supabase
3. **Consider server-side grading** for production
4. **Add exam sharing links** to make it easier for students
5. **Implement admin dashboard** to view all submissions
6. **Add analytics** to track exam performance
7. **Deploy frontend** to hosting (Vercel, Netlify, etc.)

---

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**✨ Your migration is complete! You're now running on a modern, scalable backend with Supabase.**
