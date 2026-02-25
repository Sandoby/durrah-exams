import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import toast from 'react-hot-toast';
import type { Classroom, ClassroomSettings } from '../../../types/classroom';

interface SettingsTabProps {
  classroom: Classroom;
  onRefresh: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

interface EditForm {
  name: string;
  subject: string;
  grade_level: string;
  description: string;
  color: string;
  academic_year: string;
  settings: ClassroomSettings;
}

export function SettingsTab({ classroom, onRefresh, onArchive, onDelete }: SettingsTabProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: classroom.name,
    subject: classroom.subject || '',
    grade_level: classroom.grade_level || '',
    description: classroom.description || '',
    color: classroom.color,
    academic_year: classroom.academic_year || '',
    settings: classroom.settings || {},
  });
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          name: editForm.name,
          subject: editForm.subject,
          grade_level: editForm.grade_level,
          description: editForm.description,
          color: editForm.color,
          academic_year: editForm.academic_year,
          settings: editForm.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', classroom.id);
      if (error) throw error;
      toast.success(t('classrooms.detail.settingsTab.updated'));
      setIsEditing(false);
      onRefresh();
    } catch (err: unknown) {
      const e = err as Error;
      toast.error(e.message || t('classrooms.detail.settingsTab.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = async (key: keyof ClassroomSettings) => {
    setTogglingKey(key);
    const newSettings: ClassroomSettings = {
      ...editForm.settings,
      [key]: !editForm.settings[key],
    };
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({ settings: newSettings })
        .eq('id', classroom.id);
      if (error) throw error;
      setEditForm((f) => ({ ...f, settings: newSettings }));
      onRefresh();
    } catch {
      toast.error(t('classrooms.detail.settingsTab.settingFailed'));
    } finally {
      setTogglingKey(null);
    }
  };

  const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <>
      <div className="space-y-6">
        {/* Classroom Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('classrooms.detail.settingsTab.classroomInfo')}
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('classrooms.detail.settingsTab.edit')}
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.form.name')} *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  disabled={!isEditing}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.form.subject')}
                </label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  disabled={!isEditing}
                  placeholder={t('classrooms.form.subjectPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.form.gradeLevel')}
                </label>
                <input
                  type="text"
                  value={editForm.grade_level}
                  onChange={(e) => setEditForm({ ...editForm, grade_level: e.target.value })}
                  disabled={!isEditing}
                  placeholder={t('classrooms.form.gradeLevelPlaceholder')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classrooms.form.academicYear')}
                </label>
                <input
                  type="text"
                  value={editForm.academic_year}
                  onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                  disabled={!isEditing}
                  placeholder="e.g., 2024-2025"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('classrooms.detail.settingsTab.description')}
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                disabled={!isEditing}
                rows={3}
                placeholder={isEditing ? t('classrooms.detail.settingsTab.descriptionPlaceholder') : t('classrooms.detail.settingsTab.noDescription')}
                className={inputCls + ' resize-none'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('classrooms.form.color')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  disabled={!isEditing}
                  className="h-10 w-20 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">{editForm.color}</span>
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? t('classrooms.detail.settingsTab.saving') : t('classrooms.detail.settingsTab.saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      name: classroom.name,
                      subject: classroom.subject || '',
                      grade_level: classroom.grade_level || '',
                      description: classroom.description || '',
                      color: classroom.color,
                      academic_year: classroom.academic_year || '',
                      settings: classroom.settings || {},
                    });
                  }}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
                >
                  {t('classrooms.detail.settingsTab.cancel')}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Enrollment Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('classrooms.detail.settingsTab.enrollmentSettings')}
          </h2>
          <div className="space-y-4">
            {[
              {
                key: 'auto_approve_students' as keyof ClassroomSettings,
                label: t('classrooms.detail.settingsTab.autoApproveStudents'),
                desc: t('classrooms.detail.settingsTab.autoApproveDesc'),
              },
              {
                key: 'show_student_list_to_students' as keyof ClassroomSettings,
                label: t('classrooms.detail.settingsTab.showStudentList'),
                desc: t('classrooms.detail.settingsTab.showStudentListDesc'),
              },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
                </div>
                <button
                  onClick={() => toggleSetting(key)}
                  disabled={togglingKey === key}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    editForm.settings[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  aria-checked={!!editForm.settings[key]}
                  role="switch"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.settings[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-4">
            {t('classrooms.detail.settingsTab.dangerZone')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {classroom.is_archived ? t('classrooms.detail.settingsTab.unarchiveDesc') : t('classrooms.detail.settingsTab.archiveTitle')} Classroom
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {classroom.is_archived
                    ? t('classrooms.detail.settingsTab.unarchiveDesc')
                    : t('classrooms.detail.settingsTab.archiveDesc')}
                </div>
              </div>
              <button
                onClick={() => setConfirmArchive(true)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
              >
                {classroom.is_archived ? t('classrooms.detail.settingsTab.unarchiveButton') : t('classrooms.detail.settingsTab.archiveButton')}
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t-2 border-red-200 dark:border-red-800">
              <div>
                <div className="font-medium text-red-900 dark:text-red-300">{t('classrooms.detail.settingsTab.deleteTitle')}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {t('classrooms.detail.settingsTab.deleteDesc')}
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('classrooms.detail.settingsTab.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Archive Confirmation */}
      <ConfirmationModal
        isOpen={confirmArchive}
        title={classroom.is_archived ? t('classrooms.detail.settings.unarchive') : t('classrooms.detail.settings.archive')}
        message={
          classroom.is_archived
            ? t('classrooms.detail.settings.unarchiveConfirm', 'Make this classroom active again? Students will be able to join.')
            : t('classrooms.detail.settings.archiveConfirm', 'Archive this classroom? It will be hidden and no new students can join.')
        }
        confirmLabel={classroom.is_archived ? t('classrooms.detail.settingsTab.unarchiveButton') : t('classrooms.detail.settingsTab.archiveButton')}
        variant="warning"
        onConfirm={() => { setConfirmArchive(false); onArchive(); }}
        onCancel={() => setConfirmArchive(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={confirmDelete}
        title={t('classrooms.detail.settingsTab.deleteTitle')}
        message={t('classrooms.detail.settingsTab.deleteDesc')}
        confirmLabel={t('classrooms.detail.settingsTab.deleteButton')}
        variant="danger"
        onConfirm={() => { setConfirmDelete(false); onDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
