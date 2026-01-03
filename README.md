# 🎓 Durrah Exams - Advanced Online Examination & Learning Platform

A modern, full-stack online examination platform with advanced anti-cheating measures, server-side grading, AI-powered features, realtime chat support, sales workspace, and comprehensive admin management system.

![Version](https://img.shields.io/badge/version-3.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Latest-3ECF8E?logo=supabase)
![Vite](https://img.shields.io/badge/Vite-7.2.2-646CFF?logo=vite)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python)

> 🚀 A comprehensive platform trusted by tutors and educational institutions for creating, managing, and delivering online examinations with enterprise-grade security and AI capabilities.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Roadmap](#️-roadmap)
- [Support](#-support)

---

## ✨ Features

### 🎯 For Tutors
- **Exam Management**: Create, edit, activate/deactivate, and delete exams
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
  - Exam activation/deactivation
- **Results & Analytics**:
  - View all submissions
  - Export to Excel, Word, PDF
  - Violation tracking
  - Performance analytics
  - Exam-specific analytics dashboard
- **Question Bank**: Organize and reuse questions across exams
- **Kids Mode**: Child-friendly interface with gamification

### 👨‍🎓 For Students
- **User-Friendly Interface**: Clean, modern exam-taking experience
- **Student Portal**: Access all available exams in one place
- **Progress Saving**: Automatic session restoration
- **Mobile Support**: Full mobile app (Capacitor) + responsive web
- **Offline Resilience**: Submissions saved locally if network fails
- **Kids Interface**: Engaging, age-appropriate exam experience

### 💼 For Administrators
- **Super Admin Panel**: Full system management and monitoring
- **User Management**: View, filter, and manage all users
- **Coupon System**: Create discount codes and free trial coupons
- **Support Chat**: Built-in live chat with assignment system
- **Support Agents**: Create and manage support team with access codes
- **Sales Team Management**: Create sales users with access codes and performance tracking
- **Analytics Dashboard**: System-wide metrics and insights
- **Push Notifications**: Send targeted notifications to users via Firebase Cloud Messaging
- **Mockups Gallery**: Download promotional screenshots
- **Realtime Monitoring**: Live chat sessions and system health tracking

### 💬 Realtime Chat System
- **Live Support**: Real-time chat between users and support agents
- **Agent Assignment**: Automatic and manual agent assignment to chat sessions
- **Chat Ratings**: Users can rate their support experience
- **Message History**: Full conversation history with timestamps
- **Typing Indicators**: See when someone is typing
- **Online Status**: Real-time presence tracking for agents
- **File Sharing**: Share images and documents in chat
- **Emoji Support**: Rich text messaging with emoji reactions

### 📊 Sales Workspace
- **Sales Page**: Dedicated workspace for sales team with access code login
- **Lead Capture**: Integrated lead form with status tracking
- **Event Logging**: Track all sales activities and conversions
- **UTM Link Builder**: Generate campaign-specific tracking links
- **Outreach Scripts**: Ready-to-use pitch templates and objection handling
- **Referral System**: Track referrals via unique access codes
- **Admin Oversight**: Monitor sales team performance and leads

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
- **Secure Payments**: Kashier integration for subscriptions
- **Access Code System**: Secure authentication for agents and sales

### 🤖 AI & Advanced Features
- **Multiple AI Providers**: Support for OpenAI, Gemini, Groq, and Claude
- **AI Question Generation**: Generate exam questions from topics or learning objectives
- **Hybrid AI Extraction**: Extract questions from PDFs and images
- **Smart Answer Validation**: Intelligent grading for subjective questions
- **LaTeX Support**: Full mathematical notation rendering with KaTeX
- **Document Processing**: OCR and text extraction capabilities

---

## 🏗️ Tech Stack

### Frontend
- **React 19.2** with TypeScript
- **Vite 7.2** (Rolldown) for blazing-fast builds
- **TailwindCSS** for styling
- **React Router 7** for navigation
- **React Hook Form** + **Zod** for validation
- **Lucide React** for icons
- **Framer Motion** for animations
- **Recharts** for analytics visualizations
- **KaTeX** for LaTeX math rendering
- **React Quill** for rich text editing

### Backend
- **Supabase** (PostgreSQL + Auth + Realtime + Edge Functions + Storage)
- **FastAPI** (Python) - Enhanced backend with AI features
- **Row Level Security** (RLS) for data protection
- **Realtime Subscriptions** for live chat and updates
- **Edge Functions** for serverless compute (Deno runtime)
- **Supabase Storage** for file uploads and media management

### Mobile
- **Capacitor 8** for native iOS/Android apps
- **Native Plugins**: Camera, Biometric, Push Notifications, Local Storage
- **Progressive Web App** (PWA) support

### Payments & Integrations
- **Kashier** payment gateway integration
- **Firebase** (Analytics, Cloud Messaging for push notifications)
- **Puppeteer** for screenshot generation
- **XLSX** for Excel exports
- **jsPDF** + **docx** for document generation
- **Capacitor Plugins**: Camera, Biometric, Push Notifications, Local Storage

### AI & Advanced Features
- **OpenAI GPT-4** for intelligent question generation
- **Google Gemini** for multimodal AI capabilities
- **Groq** for fast AI inference
- **Anthropic Claude** for advanced reasoning
- **Puppeteer** for web scraping and document processing
- **LaTeX** support for mathematical content via KaTeX

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/pnpm
- **Supabase** account (free tier available)
- **Python** 3.9+ (optional, for FastAPI backend)
- **Git** for version control

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/durrah-exams.git
cd durrah-exams
```

### 2. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the database schema migrations in the SQL Editor:
   - Execute `COMPLETE_ADMIN_SYSTEM_MIGRATION.sql` for core tables
   - Execute `FINAL_CHAT_SCHEMA.sql` for chat functionality
   - Execute `analytics_migration.sql` for analytics
   - Execute other migration files as needed
3. Enable Realtime for chat tables:
   ```sql
   -- In Supabase Dashboard → Database → Replication
   -- Enable realtime for: chat_messages, chat_sessions
   ```
4. Get your credentials from Project Settings → API
5. (Optional) Configure SMTP for email notifications

### 3. Configure Frontend

```bash
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_KASHIER_API_KEY=your-kashier-key (optional)
VITE_FIREBASE_CONFIG=your-firebase-config (optional)
```

### 4. Configure Backend (Optional - FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Edit .env with your API keys
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
ANTHROPIC_API_KEY=your-claude-key
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-service-role-key
```

### 4. Run Development Server

```bash
# Frontend
npm run dev

# Backend (optional FastAPI)
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile app (after setup)
npm run build:mobile
npx cap open android
npx cap open ios
```

Visit `http://localhost:5173` for web app

---

## 📖 Documentation

- **[Sales Improvement Plan](SALES_IMPROVEMENT_PLAN.md)** - Comprehensive sales features roadmap
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Security improvements & deployment
- **[Supabase Setup](SUPABASE_SETUP.md)** - Database configuration
- **[New Features](NEW_FEATURES.md)** - Feature documentation
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues & solutions
- **[Realtime Chat](REALTIME_CHAT_QUICKSTART.md)** - Live chat setup guide
- **[Kids Mode](KIDS_MODE_TASKS.md)** - Kids interface documentation
- **[Mobile App](MOBILE_APP_PLAN.md)** - Capacitor mobile app guide
- **[Payment Integration](KASHIER_IMPLEMENTATION_COMPLETE.md)** - Kashier setup

---

## 🔐 Security Improvements (v3.0)

### ✅ What's New in v3.0

1. **Sales Team Management**
   - Dedicated sales workspace at `/sales`
   - Lead capture and tracking
   - Event logging for all sales activities
   - UTM link builder for attribution
   - Admin oversight with performance analytics

2. **Advanced Admin Features**
   - User management with filters
   - Coupon system with usage tracking
   - Live support chat with agent assignment
   - Support agent management with access codes
   - System-wide analytics dashboard
   - Push notifications system

3. **Exam Lifecycle Management**
   - Activate/deactivate exams
   - Students can only access active exams
   - Direct exam links with access control
   - Exam-specific analytics

4. **Kids Mode**
   - Child-friendly interface
   - Gamification elements
   - Simplified navigation
   - Age-appropriate design

5. **Enhanced Payment Integration**
   - Kashier payment gateway
   - Subscription management
   - Coupon redemption
   - Payment history

### ✅ What's New in v2.0

1. **Server-Side Grading**
   - Correct answers no longer exposed to clients
   - Prevents score manipulation
   - Supabase Edge Function implementation

2. **Fixed Scoring Bug**
   - All question types properly scored
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

### Core Tables
```
profiles
├── id (uuid, PK)
├── email (text)
├── full_name (text)
├── phone (text)
├── institution (text)
├── subscription_status (text)
├── subscription_plan (text)
├── subscription_end_date (timestamp)
└── created_at (timestamp)

exams
├── id (uuid, PK)
├── tutor_id (uuid, FK → profiles)
├── title (text)
├── description (text)
├── settings (jsonb)
├── required_fields (text[])
├── is_active (boolean)
├── is_kids_mode (boolean)
└── created_at (timestamp)

questions
├── id (uuid, PK)
├── exam_id (uuid, FK → exams)
├── type (text)
├── question_text (text)
├── options (jsonb)
├── correct_answer (text | jsonb)
├── points (integer)
├── randomize_options (boolean)
└── order_index (integer)

submissions
├── id (uuid, PK)
├── exam_id (uuid, FK → exams)
├── student_name (text)
├── student_email (text)
├── score (integer)
├── max_score (integer)
├── percentage (numeric)
├── violations (jsonb)
├── time_taken (integer)
└── created_at (timestamp)

submission_answers
├── id (uuid, PK)
├── submission_id (uuid, FK → submissions)
├── question_id (uuid, FK → questions)
├── answer (text)
└── is_correct (boolean)
```

### Admin & Support Tables
```
coupons
├── id (uuid, PK)
├── code (text, unique)
├── discount_type (text)
├── discount_value (numeric)
├── max_uses (integer)
├── used_count (integer)
├── valid_until (timestamp)
├── is_active (boolean)
└── created_at (timestamp)

support_agents
├── id (uuid, PK)
├── name (text)
├── email (text)
├── access_code (text, unique)
├── is_active (boolean)
└── created_at (timestamp)

live_chat_sessions
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── assigned_agent_id (uuid, FK → support_agents)
├── status (text)
├── created_at (timestamp)
└── updated_at (timestamp)

chat_messages
├── id (uuid, PK)
├── session_id (uuid, FK → live_chat_sessions)
├── user_id (uuid, FK → profiles)
├── message (text)
├── is_admin (boolean)
└── created_at (timestamp)
```

### Sales Tables
```
sales_agents
├── id (uuid, PK)
├── name (text)
├── email (text, unique)
├── access_code (text, unique)
├── is_active (boolean)
├── created_at (timestamp)
└── updated_at (timestamp)

sales_events
├── id (uuid, PK)
├── agent_id (uuid, FK → sales_agents)
├── type (text)
├── metadata (jsonb)
└── created_at (timestamp)

sales_leads
├── id (uuid, PK)
├── agent_id (uuid, FK → sales_agents)
├── email (text)
├── name (text)
├── status (text)
├── notes (text)
├── meta (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Question Bank
```
question_banks
├── id (uuid, PK)
├── tutor_id (uuid, FK → profiles)
├── name (text)
├── description (text)
└── created_at (timestamp)

question_bank_items
├── id (uuid, PK)
├── bank_id (uuid, FK → question_banks)
├── question_data (jsonb)
└── created_at (timestamp)
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

- [x] Create exam with all question types
- [x] Take exam as student
- [x] Verify scoring accuracy
- [x] Test violation system
- [x] Export results to Excel, PDF, Word
- [x] Test time-based access
- [x] Verify mobile compatibility
- [x] Test offline submission queue
- [x] Live chat functionality
- [x] Payment integration
- [x] Coupon redemption
- [x] Admin panel features
- [x] Sales page access and lead capture
- [x] Support agent chat assignment
- [x] Exam activation/deactivation
- [x] Kids mode interface
- [ ] Free vs Paid restrictions

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

### Completed ✅
- [x] Server-side grading
- [x] Advanced analytics dashboard
- [x] Question bank management
- [x] Mobile app (Capacitor)
- [x] Kids mode interface
- [x] Payment integration (Kashier)
- [x] Support chat system
- [x] Sales team workspace
- [x] Admin panel with full management
- [x] Exam activation/deactivation
- [x] Multiple export formats (Excel, PDF, Word)
- [x] Live chat with realtime updates
- [x] Push notifications

### In Progress 🚧
- [ ] Free vs Paid user restrictions
- [ ] Advanced sales analytics and leaderboards
- [ ] Email notifications for exam results
- [ ] AI-powered proctoring
- [ ] Bulk exam operations

### Planned 📋
- [ ] Video recording during exams
- [ ] Integration with LMS platforms (Moodle, Canvas)
- [ ] Advanced AI question generation
- [ ] Collaborative exam editing
- [ ] Student performance predictions
- [ ] Automated plagiarism detection
- [ ] Calendar integration for exam scheduling

---

## 📈 Project Status

**Current Version**: 3.0.0  
**Status**: Production Ready ✅  
**Last Updated**: January 2026  
**Active Development**: Yes 🟢

---

**Made with ❤️ by the Durrah Team**
