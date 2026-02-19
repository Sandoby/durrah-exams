import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, CheckCircle, Loader2, AlertCircle, Users } from 'lucide-react';
import { useInviteCode } from '../../hooks/useInviteCode';
import { Logo } from '../../components/Logo';
import type { ClassroomPreview } from '../../types/classroom';

export default function JoinClassroom() {
  const { code } = useParams<{ code?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lookupClassroom, joinClassroom } = useInviteCode();

  const [inputCode, setInputCode] = useState(code || '');
  const [classroom, setClassroom] = useState<ClassroomPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (code) {
      handleLookup(code);
    }
  }, [code]);

  const handleLookup = async (lookupCode?: string) => {
    const codeToLookup = lookupCode || inputCode.trim().toUpperCase();
    if (!codeToLookup) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');
    setClassroom(null);

    const result = await lookupClassroom(codeToLookup);

    if (result) {
      setClassroom(result);
    } else {
      setError('Invalid or expired invite code');
    }

    setLoading(false);
  };

  const handleJoin = async () => {
    if (!classroom || !classroom.invite_code) return;

    setJoining(true);
    setError('');

    const result = await joinClassroom(classroom.invite_code);

    if (result?.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/student-portal');
      }, 2000);
    } else {
      setError(result?.message || 'Failed to join classroom');
    }

    setJoining(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Successfully Joined!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Redirecting to your classrooms...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('classrooms.join', 'Join Classroom')} | Durrah Tutors</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Link
                to="/student-portal"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Logo />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Join Classroom
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {!classroom ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Enter Invite Code
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter the 6-character code provided by your tutor
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="w-full px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || inputCode.length !== 6}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Looking up...</span>
                    </>
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Color bar */}
              <div className="h-3" style={{ backgroundColor: classroom.color }} />

              <div className="p-8">
                {/* Classroom Preview */}
                <div className="flex items-start gap-4 mb-6">
                  <div
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: classroom.color }}
                  >
                    {classroom.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {classroom.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
                      {classroom.subject && <span>{classroom.subject}</span>}
                      {classroom.grade_level && <span>• {classroom.grade_level}</span>}
                      {classroom.academic_year && <span>• {classroom.academic_year}</span>}
                    </div>
                  </div>
                </div>

                {classroom.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {classroom.description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 mb-8 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {classroom.student_count}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
                  </div>
                  {classroom.settings?.max_capacity && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Capacity: {classroom.settings.max_capacity}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg mb-6">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setClassroom(null)}
                    className="flex-1 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Try Different Code
                  </button>
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <span>Join Classroom</span>
                    )}
                  </button>
                </div>

                {classroom.settings?.auto_approve_students ? (
                  <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    You'll be added immediately
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-center text-gray-500 dark:text-gray-400">
                    Your tutor will need to approve your request
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
