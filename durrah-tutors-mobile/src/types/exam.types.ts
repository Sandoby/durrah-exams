export interface Exam {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  tutor_id: string;
  settings?: ExamSettings;
  required_fields?: string[];
  questions?: Question[];
}

export interface ExamSettings {
  time_limit_minutes?: number | null;
  randomize_questions?: boolean;
  show_results_immediately?: boolean;
  require_fullscreen?: boolean;
  detect_tab_switch?: boolean;
  disable_copy_paste?: boolean;
  max_violations?: number;
  start_date?: string | null;
  end_date?: string | null;
  restrict_by_email?: boolean;
  allowed_emails?: string[];
}

export interface Question {
  id: string;
  exam_id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'numeric' | 'dropdown' | 'multiple_select';
  question_text: string;
  options?: string[];
  correct_answer: string | string[];
  points: number;
  randomize_options: boolean;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name?: string;
  student_email?: string;
  student_id?: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  time_spent_seconds?: number;
  answers: any;
  violations?: any[];
  flagged: boolean;
}
