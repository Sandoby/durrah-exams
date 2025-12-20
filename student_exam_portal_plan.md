# Student Exam Portal Redesign Plan

## Overview
Redesign the Exam View page to function as a unified Student Portal and Examination Page. This new page will:
- Allow students to enter a code to access exams created by tutors.
- Show a dashboard of previous exams, scores, and tutor names.
- Require student sign-up (email, password, full name, plus optional tutor-defined fields).
- Prevent students from retaking the same exam after submission.
- Retain the current examination system for the exam-taking experience.

## Features & Flow

### 1. Student Sign-Up & Login
- **Fields:**
  - Email (required)
  - Password (required)
  - Full Name (required)
  - Optional fields (ID number, phone, etc. — defined by tutor per exam)
- **Flow:**
  - New students register with required and optional fields.
  - Returning students log in with email and password.

### 2. Exam Code Entry
- **Input:**
  - Field to paste/enter the exam code provided by the tutor.
- **Validation:**
  - Check if the code is valid and if the exam is available.
  - If already submitted, show a message and block re-entry.

### 3. Student Dashboard
- **Display:**
  - List of previous exams taken by the student.
  - For each exam: exam title, tutor name, date taken, score/result.
  - Status: Completed, In Progress, Not Started.
- **Actions:**
  - Enter new exam code.
  - View details of previous exams (read-only, no retake).

### 4. Exam Access & Attempt
- **Access:**
  - After entering a valid code, student is taken to the exam page.
  - If the exam requires additional fields (ID, phone), prompt before starting.
- **Attempt:**
  - Use the existing examination system for question display, navigation, and submission.
  - On submission, mark the exam as completed for the student.
  - Prevent further attempts for the same exam.

### 5. Tutor-Defined Fields
- **Configuration:**
  - Tutors can specify optional fields required for their exam (e.g., ID number, phone).
- **Student Experience:**
  - These fields appear on the sign-up or pre-exam form as needed.

### 6. Security & Restrictions
- **No Retake:**
  - Once submitted, the student cannot re-enter or retake the same exam.
- **Authentication:**
  - All exam access and dashboard features require login.
- **Data Privacy:**
  - Student data is only visible to the student and relevant tutor.

## UI/UX Considerations
- Clean, student-friendly dashboard layout.
- Prominent exam code entry field.
- Clear status indicators for each exam.
- Responsive design for mobile and desktop.
- Error messages for invalid codes, duplicate attempts, or missing required fields.

## Implementation Steps
1. **Design new Student Portal page:** Dashboard, code entry, previous exams list.
2. **Update authentication:** Add required/optional fields to sign-up and pre-exam forms.
3. **Exam code validation:** Link code entry to exam lookup and access control.
4. **Dashboard logic:** Fetch and display previous exams, scores, and tutor info.
5. **Exam access control:** Block retakes, enforce required fields, and integrate with current exam system.
6. **UI/UX polish:** Ensure clarity, accessibility, and mobile support.
7. **Testing:** Validate all flows, edge cases, and security restrictions.

## Notes
- The actual exam-taking experience (question navigation, submission, etc.) remains unchanged.
- This redesign focuses on the student-facing experience and access control.
- Tutor dashboard and exam creation remain as-is, except for optional field configuration.
