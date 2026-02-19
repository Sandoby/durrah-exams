import { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  MoreVertical, 
  Mail, 
  UserCheck, 
  UserX, 
  Trash2,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useClassroomStudents } from '../../../hooks/useClassroomStudents';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface StudentRosterProps {
  classroomId: string;
  classroomName: string;
  onAddStudent?: () => void;
}

interface Student {
  id: string;
  student_id: string;
  enrolled_at: string;
  status: 'active' | 'pending' | 'suspended' | 'removed';
  enrollment_method: string;
  notes: string;
  student: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
    grade_level?: string;
    school_name?: string;
  };
}

type FilterStatus = 'all' | 'active' | 'pending' | 'suspended';

export function StudentRoster({ classroomId, classroomName, onAddStudent }: StudentRosterProps) {
  const { updateStudentStatus, removeStudent } = useClassroomStudents(classroomId);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, [classroomId]);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, filterStatus]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classroom_students')
        .select(`
          id,
          student_id,
          enrolled_at,
          status,
          enrollment_method,
          notes,
          student:profiles!student_id (
            id,
            email,
            full_name,
            avatar_url,
            grade_level,
            school_name
          )
        `)
        .eq('classroom_id', classroomId)
        .neq('status', 'removed')
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const mapped = data.map((item: any) => ({
        ...item,
        student: Array.isArray(item.student) ? item.student[0] : item.student
      }));

      setStudents(mapped);
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s => s.status === filterStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.student.full_name?.toLowerCase().includes(query) ||
        s.student.email?.toLowerCase().includes(query) ||
        s.student.grade_level?.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'suspended') => {
    const success = await updateStudentStatus(studentId, newStatus);
    if (success) {
      loadStudents();
      setMenuOpen(null);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from ${classroomName}?`)) return;
    
    const success = await removeStudent(studentId);
    if (success) {
      loadStudents();
      setMenuOpen(null);
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    await handleStatusChange(studentId, 'active');
  };

  const handleRejectStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Reject ${studentName}'s enrollment request?`)) return;
    await handleRemoveStudent(studentId, studentName);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded-full">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full">
            <XCircle className="w-3 h-3" />
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  const pendingStudents = students.filter(s => s.status === 'pending');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingStudents.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-300 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals ({pendingStudents.length})
          </h3>
          <div className="space-y-3">
            {pendingStudents.map((enrollment) => (
              <div
                key={enrollment.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {enrollment.student.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {enrollment.student.full_name || enrollment.student.email}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {enrollment.student.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveStudent(enrollment.student_id)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectStudent(enrollment.student_id, enrollment.student.full_name || enrollment.student.email)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Students ({filteredStudents.length})
            </h2>
          </div>
          
          {onAddStudent && (
            <button
              onClick={onAddStudent}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Students</option>
            <option value="active">Active Only</option>
            <option value="pending">Pending Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Student List */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterStatus !== 'all' ? 'No students match your filters' : 'No students enrolled yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredStudents.map((enrollment) => (
              <div
                key={enrollment.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {enrollment.student.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {enrollment.student.full_name || 'No Name'}
                        </h3>
                        {getStatusBadge(enrollment.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{enrollment.student.email}</span>
                        </div>
                        {enrollment.student.grade_level && (
                          <span>• Grade {enrollment.student.grade_level}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Joined {new Date(enrollment.enrolled_at).toLocaleDateString()}
                        {enrollment.enrollment_method && ` • via ${enrollment.enrollment_method}`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === enrollment.id ? null : enrollment.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>

                    {menuOpen === enrollment.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setMenuOpen(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                          {enrollment.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(enrollment.student_id, 'suspended')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                            >
                              <UserX className="w-4 h-4" />
                              Suspend Student
                            </button>
                          )}
                          {enrollment.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(enrollment.student_id, 'active')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600 dark:text-green-400"
                            >
                              <UserCheck className="w-4 h-4" />
                              Activate Student
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveStudent(enrollment.student_id, enrollment.student.full_name || enrollment.student.email)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove from Class
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
