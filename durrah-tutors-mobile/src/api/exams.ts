import { supabase } from './supabase';

export interface Exam {
  id: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
  tutor_id: string;
  settings?: any;
  required_fields?: string[];
}

export const examApi = {
  // Fetch all exams for current tutor
  async getExams(tutorId: string): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('tutor_id', tutorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get single exam by ID
  async getExamById(examId: string): Promise<Exam | null> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (error) throw error;
    return data;
  },

  // Create new exam
  async createExam(examData: Partial<Exam>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update exam
  async updateExam(examId: string, updates: Partial<Exam>): Promise<Exam> {
    const { data, error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', examId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete exam
  async deleteExam(examId: string): Promise<void> {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) throw error;
  },

  // Get exam submissions/results
  async getSubmissions(examId: string) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('exam_id', examId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
