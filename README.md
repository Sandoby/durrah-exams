# 🎓 Durrah Exams - Secure Online Examination Platform

A modern, full-stack online examination platform with advanced anti-cheating measures and server-side grading.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?logo=supabase)

---

## ✨ Features

### 🎯 For Tutors
- **Exam Management**: Create, edit, and delete exams with ease
- **Multiple Question Types**: 
  - Multiple Choice
  - True/False
  - Short Answer
  - Numeric
  - Dropdown
  - Multiple Select
- **Flexible Configuration**:
  - Time limits
  - Start/end dates
  - Custom student fields
  - Anti-cheating settings
- **Results & Analytics**:
  - View all submissions
  - Export to Excel
  - Violation tracking
  - Performance analytics

### 👨‍🎓 For Students
- **User-Friendly Interface**: Clean, modern exam-taking experience
- **Progress Saving**: Automatic session restoration
- **Mobile Support**: Works on desktop, tablet, and mobile
- **Offline Resilience**: Submissions saved locally if network fails

### 🔒 Security Features
- **Anti-Cheating Measures**:
  - Fullscreen enforcement
  - Tab switch detection
  - Copy/paste blocking
  - Right-click disabling
  - Violation tracking & auto-submission
- **Server-Side Grading**: Prevents answer manipulation
- **Time-Based Access Control**: Enforce exam schedules
- **Row Level Security**: Database-level access control

---

## 🏗️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing-fast builds
- **TailwindCSS** for styling
- **React Router** for navigation
- **React Hook Form** + **Zod** for validation
- **Lucide React** for icons

### Backend
- **Supabase** (PostgreSQL + Auth + Edge Functions)
- **FastAPI** (Python) - Optional enhanced backend
- **Row Level Security** (RLS) for data protection

### Additional Tools
- **XLSX** for Excel exports
- **React Hot Toast** for notifications
- **CryptoJS** for secure hashing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Python 3.9+ (if using FastAPI backend)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/durrah-exams.git
cd durrah-exams
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database schema:
   ```bash
   # In Supabase SQL Editor, run:
   cat supabase_schema.sql
   ```
3. Get your credentials from Project Settings → API

### 3. Configure Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## 📖 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Security improvements & deployment
- **[Supabase Setup](SUPABASE_SETUP.md)** - Database configuration
- **[New Features](NEW_FEATURES.md)** - Feature documentation
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues & solutions

---

## 🔐 Security Improvements (v2.0)

### ✅ What's New

1. **Server-Side Grading**
   - Correct answers no longer exposed to clients
   - Prevents score manipulation
   - Two implementation options:
     - Supabase Edge Function (recommended)
     - Enhanced FastAPI backend

2. **Fixed Scoring Bug**
   - All question types now properly scored
   - Numeric comparison for numeric questions
   - Case-insensitive text comparison

3. **Enhanced Error Handling**
   - Centralized error management
   - Retry logic with exponential backoff
   - User-friendly error messages
   - Offline submission queuing

4. **Time Validation**
   - Server-side enforcement of exam schedules
   - Prevents early/late submissions

---

## 📊 Database Schema

```
profiles
├── id (uuid, PK)
├── email (text)
├── full_name (text)
└── created_at (timestamp)

exams
├── id (uuid, PK)
├── tutor_id (uuid, FK → profiles)
├── title (text)
├── description (text)
├── settings (jsonb)
├── required_fields (text[])
└── created_at (timestamp)

questions
├── id (uuid, PK)
├── exam_id (uuid, FK → exams)
├── type (text)
├── question_text (text)
├── options (jsonb)
├── correct_answer (text | jsonb)
├── points (integer)
└── randomize_options (boolean)

submissions
├── id (uuid, PK)
├── exam_id (uuid, FK → exams)
├── student_name (text)
├── student_email (text)
├── score (integer)
├── max_score (integer)
├── percentage (numeric)
├── violations (jsonb)
└── created_at (timestamp)

submission_answers
├── id (uuid, PK)
├── submission_id (uuid, FK → submissions)
├── question_id (uuid, FK → questions)
├── answer (text)
└── is_correct (boolean)
```

---

## 🎨 Screenshots

### Tutor Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Exam Editor
![Editor](docs/screenshots/editor.png)

### Student Exam View
![Exam View](docs/screenshots/exam-view.png)

### Results & Analytics
![Results](docs/screenshots/results.png)

---

## 🧪 Testing

### Run Tests
```bash
# Frontend tests
cd frontend
npm test

# Backend tests (if using FastAPI)
cd backend
pytest
```

### Manual Testing Checklist

- [ ] Create exam with all question types
- [ ] Take exam as student
- [ ] Verify scoring accuracy
- [ ] Test violation system
- [ ] Export results to Excel
- [ ] Test time-based access
- [ ] Verify mobile compatibility
- [ ] Test offline submission queue

---

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel

# Set environment variables in Vercel dashboard
```

### Backend Options

#### Option 1: Supabase Edge Functions (Recommended)
```bash
supabase functions deploy grade-exam
```

#### Option 2: FastAPI on Railway
```bash
railway init
railway up
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing backend platform
- [Vercel](https://vercel.com) for hosting
- [Lucide](https://lucide.dev) for beautiful icons
- [TailwindCSS](https://tailwindcss.com) for styling utilities

---

## 📧 Support

For support, email support@durrahexams.com or open an issue on GitHub.

---

## 🗺️ Roadmap

- [ ] Email notifications for exam results
- [ ] Advanced analytics dashboard
- [ ] Question bank management
- [ ] Bulk exam operations
- [ ] Mobile app (React Native)
- [ ] AI-powered proctoring
- [ ] Video recording during exams
- [ ] Integration with LMS platforms

---

## 📈 Project Status

**Current Version**: 2.0.0  
**Status**: Production Ready ✅  
**Last Updated**: November 2025

---

**Made with ❤️ by the Durrah Team**
