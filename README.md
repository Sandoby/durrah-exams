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

### 5. Run Development Servers

```bash
# Frontend (from /frontend directory)
npm run dev
# Access at http://localhost:5173

# Backend - FastAPI (optional, from /backend directory)
uvicorn main:app --reload --port 8000
# API docs at http://localhost:8000/docs

# Mobile app (after initial setup)
npm run build:mobile
npx cap sync
npx cap open android  # For Android
npx cap open ios      # For iOS (macOS only)
```

### 6. Access the Application

- **Web App**: http://localhost:5173
- **Tutor Dashboard**: http://localhost:5173/dashboard
- **Admin Panel**: http://localhost:5173/admin
- **Sales Workspace**: http://localhost:5173/sales
- **Support Chat**: http://localhost:5173/support

### 7. Create Your First Admin User

```sql
-- Run in Supabase SQL Editor
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@example.com';
```

---

## 📁 Project Structure

```
durrah-exams/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and helpers
│   │   ├── types/          # TypeScript definitions
│   │   └── App.tsx         # Main app component
│   ├── public/             # Static assets
│   ├── index.html          # Entry HTML
│   └── vite.config.ts      # Vite configuration
│
├── backend/                 # FastAPI Python backend
│   ├── main.py             # FastAPI application
│   ├── routes/             # API route handlers
│   ├── services/           # Business logic
│   ├── models/             # Data models
│   └── requirements.txt    # Python dependencies
│
├── durrah-tutors-mobile/   # Capacitor mobile app
│   ├── android/            # Android native project
│   ├── ios/                # iOS native project
│   └── capacitor.config.ts # Capacitor configuration
│
├── supabase/               # Supabase configuration
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
│
├── docs/                   # Documentation
│   ├── screenshots/        # App screenshots
│   ├── guides/            # Setup and usage guides
│   └── api/               # API documentation
│
└── README.md              # This file
```

---

## 📖 Documentation

### Setup & Configuration
- **[Database Setup Instructions](DATABASE_SETUP_INSTRUCTIONS.md)** - Comprehensive database configuration
- **[Supabase Setup](SUPABASE_SETUP.md)** - Supabase project configuration
- **[Configure Supabase SMTP](CONFIGURE_SUPABASE_SMTP.md)** - Email notification setup
- **[Deploy Edge Function](DEPLOY_EDGE_FUNCTION.md)** - Serverless function deployment

### Features & Implementation
- **[Realtime Chat Quickstart](REALTIME_CHAT_QUICKSTART.md)** - Live chat setup guide
- **[Bulletproof Realtime Chat](BULLETPROOF_REALTIME_CHAT.md)** - Advanced chat implementation
- **[Kids Mode Tasks](KIDS_MODE_TASKS.md)** - Kids interface documentation
- **[Payment Integration](KASHIER_IMPLEMENTATION_COMPLETE.md)** - Kashier payment setup
- **[AI Providers Guide](AI_PROVIDERS_COMPLETE_GUIDE.md)** - Multi-AI provider integration
- **[Hybrid AI Integration](HYBRID_AI_INTEGRATION_GUIDE.md)** - Advanced AI features

### Deployment & Maintenance
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Production deployment steps
- **[Deployment and Testing Checklist](DEPLOYMENT_AND_TESTING_CHECKLIST.md)** - Pre-launch checklist
- **[Email Deployment Guide](EMAIL_DEPLOYMENT_GUIDE.md)** - Email system setup
- **[GitHub Push Guide](GITHUB_PUSH_GUIDE.md)** - Version control workflow

### Business & Sales
- **[Sales Improvement Plan](SALES_IMPROVEMENT_PLAN.md)** - Sales features roadmap
- **[Feature Comparison](FEATURE_COMPARISON.md)** - Free vs Paid features

### Troubleshooting
- **[Fix Chat Errors Guide](FIX_CHAT_ERRORS_GUIDE.md)** - Chat system troubleshooting
- **[Groq Troubleshooting](GROQ_TROUBLESHOOTING.md)** - AI provider issues
- **[Build Status](BUILD_STATUS.md)** - Current build information

