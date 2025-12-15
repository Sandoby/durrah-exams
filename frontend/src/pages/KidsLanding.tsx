import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Sparkles, Ticket, Lock, Smile, BookOpenCheck, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LeaderboardVisibility = 'hidden' | 'after_submit' | 'always';

export default function KidsLanding() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizedCode = useMemo(() => code.trim().toUpperCase().replace(/\s+/g, ''), [code]);

  const handleEnter = async () => {
    const nick = nickname.trim();
    if (!nick) {
      toast.error('Please enter a nickname');
      return;
    }
    if (!normalizedCode) {
      toast.error('Please enter the quiz code');
      return;
    }

    setIsLoading(true);
    try {
      // Resolve exam by quiz_code
      const { data: exam, error } = await supabase
        .from('exams')
        .select('id, title, settings')
        .eq('quiz_code', normalizedCode)
        .single();

      if (error || !exam) {
        toast.error('Invalid code');
        return;
      }

      const settings: any = exam.settings || {};
      const childModeEnabled = !!settings.child_mode_enabled;
      if (!childModeEnabled) {
        toast.error('This quiz is not enabled for kids mode');
        return;
      }

      const attemptLimit: number | null = settings.attempt_limit ?? null;

      // Check attempts by nickname (MVP). Backend should also enforce.
      if (attemptLimit && attemptLimit > 0) {
        const { count, error: countError } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('exam_id', exam.id)
          .eq('child_mode', true)
          .eq('nickname', nick);

        if (!countError && typeof count === 'number' && count >= attemptLimit) {
          toast.error(`No attempts left (limit: ${attemptLimit})`);
          // Still allow them to view leaderboard if tutor enabled it
          const visibility: LeaderboardVisibility = settings.leaderboard_visibility || 'hidden';
          navigate(`/kids/quiz/${exam.id}?code=${encodeURIComponent(normalizedCode)}&nick=${encodeURIComponent(nick)}&kid=1&locked=1&lb=${encodeURIComponent(visibility)}`);
          return;
        }
      }

      navigate(`/kids/quiz/${exam.id}?code=${encodeURIComponent(normalizedCode)}&nick=${encodeURIComponent(nick)}&kid=1`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to open quiz');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header with logo and nav style chips */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/illustrations/logo.jpeg" alt="Durrah Logo" className="h-10 w-auto" />
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3" /> Kids Mode
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Safe • Fun • Learning</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-gray-900">
                Unlock the Secrets of <span className="text-purple-700">Fun Education</span>
              </h1>
              <p className="mt-4 text-gray-600 text-sm sm:text-base max-w-md">
                From bubble math to science crafts and karaoke, explore fun skills-based
                lessons tailored for smart kids.
              </p>

              {/* Feature cards inline like reference */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl p-4 shadow-sm bg-orange-50 border border-orange-200">
                  <Smile className="h-5 w-5 text-orange-600" />
                  <p className="mt-2 text-sm font-bold text-orange-700">Learning Astronomy</p>
                  <p className="text-xs text-orange-700/80">Discover stars and space</p>
                </div>
                <div className="rounded-2xl p-4 shadow-sm bg-yellow-50 border border-yellow-200">
                  <BookOpenCheck className="h-5 w-5 text-yellow-600" />
                  <p className="mt-2 text-sm font-bold text-yellow-700">Museum Visit</p>
                  <p className="text-xs text-yellow-700/80">Explore history together</p>
                </div>
                <div className="rounded-2xl p-4 shadow-sm bg-purple-50 border border-purple-200">
                  <Trophy className="h-5 w-5 text-purple-600" />
                  <p className="mt-2 text-sm font-bold text-purple-700">Camping & Singing</p>
                  <p className="text-xs text-purple-700/80">Team fun activities</p>
                </div>
              </div>
            </div>

            {/* Entry Form Card */}
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6 md:p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Your Nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="e.g., SuperTiger"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Quiz Code</label>
                  <div className="relative">
                    <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-600" />
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-3 text-gray-900 placeholder-gray-400 tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-purple-400"
                      placeholder="KID-ABC123"
                    />
                  </div>
                  {normalizedCode && (
                    <p className="mt-2 text-xs text-purple-700 font-semibold">
                      Code: <span className="font-mono bg-purple-100 px-2 py-1 rounded">{normalizedCode}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleEnter}
                  disabled={isLoading || !nickname.trim() || !normalizedCode}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Starting...' : 'Start Quiz'}
                </button>
                <p className="text-xs text-gray-500"><Lock className="inline h-3 w-3 mr-1" /> Ask your teacher for the code</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary content like reference */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl font-black text-gray-900">Fun Games & Activities for Smart Kids</h2>
          <ul className="mt-3 grid sm:grid-cols-2 gap-3 text-sm text-gray-700">
            <li className="rounded-xl bg-white border border-gray-200 p-4">Math puzzles, creative writing, and science crafts</li>
            <li className="rounded-xl bg-white border border-gray-200 p-4">Reading class, vocabulary games, and pronunciation</li>
            <li className="rounded-xl bg-white border border-gray-200 p-4">Team activities, music & rhythm, and memory games</li>
            <li className="rounded-xl bg-white border border-gray-200 p-4">Safe, engaging, and tutor-approved content</li>
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Durrah. Fun education for kids.
        </div>
      </footer>
    </div>
  );
}





