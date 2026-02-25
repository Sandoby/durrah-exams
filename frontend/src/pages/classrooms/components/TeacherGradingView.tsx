import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Check, Loader2, Download } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { notifyUser } from '../../../lib/notificationsService';
import toast from 'react-hot-toast';

interface Assignment {
  id: string;
  title: string;
  max_score: number;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  files: string[];
  score: number | null;
  feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  is_late: boolean;
  student?: {
    full_name: string;
    email: string;
  };
}

interface TeacherGradingViewProps {
  assignmentId: string;
  onClose: () => void;
}

export function TeacherGradingView({ assignmentId }: TeacherGradingViewProps) {
  const { t } = useTranslation();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  const loadAssignmentAndSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      // Load assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('classroom_assignments')
        .select('id, title, max_score')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData as Assignment);

      // Load all submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, content, files, score, feedback, submitted_at, graded_at, is_late')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch student profiles
      const studentIds = [...new Set((submissionsData || []).map(s => s.student_id))];
      let studentProfiles: Record<string, any> = {};

      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds);

        if (profiles) {
          studentProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      const formattedSubmissions = (submissionsData || []).map((sub: any) => ({
        ...sub,
        student: studentProfiles[sub.student_id] || null,
      }));
      setSubmissions(formattedSubmissions as Submission[]);
    } catch (err) {
      console.error('Failed to load assignment:', err);
      toast.error(t('classrooms.detail.gradingView.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, t]);

  useEffect(() => {
    loadAssignmentAndSubmissions();
  }, [loadAssignmentAndSubmissions]);

  useEffect(() => {
    if (selectedSubmission) {
      setGradeForm({
        score: selectedSubmission.score?.toString() || '',
        feedback: selectedSubmission.feedback || '',
      });
    }
  }, [selectedSubmission]);

  const handleGradeSubmit = async () => {
    if (!selectedSubmission || !gradeForm.score) {
      toast.error(t('classrooms.detail.gradingView.scoreMissing'));
      return;
    }

    const score = parseFloat(gradeForm.score);
    if (isNaN(score) || score < 0 || score > (assignment?.max_score || 100)) {
      toast.error(t('classrooms.detail.gradingView.invalidScore'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          score,
          feedback: gradeForm.feedback,
          graded_at: new Date().toISOString(),
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      // Notify student that their work has been graded
      await notifyUser(selectedSubmission.student_id, {
        type: 'grade',
        title: `${assignment?.title} - Graded`,
        message: `Your submission received a score of ${score}/${assignment?.max_score}`,
        classroomId: '',
        relatedId: assignmentId,
      });

      toast.success(t('classrooms.detail.gradingView.gradeSaved'));
      loadAssignmentAndSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      console.error('Failed to save grade:', err);
      toast.error(t('classrooms.detail.gradingView.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Submissions List */}
      <div className="col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submissions ({submissions.length})</h3>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {submissions.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('classrooms.detail.gradingView.noSubmissions')}</p>
          ) : (
            submissions.map((submission) => (
              <button
                key={submission.id}
                onClick={() => setSelectedSubmission(submission)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedSubmission?.id === submission.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }`}
              >
                <div className="font-medium text-sm">{submission.student?.full_name || 'Unknown'}</div>
                <div className="text-xs mt-1 opacity-75">
                  {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'Not submitted'}
                </div>
                {submission.score !== null && (
                  <div className="text-xs mt-1 opacity-75">
                    Score: {submission.score}/{assignment?.max_score}
                  </div>
                )}
                {submission.is_late && (
                  <div className="text-xs mt-1 text-orange-400">⚠️ Late Submission</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Grading Panel */}
      <div className="col-span-1 lg:col-span-2">
        {selectedSubmission ? (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {selectedSubmission.student?.full_name || 'Unknown Student'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSubmission.student?.email}</p>
              {selectedSubmission.submitted_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Submitted: {new Date(selectedSubmission.submitted_at).toLocaleDateString()} at{' '}
                  {new Date(selectedSubmission.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {selectedSubmission.is_late && (
                <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">⚠️ This submission is late</p>
              )}
            </div>

            {/* Submission Content */}
            {selectedSubmission.content && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Student's Answer</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {selectedSubmission.content}
                </div>
              </div>
            )}

            {/* Submitted Files */}
            {selectedSubmission.files && selectedSubmission.files.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Submitted Files</h4>
                <div className="space-y-2">
                  {selectedSubmission.files.map((fileUrl, idx) => (
                    <a
                      key={idx}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm truncate">File {idx + 1}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Grading Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Grade This Submission</h4>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Score (out of {assignment?.max_score}) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={assignment?.max_score || 100}
                  step="0.5"
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm({ ...gradeForm, score: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter score"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feedback
                </label>
                <textarea
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Provide feedback for the student..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleGradeSubmit}
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Grade'}
                </button>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">{t('classrooms.detail.gradingView.selectSubmission')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
