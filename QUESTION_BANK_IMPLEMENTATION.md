# Question Bank Feature Implementation

## Overview
A comprehensive question bank system has been added to the examination platform, allowing tutors to:
- Create and manage question banks
- Import questions from PDF/Word documents using AI
- Import random questions from banks into exams

## Files Created

### 1. `frontend/src/pages/QuestionBank.tsx`
Complete question bank management interface with:
- Create new question banks
- Import questions from PDF/DOC/DOCX/TXT files using OpenAI API
- View, search, and filter questions
- Delete banks and questions
- Export banks to JSON
- AI-powered question extraction

### 2. `question_banks_migration.sql`
Database schema with:
- `question_banks` table: stores bank metadata (id, tutor_id, name, description)
- `question_bank_questions` table: stores questions (id, bank_id, type, question_text, options, correct_answer, points, difficulty, category, tags)
- Row-Level Security (RLS) policies for multi-tenant isolation
- Indexes for performance
- Cascade deletes for data integrity

## Files Modified

### 3. `frontend/src/App.tsx`
- Added QuestionBank import
- Added `/question-bank` route

### 4. `frontend/src/pages/Dashboard.tsx`
- Added BookOpen icon import
- Added "Question Bank" button next to "Create New Exam"
- Links to `/question-bank` route

### 5. `frontend/src/pages/ExamEditor.tsx`
- Added "Import from Bank" button in questions section
- Import modal to select multiple banks
- Random question selection from selected banks
- Appends imported questions to exam

### 6. Translation Files
Updated all language files with "Question Bank" translation:
- `frontend/src/locales/en/translation.json`: "Question Bank"
- `frontend/src/locales/ar/translation.json`: "بنك الأسئلة"
- `frontend/src/locales/fr/translation.json`: "Banque de Questions"
- `frontend/src/locales/es/translation.json`: "Banco de Preguntas"

## Features Implemented

### Question Bank Page
1. **Bank Management**
   - List all question banks with question counts
   - Create new banks with name and description
   - Delete banks (with confirmation)
   - Export banks to JSON

2. **Question Import (AI-Powered)**
   - Upload PDF, DOC, DOCX, or TXT files
   - OpenAI GPT-4o-mini extracts questions automatically
   - Supports: multiple choice, multiple select, true/false, dropdown, numeric, short answer
   - API key stored in localStorage (secure, user-managed)

3. **Question Management**
   - View all questions in selected bank
   - Search questions by text
   - Color-coded difficulty badges (easy/medium/hard)
   - Delete individual questions
   - View question details (type, points, category, tags)

### Exam Editor Enhancement
1. **Import from Banks**
   - "Import from Bank" button next to "Add Question"
   - Select one or multiple question banks
   - Specify number of random questions to import
   - Questions automatically added to exam

### Dashboard Integration
- "Question Bank" button prominently displayed
- Consistent styling with "Create New Exam" button
- Multi-language support

## Database Setup Instructions

**IMPORTANT**: You must run the database migration before using this feature.

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `question_banks_migration.sql`
4. Paste and execute in SQL Editor
5. Verify tables are created:
   - `question_banks`
   - `question_bank_questions`

## AI API Setup

You have two options to configure the OpenAI API key:

### Option 1: Environment Variable (Recommended for Deployment)
1. Create/edit `frontend/.env.local` file
2. Add: `VITE_OPENAI_API_KEY=your_api_key_here`
3. Restart the development server

### Option 2: In-App Settings (User-Specific)
1. Open the Question Bank page in your app
2. Click the "Settings" icon (⚙️)
3. Paste your API key and save
4. Key is stored locally in browser (not in database)

**Note**: The app will use the environment variable as default, but users can override it with their own key in-app settings.

**Current API Key**: Already configured in `frontend/.env.local` (not tracked in Git)

## Usage Workflow

### Creating a Question Bank
1. Navigate to Dashboard → Click "Question Bank"
2. Click "Create New Bank"
3. Enter name and description
4. Click "Create"

### Importing Questions via AI
1. Select a question bank
2. Click "Import Questions"
3. Enter your OpenAI API key (first time only)
4. Upload PDF or Word document
5. AI extracts questions automatically
6. Review and confirm imported questions

### Using Questions in Exam
1. Create/edit an exam in Exam Editor
2. In Questions section, click "Import from Bank"
3. Select one or more question banks
4. Enter number of random questions to import
5. Click "Import Questions"
6. Questions are added to your exam

## Technical Details

### AI Model
- Model: `gpt-4o-mini`
- Temperature: 0.3 (for consistent extraction)
- Prompt instructs structured JSON output

### Question Types Supported
- `multiple_choice`: Single correct answer
- `multiple_select`: Multiple correct answers
- `true_false`: Boolean answer
- `dropdown`: Select from dropdown
- `numeric`: Numerical answer
- `short_answer`: Text answer

### Security
- Row-Level Security ensures tutors only access their own banks
- API keys stored in browser localStorage (not server)
- Cascade deletes prevent orphaned questions

### Performance
- Indexes on `tutor_id`, `bank_id`, `difficulty`, `category`
- Efficient JOIN queries for question counts
- Client-side search filtering

## Next Steps

1. **Run the database migration** (`question_banks_migration.sql`)
2. **Build the frontend**: `cd frontend && npm run build`
3. **Test the feature**:
   - Create a question bank
   - Import questions from a PDF
   - Create an exam and import questions from bank
4. **Deploy**: Push to GitHub and deploy

## Notes

- The AI extraction works best with well-formatted documents
- Ensure questions in PDFs have clear structure (question, options, answer)
- Multiple question banks can be selected for import in exam editor
- Random selection ensures variety in exams
- Questions are copied (not moved) when imported into exams

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migration ran successfully
3. Confirm OpenAI API key is valid and has credits
4. Check Supabase logs for RLS policy issues
