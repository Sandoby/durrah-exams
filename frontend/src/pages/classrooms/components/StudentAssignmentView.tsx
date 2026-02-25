import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, Send, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  due_date: string | null;
  max_score: number;
  allow_late: boolean;
  late_penalty_percent: number;
  is_published: boolean;
  created_at: string;
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
}

interface StudentAssignmentViewProps {
  assignmentId: string;
  classroomId: string;
  onClose: () => void;
}

export function StudentAssignmentView({ assignmentId, classroomId, onClose }: StudentAssignmentViewProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const loadAssignmentAndSubmission = useCallback(async () => {
    setLoading(true);
    try {
      // Load assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('classroom_assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData as Assignment);

      // Load student's existing submission if any
      if (user?.id) {
        const { data: submissionData } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .single();

        if (submissionData) {
          setSubmission(submissionData as Submission);
          setContent(submissionData.content || '');
        }
      }
    } catch (err) {
      console.error('Failed to load assignment:', err);
      toast.error(t('classrooms.detail.assignmentView.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [assignmentId, user?.id, t]);

  useEffect(() => {
    loadAssignmentAndSubmission();
  }, [loadAssignmentAndSubmission]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !assignment) return;

    if (!content.trim() && uploadedFiles.length === 0) {
      toast.error(t('classrooms.detail.assignmentView.requiresContent'));
      return;
    }

    setSubmitting(true);
    try {
      // Upload files to Supabase Storage if any
      const fileUrls: string[] = [];
      for (const file of uploadedFiles) {
        const filePath = `classrooms/${classroomId}/assignments/${assignmentId}/${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        fileUrls.push(urlData.publicUrl);
      }

      const isLate = assignment.due_date && new Date() > new Date(assignment.due_date);

      if (submission) {
        // Update existing submission
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            content,
            files: fileUrls.length > 0 ? fileUrls : submission.files,
            submitted_at: new Date().toISOString(),
            is_late: isLate || false,
          })
          .eq('id', submission.id);

        if (error) throw error;
        toast.success(t('classrooms.detail.assignmentView.updated'));
      } else {
        // Create new submission
        const { data: newSubmission, error } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            content,
            files: fileUrls,
            submitted_at: new Date().toISOString(),
            is_late: isLate || false,
          })
          .select()
          .single();

        if (error) throw error;
        setSubmission(newSubmission as Submission);
        toast.success(t('classrooms.detail.assignmentView.submitted'));
      }

      setUploadedFiles([]);
      loadAssignmentAndSubmission();
    } catch (err) {
      console.error('Failed to submit assignment:', err);
      toast.error(t('classrooms.detail.assignmentView.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmissionStatus = () => {
    if (!submission?.submitted_at) return null;
    if (submission.score !== null) {
      const percentage = Math.round((submission.score / (assignment?.max_score || 100)) * 100);
      return {
        status: 'graded',
        label: `Graded: ${submission.score}/${assignment?.max_score}`,
        color: percentage >= 70 ? 'text-green-600' : 'text-red-600',
        icon: CheckCircle,
      };
    }
    return {
      status: 'submitted',
      label: 'Submitted (Pending Grading)',
      color: 'text-blue-600',
      icon: CheckCircle,
    };
  };

  const getDueStatus = () => {
    if (!assignment?.due_date) return null;
    const now = new Date();
    const due = new Date(assignment.due_date);
    if (now > due && !submission?.submitted_at) {
      return { status: 'overdue', color: 'text-red-600' };
    }
    if (submission?.is_late) {
      return { status: 'late', color: 'text-orange-600' };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">{t('classrooms.detail.assignmentView.notFound')}</p>
      </div>
    );
  }

  const submissionStatus = getSubmissionStatus();
  const dueStatus = getDueStatus();

  return (
    <div className="space-y-6">
      {/* Assignment Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{assignment.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Category: <span className="font-medium">{assignment.category}</span> • Max Score: <span className="font-medium">{assignment.max_score}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {dueStatus && (
            <span className={`px-3 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 ${dueStatus.color}`}>
              {dueStatus.status === 'overdue' ? '🔴 Overdue' : '🟠 Late Submission'}
            </span>
          )}
          {submissionStatus && (
            <span className={`px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 ${submissionStatus.color}`}>
              {submissionStatus.label}
            </span>
          )}
        </div>

        {/* Due Date */}
        {assignment.due_date && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Clock className="w-4 h-4" />
            Due: {new Date(assignment.due_date).toLocaleDateString()} at {new Date(assignment.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Description */}
        {assignment.description && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">{assignment.description}</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Instructions</h3>
        <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assignment.instructions}</div>
      </div>

      {/* Submission Form or Graded View */}
      {submission?.score !== null ? (
        // Show graded submission
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Graded</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Graded on {new Date(submission.graded_at!).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {submission.score}/{assignment.max_score}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ({Math.round((submission.score / assignment.max_score) * 100)}%)
            </p>
          </div>

          {submission.feedback && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Teacher Feedback</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{submission.feedback}</p>
            </div>
          )}

          {submission.content && (
            <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Your Submission</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{submission.content}</p>
            </div>
          )}
        </div>
      ) : (
        // Show submission form
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Answer / Work
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your answer here..."
              rows={6}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Files (Optional)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400"
            />
            {uploadedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Submitting...' : submission ? 'Update Submission' : 'Submit Assignment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
