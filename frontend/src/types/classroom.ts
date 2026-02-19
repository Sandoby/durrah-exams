export interface Classroom {
  id: string;
  tutor_id: string;
  name: string;
  description: string;
  subject: string;
  grade_level: string;
  cover_image: string | null;
  color: string;
  invite_code: string;
  academic_year: string;
  is_archived: boolean;
  settings: ClassroomSettings;
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClassroomSettings {
  auto_approve_students: boolean;
  max_capacity: number;
  allow_student_chat: boolean;
  show_student_list_to_students: boolean;
}

export interface ClassroomStudent {
  id: string;
  classroom_id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'pending' | 'suspended' | 'removed';
  enrollment_method: 'invite_code' | 'manual' | 'link' | 'csv_import';
  notes: string;
  // Joined from profiles:
  profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    grade_level: string | null;
    school_name: string | null;
  };
}

export interface ClassroomExam {
  id: string;
  classroom_id: string;
  exam_id: string;
  added_at: string;
  // Joined from exams:
  exam?: {
    title: string;
    description: string;
    is_active: boolean;
    created_at: string;
  };
}

export type ClassroomTab = 'overview' | 'roster' | 'exams' | 'settings';

export interface ClassroomFormData {
  name: string;
  description?: string;
  subject?: string;
  grade_level?: string;
  color: string;
  academic_year?: string;
  settings: ClassroomSettings;
}

export interface BulkImportRow {
  name: string;
  email: string;
  parent_email?: string;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export interface JoinResult {
  success: boolean;
  classroom?: {
    id: string;
    name: string;
    subject: string;
  };
  status?: 'active' | 'pending';
  message?: string;
}

export interface ClassroomPreview {
  id: string;
  name: string;
  subject: string;
  grade_level: string;
  academic_year?: string;
  description?: string;
  color?: string;
  invite_code?: string;
  tutor_name: string;
  student_count: number;
  settings?: ClassroomSettings;
}

export interface ClassroomStats {
  total_students: number;
  active_students: number;
  pending_students: number;
  linked_exams: number;
  total_exams: number;
  total_submissions: number;
  avg_score_percent: number;
}

export const CLASSROOM_COLORS = [
  { value: '#3B82F6', name: 'Blue' },
  { value: '#10B981', name: 'Green' },
  { value: '#F59E0B', name: 'Amber' },
  { value: '#EF4444', name: 'Red' },
  { value: '#8B5CF6', name: 'Purple' },
  { value: '#EC4899', name: 'Pink' },
  { value: '#06B6D4', name: 'Cyan' },
  { value: '#F97316', name: 'Orange' },
  { value: '#6366F1', name: 'Indigo' },
  { value: '#14B8A6', name: 'Teal' },
];
