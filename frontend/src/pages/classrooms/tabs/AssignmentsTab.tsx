import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Trash2, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import toast from 'react-hot-toast';
import { notifyClassroomStudents } from '../../../lib/notificationsService';

interface Assignment {
  id: string;
  classroom_id: string;
  title: string;
  description: string;
  instructions: string;
  category: 'homework' | 'project' | 'quiz' | 'midterm' | 'final';
  due_date: string | null;
  max_score: number;
  allow_late: boolean;
  late_penalty_percent: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  submission_count?: number;
  graded_count?: number;
}

interface AssignmentsTabProps {
  classroomId: string;
  isTutor: boolean;
}

export function AssignmentsTab({ classroomId, isTutor }: AssignmentsTabProps) {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    category: 'homework' as const,
    due_date: '',
    max_score: 100,
    allow_late: true,
    late_penalty_percent: 10,
  });

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const query = isTutor
        ? supabase
            .from('classroom_assignments')
            .select('*')
            .eq('classroom_id', classroomId)
            .order('created_at', { ascending: false })
        : supabase
            .from('classroom_assignments')
            .select('*')
            .eq('classroom_id', classroomId)
            .eq('is_published', true)
            .order('due_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        // Load submission counts for each assignment
        const assignmentsWithCounts = await Promise.all(
          (data as Assignment[]).map(async (assignment) => {
            const { count: totalSubmissions } = await supabase
              .from('assignment_submissions')
              .select('id', { count: 'exact', head: true })
              .eq('assignment_id', assignment.id);

            const { count: gradedSubmissions } = await supabase
              .from('assignment_submissions')
              .select('id', { count: 'exact', head: true })
              .eq('assignment_id', assignment.id)
              .not('score', 'is', null);

            return {
              ...assignment,
              submission_count: totalSubmissions || 0,
              graded_count: gradedSubmissions || 0,
            };
          })
        );

        setAssignments(assignmentsWithCounts);
      }
    } catch (err) {
      console.error('Failed to load assignments:', err);
      toast.error(t('classrooms.detail.assignmentsTab.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [classroomId, isTutor, t]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.instructions.trim()) {
      toast.error(t('classrooms.detail.assignmentsTab.fillRequired'));
      return;
    }

    setCreating(true);
    try {
      const { data: newAssignment, error } = await supabase
        .from('classroom_assignments')
        .insert({
          classroom_id: classroomId,
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          category: formData.category,
          due_date: formData.due_date || null,
          max_score: formData.max_score,
          allow_late: formData.allow_late,
          late_penalty_percent: formData.late_penalty_percent,
          is_published: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications
      await notifyClassroomStudents(classroomId, {
        type: 'assignment',
        title: `New Assignment: ${formData.title}`,
        message: `A new assignment "${formData.title}" has been posted${formData.due_date ? ` (Due: ${new Date(formData.due_date).toLocaleDateString()})` : ''}`,
        relatedId: newAssignment?.id || classroomId,
      });

      toast.success(t('classrooms.detail.assignmentsTab.created'));
      setFormData({
        title: '',
        description: '',
        instructions: '',
        category: 'homework',
        due_date: '',
        max_score: 100,
        allow_late: true,
        late_penalty_percent: 10,
      });
      setShowCreateModal(false);
      loadAssignments();
    } catch (err) {
      console.error('Failed to create assignment:', err);
      toast.error(t('classrooms.detail.assignmentsTab.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from('classroom_assignments')
        .delete()
        .eq('id', confirmDelete);

      if (error) throw error;
      toast.success(t('classrooms.detail.assignmentsTab.deleted'));
      loadAssignments();
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      toast.error(t('classrooms.detail.assignmentsTab.deleteFailed'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const getDueStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return { status: 'overdue', label: 'Overdue', color: 'text-red-600 dark:text-red-400' };
    } else if (daysUntilDue <= 1) {
      return { status: 'urgent', label: `Due ${due.toLocaleDateString()}`, color: 'text-orange-600 dark:text-orange-400' };
    } else {
      return { status: 'normal', label: `Due ${due.toLocaleDateString()}`, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('classrooms.detail.assignmentsTab.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('classrooms.detail.assignmentsTab.description')}
            </p>
          </div>
          {isTutor && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('classrooms.detail.assignmentsTab.create')}
            </button>
          )}
        </div>

        {/* Assignments List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              {t('classrooms.detail.assignmentsTab.noAssignments')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isTutor
                ? t('classrooms.detail.assignmentsTab.createFirstAssignment')
                : t('classrooms.detail.assignmentsTab.noAssignmentsStudent')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const dueStatus = getDueStatus(assignment.due_date);
              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {assignment.title}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full">
                          {assignment.category}
                        </span>
                        {!assignment.is_published && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400 rounded-full">
                            Draft
                          </span>
                        )}
                      </div>

                      {assignment.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>Max Score: {assignment.max_score}</span>
                        </div>

                        {dueStatus && (
                          <div className={`flex items-center gap-1 font-medium ${dueStatus.color}`}>
                            {dueStatus.status === 'overdue' ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>{dueStatus.label}</span>
                          </div>
                        )}

                        {isTutor && (
                          <div className="text-gray-600 dark:text-gray-400">
                            {assignment.graded_count}/{assignment.submission_count} graded
                          </div>
                        )}
                      </div>
                    </div>

                    {isTutor && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            // TODO: navigate to grading view for this assignment
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Submissions"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(assignment.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('classrooms.detail.assignmentsTab.createAssignment')}
              </h2>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.detail.assignmentsTab.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Assignment title..."
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.detail.assignmentsTab.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.detail.assignmentsTab.instructions')} *
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  placeholder="Detailed instructions for students..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('classrooms.detail.assignmentsTab.category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="homework">Homework</option>
                    <option value="project">Project</option>
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm</option>
                    <option value="final">Final</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('classrooms.detail.assignmentsTab.dueDate')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('classrooms.detail.assignmentsTab.maxScore')}
                  </label>
                  <input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                    min="1"
                    max="1000"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('classrooms.detail.assignmentsTab.latePenalty')}
                  </label>
                  <input
                    type="number"
                    value={formData.late_penalty_percent}
                    onChange={(e) => setFormData({ ...formData, late_penalty_percent: parseInt(e.target.value) || 10 })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_late}
                  onChange={(e) => setFormData({ ...formData, allow_late: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t('classrooms.detail.assignmentsTab.allowLate')}
                </span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? t('classrooms.detail.assignmentsTab.creating') : t('classrooms.detail.assignmentsTab.create')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  {t('classrooms.detail.assignmentsTab.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        title={t('classrooms.detail.assignmentsTab.deleteTitle')}
        message={t('classrooms.detail.assignmentsTab.deleteConfirm')}
        confirmLabel={t('classrooms.detail.assignmentsTab.delete')}
        variant="danger"
        onConfirm={handleDeleteAssignment}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
