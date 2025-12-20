import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';


import { supabase } from '../lib/supabase';

// Fetch previous exams for a student (by user id or email)
const fetchPreviousExams = async (user: any) => {
  if (!user) return [];
  // Try to use user.id or user.email
  const { data, error } = await supabase
    .from('submissions')
    .select('id, exam_id, exam:title, score, created_at, exam(title, tutor_id), tutor:exam(tutor_id), student_name, student_email')
    .or(`student_email.eq.${user.email},student_name.eq.${user.user_metadata?.full_name || ''}`)
    .order('created_at', { ascending: false });
  if (error) return [];
  // Map to displayable format
  return (data || []).map((s: any) => ({
    title: s.exam?.title || 'Exam',
    tutorName: s.tutor?.tutor_id || '',
    score: s.score,
    date: s.created_at ? new Date(s.created_at).toLocaleDateString() : '',
  }));
};

// Validate exam code: check if an active, non-kids exam exists with this code
const validateExamCode = async (code: string) => {
  if (!code) return { valid: false };
  // Find exam with this quiz_code, not kids mode, is_active
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('quiz_code', code.trim())
    .eq('is_active', true)
    .single();
  if (error || !data) return { valid: false };
  if (data.settings?.child_mode_enabled) return { valid: false };
  return { valid: true, exam: data, requiresFields: data.required_fields || [] };
};

export default function StudentPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch previous exams on mount (if logged in)
  useEffect(() => {
    if (user) {
      fetchPreviousExams(user).then(setPreviousExams);
    }
    // Listen for exam submission event to refresh history
    const handler = () => {
      if (user) fetchPreviousExams(user).then(setPreviousExams);
    };
    window.addEventListener('durrah_exam_submitted', handler);
    return () => window.removeEventListener('durrah_exam_submitted', handler);
  }, [user]);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await validateExamCode(code.trim());
    setLoading(false);
    if (result.valid && result.exam) {
      // Save portal access flag for ExamView
      sessionStorage.setItem('durrah_exam_portal_access', '1');
      // If extra fields required, prompt for them (future: modal/form), else go to exam
      navigate(`/exam/${result.exam.id}`);
    } else if (result.exam && result.exam.settings?.child_mode_enabled) {
      alert(t('This code is for a kids exam. Please use the kids portal.'));
    } else {
      alert(t('Invalid or unavailable exam code.'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">{t('Student Exam Portal')}</h1>
        <form onSubmit={handleCodeSubmit} className="flex gap-2 mb-6">
          <input
            className="flex-1 border rounded-lg px-4 py-2"
            placeholder={t('Enter exam code')}
            value={code}
            onChange={e => setCode(e.target.value)}
            required
          />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg" disabled={loading}>
            {loading ? t('Loading...') : t('Start Exam')}
          </button>
        </form>
        <h2 className="text-lg font-semibold mb-2">{t('Previous Exams')}</h2>
        <div className="space-y-2">
          {previousExams.length === 0 ? (
            <div className="text-gray-500">{t('No previous exams found.')}</div>
          ) : (
            previousExams.map((exam, idx) => (
              <div key={idx} className="border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold">{exam.title}</div>
                  <div className="text-sm text-gray-500">{t('Tutor')}: {exam.tutorName}</div>
                  <div className="text-sm text-gray-500">{t('Score')}: {exam.score ?? t('N/A')}</div>
                </div>
                <div className="text-xs text-gray-400">{exam.date}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
