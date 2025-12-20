import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export default function StudentPortal() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'dashboard'>('login');
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [previousExams, setPreviousExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreviousExams(user).then(setPreviousExams);
      setAuthMode('dashboard');
    }
  }, [user]);

  const fetchPreviousExams = async (user: any) => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('submissions')
      .select('id, exam_id, exam:title, score, created_at')
      .eq('student_email', user.email)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'register') {
        const { data: authData, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.name } },
        });
        if (error) throw error;
        await supabase.from('profiles').update({ role: 'student' }).eq('id', authData.user?.id);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (authMode === 'login' || authMode === 'register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleAuth} className="bg-white p-6 rounded shadow-md w-full max-w-md">
          {authMode === 'register' && (
            <input
              type="text"
              placeholder={t('Name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mb-4 p-2 border rounded"
              required
            />
          )}
          <input
            type="email"
            placeholder={t('Email')}
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full mb-4 p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder={t('Password')}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full mb-4 p-2 border rounded"
            required
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded"
            disabled={loading}
          >
            {loading ? t('Loading...') : authMode === 'register' ? t('Sign Up') : t('Sign In')}
          </button>
          <p className="mt-4 text-center">
            {authMode === 'login' ? (
              <span>
                {t('No account?')}{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-indigo-600 underline"
                >
                  {t('Sign Up')}
                </button>
              </span>
            ) : (
              <span>
                {t('Already have an account?')}{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-indigo-600 underline"
                >
                  {t('Sign In')}
                </button>
              </span>
            )}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow-md">
        <h1 className="text-2xl font-bold mb-4">{t('Student Dashboard')}</h1>
        <button
          onClick={signOut}
          className="bg-red-500 text-white px-4 py-2 rounded mb-4"
        >
          {t('Sign Out')}
        </button>
        <h2 className="text-lg font-semibold mb-2">{t('Previous Exams')}</h2>
        <div className="space-y-2">
          {previousExams.length === 0 ? (
            <div className="text-gray-500">{t('No previous exams found.')}</div>
          ) : (
            previousExams.map((exam, idx) => (
              <div key={idx} className="border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="font-bold">{exam.title}</div>
                  <div className="text-sm text-gray-500">{t('Score')}: {exam.score ?? t('N/A')}</div>
                </div>
                <div className="text-xs text-gray-400">{exam.created_at}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
