import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useClassrooms } from '../../hooks/useClassrooms';
import { Logo } from '../../components/Logo';
import { Helmet } from 'react-helmet-async';
import type { ClassroomFormData } from '../../types/classroom';
import { CLASSROOM_COLORS } from '../../types/classroom';

const classroomSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  subject: z.string().max(50).optional(),
  grade_level: z.string().max(30).optional(),
  academic_year: z.string().max(20).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  settings: z.object({
    auto_approve_students: z.boolean(),
    max_capacity: z.number().min(1).max(1000),
    allow_student_chat: z.boolean(),
    show_student_list_to_students: z.boolean(),
  }),
});

const currentYear = new Date().getFullYear();
const academicYears = [
  `${currentYear}-${currentYear + 1}`,
  `${currentYear + 1}-${currentYear + 2}`,
  `${currentYear - 1}-${currentYear}`,
];

export default function ClassroomCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createClassroom } = useClassrooms();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClassroomFormData>({
    resolver: zodResolver(classroomSchema),
    defaultValues: {
      name: '',
      subject: '',
      grade_level: '',
      academic_year: academicYears[0],
      description: '',
      color: '#3B82F6',
      settings: {
        auto_approve_students: true,
        max_capacity: 100,
        allow_student_chat: true,
        show_student_list_to_students: false,
      },
    },
  });

  const selectedColor = watch('color');

  const onSubmit = async (data: ClassroomFormData) => {
    setIsSubmitting(true);
    const classroom = await createClassroom(data);
    setIsSubmitting(false);

    if (classroom) {
      navigate(`/classrooms/${classroom.id}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('classrooms.createNew', 'Create Classroom')} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Link
                to="/classrooms"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="hidden sm:block">
                <Logo />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('classrooms.createNew', 'Create New Classroom')}
              </h1>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Basic Information
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('classrooms.form.name', 'Classroom Name')} *
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder={t('classrooms.form.namePlaceholder', 'e.g. Mathematics — Grade 10')}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Subject & Grade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('classrooms.form.subject', 'Subject')}
                    </label>
                    <input
                      type="text"
                      {...register('subject')}
                      placeholder={t('classrooms.form.subjectPlaceholder', 'e.g. Mathematics')}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('classrooms.form.gradeLevel', 'Grade Level')}
                    </label>
                    <input
                      type="text"
                      {...register('grade_level')}
                      placeholder={t('classrooms.form.gradeLevelPlaceholder', 'e.g. Grade 10')}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('classrooms.form.academicYear', 'Academic Year')}
                  </label>
                  <select
                    {...register('academic_year')}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {academicYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('classrooms.form.description', 'Description')}
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder={t('classrooms.form.descriptionPlaceholder', 'Brief description of this classroom...')}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('classrooms.form.color', 'Color')}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {CLASSROOM_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setValue('color', color.value)}
                        className={`w-10 h-10 rounded-lg transition-all ${
                          selectedColor === color.value
                            ? 'ring-4 ring-offset-2 ring-blue-500 scale-110'
                            : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('classrooms.form.settings', 'Settings')}
              </h2>

              <div className="space-y-4">
                {/* Auto-approve */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('settings.auto_approve_students')}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('classrooms.form.autoApprove', 'Auto-approve students')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t('classrooms.form.autoApproveHint', 'Students will be added immediately when they join')}
                    </div>
                  </div>
                </label>

                {/* Max Capacity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('classrooms.form.maxCapacity', 'Maximum students')}
                  </label>
                  <input
                    type="number"
                    {...register('settings.max_capacity', { valueAsNumber: true })}
                    min={1}
                    max={1000}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Show student list */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('settings.show_student_list_to_students')}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('classrooms.form.showStudentList', 'Show student list to students')}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Link
                to="/classrooms"
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>{t('classrooms.form.createButton', 'Create Classroom')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
