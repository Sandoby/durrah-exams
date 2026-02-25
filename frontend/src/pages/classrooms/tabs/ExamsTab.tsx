import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Unlink, Calendar, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { LinkExamModal } from '../components/LinkExamModal';
import toast from 'react-hot-toast';
import type { ClassroomExam } from '../../../types/classroom';

interface ExamsTabProps {
  classroomId: string;
  onStatsChange: () => void;
}

export function ExamsTab({ classroomId, onStatsChange }: ExamsTabProps) {
  const { t } = useTranslation();
  const [exams, setExams] = useState<ClassroomExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<{ id: string; title: string } | null>(null);

  const loadExams = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('classroom_exams')
      .select(`
        id, classroom_id, exam_id, added_at, assigned_at, due_date, instructions,
        exam:exams(id, title, description, created_at)
      `)
      .eq('classroom_id', classroomId)
      .order('assigned_at', { ascending: false });

    if (data) {
      setExams(
        data.map((item: Record<string, unknown>) => ({
          ...item,
          exam: Array.isArray(item.exam) ? (item.exam as unknown[])[0] : item.exam,
        })) as ClassroomExam[]
      );
    }
    setLoading(false);
  }, [classroomId]);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handleUnlink = async () => {
    if (!confirmUnlink) return;
    try {
      const { error } = await supabase
        .from('classroom_exams')
        .delete()
        .eq('id', confirmUnlink.id);
      if (error) throw error;
      toast.success(t('classrooms.detail.examsTab.examRemoved'));
      loadExams();
      onStatsChange();
    } catch {
      toast.error(t('classrooms.detail.examsTab.failedToRemove'));
    } finally {
      setConfirmUnlink(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('classrooms.detail.examsTab.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('classrooms.detail.examsTab.description')}
            </p>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('classrooms.detail.examsTab.linkExam')}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-2">{t('classrooms.detail.examsTab.noExamsLinked')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Link an exam so students can take it from this classroom
            </p>
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('classrooms.detail.examsTab.linkFirstExam')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {exams.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {item.exam?.title || 'Untitled Exam'}
                      </h3>
                    </div>
                    {item.exam?.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {item.exam.description}
                      </p>
                    )}
                    {item.instructions && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-3 italic">
                        {item.instructions}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Linked {new Date(item.added_at).toLocaleDateString()}</span>
                      </div>
                      {item.due_date && (
                        <div
                          className={`flex items-center gap-1 font-medium ${
                            new Date(item.due_date) < new Date()
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-orange-600 dark:text-orange-400'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Due {new Date(item.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    {item.exam?.id && (
                      <Link
                        to={`/exams/${item.exam.id}`}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Exam"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                    )}
                    <button
                      onClick={() =>
                        setConfirmUnlink({ id: item.id, title: item.exam?.title || 'this exam' })
                      }
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Remove from Classroom"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLinkModal && (
        <LinkExamModal
          classroomId={classroomId}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => { loadExams(); onStatsChange(); }}
        />
      )}

      <ConfirmationModal
        isOpen={!!confirmUnlink}
        title={t('classrooms.detail.examsTab.removeButton')}
        message={t('classrooms.detail.examsTab.removeConfirm', { title: confirmUnlink?.title || 'this exam' })}
        confirmLabel={t('classrooms.detail.examsTab.removeButton')}
        variant="danger"
        onConfirm={handleUnlink}
        onCancel={() => setConfirmUnlink(null)}
      />
    </>
  );
}