### Project Management
- **[Complete Project Summary](COMPLETE_PROJECT_SUMMARY.md)** - Full project overview
- **[Final Summary](FINAL_SUMMARY.md)** - Latest updates and status
- **[Almost Done](ALMOST_DONE.md)** - Remaining tasks
- **[Checklist](CHECKLIST.md)** - Development checklist

---

## 🔐 Security Improvements (v3.0)

### ✅ What's New in v3.0

1. **Realtime Chat System**
   - WebSocket-based live messaging
   - Agent assignment and routing
   - Message history and persistence
   - Chat session management
   - Rating system for support quality
   - Typing indicators and presence
   - File sharing capabilities

2. **Sales Team Management**
   - Dedicated sales workspace at `/sales`
   - Lead capture and tracking system
   - Event logging for all sales activities
   - UTM link builder for marketing attribution
   - Sales performance analytics
   - Admin oversight and monitoring

3. **Advanced Admin Features**
   - Comprehensive user management with filters
   - Coupon system with usage tracking and analytics
   - Support agent management with access codes
   - System-wide analytics dashboard
   - Firebase Cloud Messaging integration
   - Push notification system
   - Mockups gallery for marketing materials

4. **Exam Lifecycle Management**
   - Activate/deactivate exams functionality
   - Students can only access active exams
   - Direct exam links with access control
   - Exam-specific analytics and insights
   - Tutorial mode for practice exams
   - Test/production exam flags

5. **Kids Mode**
   - Child-friendly interface design
   - Gamification elements and rewards
   - Simplified navigation patterns
   - Age-appropriate visual design
   - Engaging animations and feedback

6. **Enhanced Payment Integration**
   - Kashier payment gateway integration
   - Subscription plan management
   - Coupon redemption system
   - Payment history and receipts
   - Free trial management
   - Automated subscription renewal

### ✅ What's New in v2.0

1. **Server-Side Grading**
   - Correct answers stored securely on server
   - Prevents client-side answer manipulation
   - Supabase Edge Function implementation
   - Secure answer validation

2. **Fixed Scoring System**
   - All question types scored accurately
   - Numeric comparison for numeric questions
   - Case-insensitive text comparison
   - Array-based answers for multiple select
   - Points system with partial credit support

3. **Enhanced Error Handling**
   - Centralized error management system
   - Retry logic with exponential backoff
   - User-friendly error messages
   - Offline submission queuing
   - Network failure recovery
   - Toast notifications for user feedback

4. **Time Validation**
   - Server-side enforcement of exam schedules
   - Prevents early/late submissions
   - Timezone-aware date handling
   - Grace period support
   - Countdown timers with warnings

---

## 🔒 Security Features

### Anti-Cheating System
- **Fullscreen Enforcement**: Exams must be taken in fullscreen mode
- **Tab Switch Detection**: Tracks when students leave the exam page
- **Copy/Paste Blocking**: Prevents content copying
- **Right-Click Disabling**: Blocks context menu access
- **Violation Tracking**: Logs all suspicious activities
- **Auto-Submission**: Automatic submission after violation threshold
- **Screenshot Prevention**: Blocks screenshot attempts (mobile)
- **DevTools Detection**: Warns when developer tools are opened

### Data Security
- **Row Level Security (RLS)**: Database-level access control
- **Server-Side Validation**: All submissions validated on server
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Secure Authentication**: Supabase Auth with JWT tokens
- **Role-Based Access**: Granular permissions system
- **API Rate Limiting**: Prevents abuse and DDoS
- **CORS Configuration**: Strict origin policies
- **SQL Injection Prevention**: Parameterized queries

### Privacy & Compliance
- **GDPR Compliant**: User data management and deletion
- **Data Encryption**: End-to-end encryption for sensitive data
- **Audit Logs**: Complete activity tracking
- **Access Controls**: Multi-level permission system
- **Data Backup**: Automated backups and recovery
- **Anonymous Submissions**: Support for anonymous exam taking

