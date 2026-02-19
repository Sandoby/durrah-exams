import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Plus, Search, GraduationCap } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Classroom } from '../../types/classroom';
import { motion } from 'framer-motion';

interface EnrolledClassroom extends Classroom {
  enrollment_status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

export default function StudentClassroomList() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<EnrolledClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEnrolledClassrooms();
  }, [user]);

  const fetchEnrolledClassrooms = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('classroom_students')
      .select(`
        status,
        enrolled_at,
        classroom:classrooms(*)
      `)
      .eq('student_id', user.id)
      .order('enrolled_at', { ascending: false });

    if (!error && data) {
      const enrolled = data.map((item: any) => ({
        ...item.classroom,
        enrollment_status: item.status,
        joined_at: item.enrolled_at,
      }));
      setClassrooms(enrolled);
    }
    setLoading(false);
  };

  const filteredClassrooms = classrooms.filter((c) => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.subject?.toLowerCase().includes(query) ||
      c.grade_level?.toLowerCase().includes(query)
    );
  });

  const activeClassrooms = filteredClassrooms.filter((c) => c.enrollment_status === 'active');
  const pendingClassrooms = filteredClassrooms.filter((c) => c.enrollment_status === 'pending');

  return (
    <>
      <Helmet>
        <title>{t('classrooms.myClassrooms', 'My Classrooms')} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Logo />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  My Classrooms
                </h1>
              </div>

              <Link
                to="/join"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Join Classroom</span>
              </Link>
            </div>

            {/* Search */}
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search classrooms..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : activeClassrooms.length === 0 && pendingClassrooms.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No classrooms yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Join a classroom using an invite code from your tutor
              </p>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Join Classroom
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pending Approvals */}
              {pendingClassrooms.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Pending Approval
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingClassrooms.map((classroom, index) => (
                      <motion.div
                        key={classroom.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ClassroomEnrollmentCard classroom={classroom} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Classrooms */}
              {activeClassrooms.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Active Classrooms
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeClassrooms.map((classroom, index) => (
                      <motion.div
                        key={classroom.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ClassroomEnrollmentCard classroom={classroom} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ClassroomEnrollmentCard({ classroom }: { classroom: EnrolledClassroom }) {
  const isPending = classroom.enrollment_status === 'pending';

  return (
    <Link
      to={`/my/classrooms/${classroom.id}`}
      className={`block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all ${
        isPending ? 'opacity-60' : 'hover:-translate-y-1'
      }`}
    >
      <div className="h-2" style={{ backgroundColor: classroom.color }} />
      <div className="p-6">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ backgroundColor: classroom.color }}
          >
            {classroom.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {classroom.name}
            </h3>
            <div className="flex flex-wrap gap-1 mt-1 text-sm text-gray-600 dark:text-gray-400">
              {classroom.subject && <span>{classroom.subject}</span>}
              {classroom.grade_level && <span>• {classroom.grade_level}</span>}
            </div>
          </div>
        </div>

        {isPending && (
          <div className="mt-4 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Waiting for approval...
            </p>
          </div>
        )}

        {classroom.academic_year && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {classroom.academic_year}
          </div>
        )}
      </div>
    </Link>
  );
}
