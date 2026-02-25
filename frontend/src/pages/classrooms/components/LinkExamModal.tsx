import { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, Search, Link as LinkIcon, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface AvailableExam {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface LinkExamModalProps {
  classroomId: string;
  onClose: () => void;
  onLinked: () => void;
}

export function LinkExamModal({ classroomId, onClose, onLinked }: LinkExamModalProps) {
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAvailableExams();
  }, [classroomId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const loadAvailableExams = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get already-linked exam IDs
      const { data: linked } = await supabase
        .from('classroom_exams')
        .select('exam_id')
        .eq('classroom_id', classroomId);

      const linkedIds = (linked || []).map((l: { exam_id: string }) => l.exam_id);

      // Get tutor's exams not yet linked
      const { data: exams, error } = await supabase
        .from('exams')
        .select('id, title, description, created_at')
        .eq('tutor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableExams((exams || []).filter((e: AvailableExam) => !linkedIds.includes(e.id)));
    } catch {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const linkExam = async (examId: string) => {
    setLinking(examId);
    try {
      const { error } = await supabase
        .from('classroom_exams')
        .insert({ classroom_id: classroomId, exam_id: examId });
      if (error) throw error;
      toast.success('Exam linked to classroom');
      onLinked();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message || 'Failed to link exam');
    } finally {
      setLinking(null);
    }
  };

  const filtered = availableExams.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Link Exam to Classroom</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select an exam from your library to assign
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!loading && availableExams.length > 0 && (
          <div className="px-6 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exams..."
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : availableExams.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No exams available to link</p>
              <Link
                to="/dashboard"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Exam
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                No exams match "<span className="font-medium">{search}</span>"
              </p>
            </div>
          ) : (
            filtered.map((exam) => (
              <button
                key={exam.id}
                onClick={() => linkExam(exam.id)}
                disabled={linking === exam.id}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {exam.title}
                      </h4>
                    </div>
                    {exam.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                        {exam.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(exam.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {linking === exam.id ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                  ) : (
                    <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