---

## 📊 Database Schema

### Core Tables

#### profiles
User accounts and subscription information
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  institution TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_plan TEXT,
  subscription_end_date TIMESTAMPTZ,
  role TEXT DEFAULT 'tutor',
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### exams
Exam definitions and settings
```sql
CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  required_fields TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_kids_mode BOOLEAN DEFAULT false,
  is_test BOOLEAN DEFAULT false,
  tutorial_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### questions
Exam questions with various types
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple-choice', 'true-false', 'short-answer', 'numeric', 'dropdown', 'multiple-select')),
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT,
  points INTEGER DEFAULT 1,
  randomize_options BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### submissions
Student exam submissions
```sql
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  student_name TEXT,
  student_email TEXT,
  student_fields JSONB DEFAULT '{}',
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  percentage NUMERIC(5,2),
  violations JSONB DEFAULT '[]',
  time_taken INTEGER,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### submission_answers
Individual answers for each question
```sql
CREATE TABLE submission_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Admin & Support Tables

#### coupons
Discount and promotional codes
```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_trial')),
  discount_value NUMERIC,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### support_agents
Support team members
```sql
CREATE TABLE support_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### chat_sessions
Live chat conversations
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  user_name TEXT,
  user_email TEXT,
  assigned_agent_id UUID REFERENCES support_agents(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'closed')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

#### chat_messages
Chat message history
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  agent_id UUID REFERENCES support_agents(id),
  message TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### push_notifications
FCM notification history
```sql
CREATE TABLE push_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending'
);
```

### Sales Tables

#### sales_agents
Sales team members
```sql
CREATE TABLE sales_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sales_leads
Captured leads from sales team
```sql
CREATE TABLE sales_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES sales_agents(id),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  institution TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  notes TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sales_events
Activity tracking for sales
```sql
CREATE TABLE sales_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES sales_agents(id),
  lead_id UUID REFERENCES sales_leads(id),
  type TEXT NOT NULL CHECK (type IN ('login', 'lead_created', 'link_generated', 'conversion', 'note_added')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Question Bank & Analytics

#### question_banks
Reusable question collections
```sql
CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### question_bank_items
Individual questions in banks
```sql
CREATE TABLE question_bank_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
  question_data JSONB NOT NULL,
  difficulty_level TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### analytics_events
User activity tracking
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔌 API Documentation

### REST API Endpoints

#### Authentication
```http
POST /auth/signup          # Create new account
POST /auth/login           # User login
POST /auth/logout          # User logout
POST /auth/reset-password  # Password reset
GET  /auth/user            # Get current user
```

#### Exams
```http
GET    /api/exams               # List all exams
GET    /api/exams/:id           # Get exam details
POST   /api/exams               # Create new exam
PUT    /api/exams/:id           # Update exam
DELETE /api/exams/:id           # Delete exam
PATCH  /api/exams/:id/activate  # Activate/deactivate exam
```

#### Questions
```http
GET    /api/exams/:id/questions         # List exam questions
POST   /api/exams/:id/questions         # Add question
PUT    /api/questions/:id               # Update question
DELETE /api/questions/:id               # Delete question
POST   /api/questions/bulk              # Bulk import
```

#### Submissions
```http
GET  /api/exams/:id/submissions       # List submissions
POST /api/exams/:id/submit            # Submit exam
GET  /api/submissions/:id             # Get submission details
GET  /api/submissions/:id/export      # Export results
```

#### Admin
```http
GET    /api/admin/users              # List all users
GET    /api/admin/analytics          # System analytics
POST   /api/admin/coupons            # Create coupon
GET    /api/admin/coupons            # List coupons
DELETE /api/admin/coupons/:id        # Delete coupon
POST   /api/admin/notifications      # Send push notification
```

#### Chat
```http
GET    /api/chat/sessions            # List chat sessions
POST   /api/chat/sessions            # Create session
GET    /api/chat/sessions/:id        # Get session
POST   /api/chat/messages            # Send message
PATCH  /api/chat/sessions/:id/assign # Assign agent
PATCH  /api/chat/sessions/:id/rate   # Rate session
```

#### Sales
```http
POST /api/sales/login       # Sales agent login
GET  /api/sales/leads       # List leads
POST /api/sales/leads       # Create lead
PUT  /api/sales/leads/:id   # Update lead
GET  /api/sales/analytics   # Sales metrics
POST /api/sales/utm         # Generate UTM link
```

### Realtime Subscriptions

```typescript
// Subscribe to chat messages
supabase
  .channel('chat:session_id')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `session_id=eq.${sessionId}`
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();

// Subscribe to exam submissions
supabase
  .channel('submissions:exam_id')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'submissions',
    filter: `exam_id=eq.${examId}`
  }, (payload) => {
    console.log('New submission:', payload.new);
  })
  .subscribe();
```

### Edge Functions

#### grade-exam
Server-side grading function
```typescript
// Request
POST /functions/v1/grade-exam
{
  "submissionId": "uuid",
  "answers": [
    {
      "questionId": "uuid",
      "answer": "student answer"
    }
  ]
}

// Response
{
  "score": 85,
  "maxScore": 100,
  "percentage": 85.0,
  "results": [...]
}
```

---

## 🎨 Screenshots & Demo

### Tutor Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*Create and manage exams with comprehensive analytics*

### Exam Editor
![Editor](docs/screenshots/editor.png)
*Rich question editor supporting multiple question types*

### Student Exam View
![Exam View](docs/screenshots/exam-view.png)
*Clean, distraction-free exam-taking experience*

### Results & Analytics
![Results](docs/screenshots/results.png)
*Detailed analytics and exportable results*

### Admin Panel
*Full system administration and user management*

### Live Chat
*Real-time support chat with agent assignment*

### Sales Dashboard
*Lead tracking and performance analytics*

---

## 🧪 Testing

## 🧪 Testing

### Automated Testing

```bash
# Frontend unit tests
cd frontend
npm test

# Frontend E2E tests
npm run test:e2e

# Backend tests
cd backend
pytest

# Run with coverage
pytest --cov=. --cov-report=html
```

### Manual Testing Checklist

#### Exam Functionality
- [x] Create exam with all question types
- [x] Edit and update existing exams
- [x] Activate/deactivate exams
- [x] Delete exams and cascade deletion
- [x] Take exam as student
- [x] Verify scoring accuracy for all question types
- [x] Test time limits and auto-submission
- [x] Verify randomization of questions and options

#### Security & Anti-Cheating
- [x] Test fullscreen enforcement
- [x] Verify violation tracking system
- [x] Test tab switch detection
- [x] Verify copy/paste blocking
- [x] Test auto-submission after violations
- [x] Server-side answer validation

#### User Management
- [x] Test time-based access control
- [x] Verify mobile compatibility (iOS & Android)
- [x] Test offline submission queue
- [x] User registration and login
- [x] Password reset flow
- [x] Role-based access control
- [x] Subscription management

#### Admin Features
- [x] Live chat functionality
- [x] Chat agent assignment
- [x] Chat session management
- [x] Payment integration (Kashier)
- [x] Coupon creation and redemption
- [x] Admin panel features
- [x] User filtering and search
- [x] Push notifications

#### Sales Features
- [x] Sales page access and lead capture
- [x] UTM link generation
- [x] Sales analytics
- [x] Lead status management

#### Export & Analytics
- [x] Export results to Excel
- [x] Export results to PDF
- [x] Export results to Word
- [x] Exam-specific analytics
- [x] System-wide analytics

#### Kids Mode
- [x] Kids mode interface
- [x] Child-friendly navigation
- [x] Gamification elements

#### Mobile App
- [ ] Camera integration
- [ ] Biometric authentication
- [ ] Push notifications (mobile)
- [ ] Offline mode
- [ ] App store deployment

#### Performance
- [ ] Load testing with concurrent users
- [ ] Database query optimization
- [ ] API response time monitoring
- [ ] Realtime subscription scalability

---

## 🚢 Deployment

## 🚢 Deployment

### Frontend Deployment (Vercel - Recommended)

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_KASHIER_API_KEY (optional)
```

**Alternative: Netlify**
```bash
# Build
npm run build

# Deploy dist/ folder to Netlify
# Configure environment variables in Netlify dashboard
```

### Backend Deployment

#### Option 1: Supabase Edge Functions (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy grade-exam
supabase functions deploy send-email

# Set secrets
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set GEMINI_API_KEY=your-key
```

#### Option 2: FastAPI on Railway/Render

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up

# Add environment variables in Railway dashboard
```

**Render:**
1. Connect GitHub repository
2. Select "Web Service"
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Database Setup

1. **Supabase Project Setup**
   - Create project at [supabase.com](https://supabase.com)
   - Note project URL and API keys

2. **Run Migrations**
   ```sql
   -- Execute in Supabase SQL Editor in order:
   1. COMPLETE_ADMIN_SYSTEM_MIGRATION.sql
   2. FINAL_CHAT_SCHEMA.sql
   3. analytics_migration.sql
   4. enable_realtime.sql
   ```

3. **Enable Realtime**
   - Go to Database → Replication
   - Enable for: `chat_messages`, `chat_sessions`

4. **Configure Storage**
   - Create bucket: `exam-attachments`
   - Create bucket: `chat-files`
   - Set appropriate policies

### Mobile App Deployment

#### Android (Google Play)

```bash
cd frontend

# Build production app
npm run build:mobile

# Sync with Capacitor
npx cap sync android

# Open Android Studio
npx cap open android

# Build → Generate Signed Bundle/APK
# Upload to Google Play Console
```

#### iOS (App Store)

```bash
cd frontend

# Build production app
npm run build:mobile

# Sync with Capacitor
npx cap sync ios

# Open Xcode
npx cap open ios

# Product → Archive
# Submit to App Store Connect
```

### Environment Variables

#### Frontend (.env.production)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_KASHIER_API_KEY=your-kashier-key
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

#### Backend (.env)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
ANTHROPIC_API_KEY=your-claude-key
KASHIER_API_KEY=your-kashier-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test database connections
- [ ] Verify authentication flows
- [ ] Test payment integration
- [ ] Check realtime subscriptions
- [ ] Test email notifications
- [ ] Verify mobile app builds
- [ ] Configure custom domain (if applicable)
- [ ] Set up SSL certificates
- [ ] Configure CORS policies
- [ ] Enable monitoring and logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (Google Analytics)
- [ ] Test all API endpoints
- [ ] Verify file upload limits
- [ ] Check rate limiting
- [ ] Review security headers

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/your-username/durrah-exams.git
   cd durrah-exams
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Commit your changes**
   ```bash
   git add .
   git commit -m 'Add amazing feature'
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes

### Contribution Guidelines

- **Code Style**: Follow TypeScript/React best practices
- **Testing**: Add unit tests for new features
- **Documentation**: Update README and inline comments
- **Commits**: Use clear, descriptive commit messages
- **PRs**: Keep pull requests focused and atomic

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Test coverage
- 🌐 Translations
- ♿ Accessibility improvements
- ⚡ Performance optimizations

### Development Setup

See the [Quick Start](#-quick-start) section for development environment setup.

### Code of Conduct

Please be respectful and constructive in all interactions. We're building this together!

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Durrah Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 🙏 Acknowledgments

- **[Supabase](https://supabase.com)** - For the amazing backend-as-a-service platform
- **[Vercel](https://vercel.com)** - For seamless frontend hosting
- **[Lucide Icons](https://lucide.dev)** - For beautiful, consistent icons
- **[TailwindCSS](https://tailwindcss.com)** - For utility-first styling
- **[React Team](https://react.dev)** - For the incredible React framework
- **[Vite](https://vitejs.dev)** - For lightning-fast build tooling
- **[OpenAI](https://openai.com)** - For AI capabilities
- **[Capacitor](https://capacitorjs.com)** - For mobile app framework
- **Open Source Community** - For inspiration and contributions

---

## 📧 Support

### Get Help

- **📚 Documentation**: Check our comprehensive [docs](docs/)
- **💬 Community Chat**: Join our live support chat
- **🐛 Bug Reports**: [Open an issue](https://github.com/yourusername/durrah-exams/issues)
- **💡 Feature Requests**: [Submit your ideas](https://github.com/yourusername/durrah-exams/discussions)
- **📧 Email**: support@durrahexams.com
- **🌐 Website**: [www.durrahexams.com](https://www.durrahexams.com)

### FAQ

**Q: Is there a free tier?**
A: Yes! Free tier includes basic exam creation with limitations. See [FEATURE_COMPARISON.md](FEATURE_COMPARISON.md).

**Q: Can I self-host?**
A: Absolutely! Follow the deployment guide for self-hosting instructions.

**Q: What browsers are supported?**
A: All modern browsers (Chrome, Firefox, Safari, Edge). IE is not supported.

**Q: Is it mobile-friendly?**
A: Yes! Fully responsive web app + native iOS/Android apps.

**Q: How secure is the anti-cheating system?**
A: Multi-layered security including fullscreen enforcement, tab tracking, and server-side validation.

**Q: Can I export exam results?**
A: Yes! Export to Excel, PDF, and Word formats.

**Q: Is there an API?**
A: Yes! Full REST API and realtime subscriptions available.

---

## 🗺️ Roadmap

## 🗺️ Roadmap

### ✅ Completed (v1.0 - v3.0)
- [x] Core exam creation and management
- [x] Multiple question types support
- [x] Server-side grading system
- [x] Advanced analytics dashboard
- [x] Question bank management
- [x] Mobile app (Capacitor - iOS & Android)
- [x] Kids mode interface
- [x] Payment integration (Kashier)
- [x] Realtime support chat system
- [x] Sales team workspace
- [x] Admin panel with full management
- [x] Exam activation/deactivation
- [x] Multiple export formats (Excel, PDF, Word)
- [x] Live chat with agent assignment
- [x] Push notifications (Firebase FCM)
- [x] Anti-cheating measures
- [x] Multi-AI provider support (OpenAI, Gemini, Groq, Claude)
- [x] LaTeX math rendering
- [x] Offline submission queue
- [x] Tutorial mode for exams

### 🚧 In Progress (v3.1)
- [ ] Free vs Paid user restrictions and feature gating
- [ ] Advanced sales analytics and leaderboards
- [ ] Email notification system for exam results
- [ ] AI-powered proctoring with webcam monitoring
- [ ] Bulk exam operations (import/export/duplicate)
- [ ] Scheduled exam publishing
- [ ] Custom branding for tutors
- [ ] White-label solutions

### 📋 Planned (v3.2+)

#### Security & Monitoring
- [ ] Video recording during exams
- [ ] AI-based plagiarism detection
- [ ] Advanced behavior analytics
- [ ] Biometric authentication (enhanced)
- [ ] Screen recording review

#### Integration & Compatibility
- [ ] LMS integration (Moodle, Canvas, Blackboard)
- [ ] Google Classroom integration
- [ ] Microsoft Teams integration
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] SSO (Single Sign-On) support
- [ ] SCORM compliance

#### AI & Automation
- [ ] Advanced AI question generation from syllabi
- [ ] Automated question difficulty assessment
- [ ] Smart question recommendation
- [ ] Student performance predictions
- [ ] Adaptive testing (questions adjust to student level)
- [ ] Automated plagiarism detection
- [ ] AI essay grading

#### Collaboration & Social
- [ ] Collaborative exam editing
- [ ] Peer review system
- [ ] Student study groups
- [ ] Discussion forums
- [ ] Public question marketplace
- [ ] Tutor networking

#### Advanced Features
- [ ] Live proctoring with human proctors
- [ ] Oral exams via video call
- [ ] Gamification system (badges, achievements)
- [ ] Student portfolio system
- [ ] Certification generation
- [ ] QR code-based exam access
- [ ] Blockchain certificates
- [ ] Virtual exam halls (metaverse)

#### Analytics & Insights
- [ ] Predictive analytics
- [ ] Learning path recommendations
- [ ] Comparative analytics (benchmarking)
- [ ] Heat maps for question difficulty
- [ ] Student engagement scoring
- [ ] Institutional dashboards

#### Mobile & Accessibility
- [ ] Offline-first mobile app
- [ ] Dark mode (system-wide)
- [ ] High contrast mode
- [ ] Screen reader optimization
- [ ] Multi-language support (i18n)
- [ ] RTL language support

#### Business Features
- [ ] Multi-tenant architecture
- [ ] API marketplace
- [ ] Affiliate program
- [ ] Reseller program
- [ ] Enterprise plans
- [ ] Custom SLAs

---

## 📊 Project Status

**Current Version**: 3.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: January 2026  
**Active Development**: 🟢 Yes  
**Contributors**: Durrah Team  
**License**: MIT  

### Statistics
- **Total Features**: 100+
- **Supported Question Types**: 6
- **Mobile Platforms**: iOS, Android, Web
- **AI Providers**: 4 (OpenAI, Gemini, Groq, Claude)
- **Export Formats**: 3 (Excel, PDF, Word)
- **Database Tables**: 20+
- **API Endpoints**: 50+
- **Lines of Code**: ~50,000+

### Technology Stack Summary
- **Frontend**: React 19.2 + TypeScript + Vite 7.2
- **Backend**: Supabase + FastAPI (Python)
- **Database**: PostgreSQL (Supabase)
- **Mobile**: Capacitor 8
- **Styling**: TailwindCSS
- **AI**: OpenAI, Gemini, Groq, Claude
- **Payments**: Kashier
- **Notifications**: Firebase Cloud Messaging
- **Hosting**: Vercel (Frontend), Railway/Render (Backend)

---

## 🌟 Why Choose Durrah Exams?

### For Tutors
✅ **Easy to Use**: Intuitive interface, no technical skills required  
✅ **Comprehensive**: All question types, analytics, and export options  
✅ **Secure**: Advanced anti-cheating and server-side grading  
✅ **Flexible**: Kids mode, tutorial mode, custom fields  
✅ **AI-Powered**: Generate questions automatically  

### For Students
✅ **User-Friendly**: Clean interface, mobile-friendly  
✅ **Fair**: Server-side grading prevents manipulation  
✅ **Accessible**: Take exams anywhere, anytime  
✅ **Engaging**: Kids mode with gamification  

### For Institutions
✅ **Scalable**: Handle thousands of concurrent users  
✅ **Analytics**: Detailed insights and reporting  
✅ **Support**: Live chat and dedicated support team  
✅ **Customizable**: White-label and custom branding options  
✅ **Cost-Effective**: Competitive pricing, free tier available  

---

## 🔗 Quick Links

- 🌐 **Website**: [www.durrahexams.com](https://www.durrahexams.com)
- 📱 **iOS App**: [App Store](https://apps.apple.com)
- 🤖 **Android App**: [Google Play](https://play.google.com)
- 📚 **Documentation**: [docs.durrahexams.com](https://docs.durrahexams.com)
- 💬 **Community**: [Discord](https://discord.gg/durrah)
- 🐦 **Twitter**: [@DurrahExams](https://twitter.com/durrahexams)
- 💼 **LinkedIn**: [Durrah Exams](https://linkedin.com/company/durrah)

---

<div align="center">

**Made with ❤️ by the Durrah Team**

⭐ **Star us on GitHub!** It helps us grow and improve.

[Report Bug](https://github.com/yourusername/durrah-exams/issues) · [Request Feature](https://github.com/yourusername/durrah-exams/discussions) · [Documentation](docs/)

---

© 2026 Durrah Team. All rights reserved.

</div>
