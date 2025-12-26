
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, Sparkles, Star, Trophy, AlertCircle } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { KidsLeaderboard } from '../components/kids/KidsLeaderboard';

type LeaderboardVisibility = 'hidden' | 'after_submit' | 'always';

type Question = {
  id: string;
  type: string;
  question_text: string;
  options?: string[];
  points: number;
  media_url?: string | null;
  media_type?: 'image' | 'audio' | 'video' | null;
};

type Exam = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  is_active?: boolean;
  settings?: any;
};

/**
 * KidsExamView
 * - Wrapper around existing ExamView
 * - Kids only provide nickname + code (from /kids landing)
 * - We avoid editing the huge ExamView.tsx for now.
 *
 * Current behavior:
 * - If nick/code missing, redirect back to /kids
 * - If locked=1, show a friendly locked screen
 * - Otherwise, render ExamView (it will still show its normal start screen until we refactor it)
 *
 * Next step (Phase 2): either
 *  A) create a full kids UI here (fetch exam, render questions, submit to grade-exam)
 *  B) do minimal patch inside ExamView to bypass required fields when kid=1
 */
export default function KidsExamView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const nick = (searchParams.get('nick') || '').trim();
  const code = (searchParams.get('code') || '').trim();
  const locked = searchParams.get('locked') === '1';

  const safeNick = useMemo(() => nick.replace(/\s+/g, ' ').slice(0, 40), [nick]);
  const safeCode = useMemo(() => code.trim().toUpperCase().replace(/\s+/g, ''), [code]);

  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const leaderboardVisibility = useMemo<LeaderboardVisibility>(() => {
    const v = exam?.settings?.leaderboard_visibility;
    return v === 'always' || v === 'after_submit' || v === 'hidden' ? v : 'hidden';
  }, [exam?.settings?.leaderboard_visibility]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ score: number; max_score: number; percentage: number; submission_id?: string } | null>(null);

  // Fun game state (cosmetic)
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const { data: examData, error } = await supabase.from('exams').select('*').eq('id', id).single();
        if (error) throw error;

        const { data: qData, error: qError } = await supabase
          .from('questions')
          .select('id, type, question_text, options, points, randomize_options, media_url, media_type')
          .eq('exam_id', id);
        if (qError) throw qError;

        const settings = examData.settings || {};
        let processed = [...(qData || [])];

        // Randomize questions if enabled
        if (settings.randomize_questions) {
          for (let i = processed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [processed[i], processed[j]] = [processed[j], processed[i]];
          }
        }

        // Randomize options if enabled
        processed = processed.map((q: any) => {
          if (q.randomize_options && q.options && q.options.length > 0) {
            const opts = [...q.options];
            for (let i = opts.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [opts[i], opts[j]] = [opts[j], opts[i]];
            }
            return { ...q, options: opts };
          }
          return q;
        });

        setExam({ ...examData, questions: processed, settings });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load quiz');
        navigate('/kids');
      } finally {
        setIsLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!id) return <Navigate to="/kids" replace />;

  if (!safeNick || !safeCode) {
    toast.error('Please enter nickname and code');
    return <Navigate to="/kids" replace />;
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-indigo-100 to-yellow-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-6">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-3">
            <Star className="h-5 w-5" />
            <h1 className="text-xl font-extrabold">Hi {safeNick}!</h1>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">Attempts limit reached for this nickname.</p>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Ask your tutor to increase attempts, or try a different nickname.</p>
          <a href="/kids" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3">
            Back
          </a>
        </div>
      </div>
    );
  }

  const totalQuestions = exam?.questions.length || 0;
  const answeredCount = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a !== undefined && a !== '' && !(Array.isArray(a) && a.length === 0);
  }).length;

  const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    // simple fun feedback
    setStreak((s) => s + 1);
    setStars((st) => st + 1);
  };

  const goNext = () => {
    if (!exam) return;
    setCurrentIndex((i) => Math.min(i + 1, exam.questions.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPrev = () => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!exam || isSubmittingRef.current || submitted) return;

    // Ensure all answered
    const unanswered: number[] = [];
    exam.questions.forEach((q, idx) => {
      const a = answers[q.id];
      if (a === undefined || a === '' || (Array.isArray(a) && a.length === 0)) unanswered.push(idx);
    });
    if (unanswered.length) {
      toast.error(`Answer all questions first (${unanswered.length} left)`);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase configuration missing');

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/grade-exam`;
      const timeTakenSeconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : null;

      const answersPayload = (exam.questions || []).map((q) => ({
        question_id: q.id,
        answer: answers[q.id]
      }));

      const submissionData = {
        exam_id: id,
        child_mode: true,
        nickname: safeNick,
        quiz_code: safeCode,
        student_data: {
          name: safeNick,
          email: `${encodeURIComponent(safeNick || 'kid')}@kids.local`
        },
        answers: answersPayload,
        violations: [],
        browser_info: {
          user_agent: navigator.userAgent,
          language: navigator.language,
          screen_width: window.screen.width,
          screen_height: window.screen.height
        },
        time_taken: timeTakenSeconds
      };

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Submission failed');

      setScore({
        score: result.score,
        max_score: result.max_score,
        percentage: result.percentage,
        submission_id: result.submission_id
      });
      setSubmitted(true);

      toast.success('Great job! 🎉');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };


  if (isLoading || !exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Block access if exam is not active
  if (exam.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">Exam Not Available</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">This exam is currently deactivated by the tutor. Please check back later or contact your tutor for more information.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    const showResults = Boolean(exam?.settings?.show_results_immediately);
    const showLeaderboard = leaderboardVisibility === 'always' || (leaderboardVisibility === 'after_submit' && submitted);

    const getRewardEmoji = (percentage: number) => {
      if (percentage >= 90) return { emoji: '🏆', msg: 'SUPERSTAR!', color: 'from-yellow-400 to-orange-400' }
      if (percentage >= 75) return { emoji: '⭐', msg: 'Great Job!', color: 'from-blue-400 to-indigo-400' }
      if (percentage >= 60) return { emoji: '👍', msg: 'Well Done!', color: 'from-green-400 to-teal-400' }
      return { emoji: '💪', msg: 'Keep Trying!', color: 'from-purple-400 to-pink-400' }
    }

    const reward = score ? getRewardEmoji(score.percentage) : null

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-200 via-pink-100 to-yellow-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="w-full max-w-2xl bg-white/90 dark:bg-gray-900/80 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-8 text-center">
          {/* Animated Success Icon */}
          <div className="mx-auto h-24 w-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white flex items-center justify-center animate-bounce">
            <CheckCircle className="h-16 w-16" />
          </div>
          
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Mission Complete!
          </h1>
          <p className="mt-2 text-xl text-gray-700 dark:text-gray-300 font-bold">Amazing work, {safeNick}! 🎉</p>

          {/* Score Display with Celebration */}
          {showResults && score && reward ? (
            <div className="mt-8 relative">
              {/* Large Emoji Celebration */}
              <div className="text-8xl animate-pulse">{reward.emoji}</div>
              <div className={`mt-4 inline-block px-8 py-4 rounded-3xl bg-gradient-to-r ${reward.color} text-white shadow-2xl`}>
                <p className="text-3xl font-black mb-1">{reward.msg}</p>
                <p className="text-6xl font-black">{score.percentage.toFixed(0)}%</p>
                <p className="mt-2 text-lg font-bold opacity-90">{score.score} out of {score.max_score} points</p>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-6 rounded-3xl bg-white/60 dark:bg-gray-900/30 border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="font-bold">Getting your results...</p>
            </div>
          )}

          {/* Fun Stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 p-4 transform hover:scale-105 transition-transform">
              <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <div className="text-3xl font-black text-yellow-900">{stars}</div>
              <div className="text-xs font-bold text-yellow-700 uppercase">Stars</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-300 p-4 transform hover:scale-105 transition-transform">
              <Sparkles className="h-8 w-8 mx-auto text-indigo-600 mb-2" />
              <div className="text-3xl font-black text-indigo-900">{streak}</div>
              <div className="text-xs font-bold text-indigo-700 uppercase">Streak</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-pink-100 border-2 border-pink-300 p-4 transform hover:scale-105 transition-transform">
              <Trophy className="h-8 w-8 mx-auto text-pink-600 mb-2" />
              <div className="text-lg font-black text-pink-900">Brave</div>
              <div className="text-xs font-bold text-pink-700 uppercase">Quizzer</div>
            </div>
          </div>

          {showLeaderboard && (
            <KidsLeaderboard
              examId={id!}
              nickname={safeNick}
              refreshKey={score?.submission_id || 'submitted'}
            />
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => navigate('/kids')}
              className="flex-1 rounded-2xl bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-extrabold py-3"
            >
              Back to Kids Page
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = exam.questions[currentIndex];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-pink-200 via-indigo-100 to-yellow-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Fun blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-pink-400/30 blur-3xl" />
      <div className="pointer-events-none absolute top-10 -right-24 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-96 w-96 rounded-full bg-yellow-400/25 blur-3xl" />

      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Top HUD */}
        <div className="sticky top-4 z-10">
          <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Player</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">{safeNick}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-yellow-800 font-extrabold">
                    <Star className="h-5 w-5" /> {stars}
                  </div>
                </div>
                <div className="rounded-2xl bg-indigo-50 border border-indigo-200 px-3 py-2">
                  <div className="text-indigo-800 font-extrabold">{progress}%</div>
                  <div className="text-[10px] text-indigo-700/80">progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Start gate */}
        {!started ? (
          <div className="mt-6 bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{exam.title}</h1>
            <p className="mt-2 text-gray-700 dark:text-gray-300">{exam.description}</p>

            <div className="mt-5 rounded-2xl bg-white/60 dark:bg-gray-900/30 border border-white/60 dark:border-gray-800 p-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Your code</p>
              <p className="mt-1 font-mono text-lg font-black text-indigo-700 dark:text-indigo-300">{safeCode}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStarted(true);
                setStartedAt(Date.now());
                toast.success('Let’s go!');
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-indigo-600 to-purple-600 hover:from-pink-600 hover:via-indigo-700 hover:to-purple-700 text-white font-extrabold py-3 shadow-lg"
            >
              Start Quiz
            </button>

            <button
              type="button"
              onClick={() => navigate('/kids')}
              className="mt-3 w-full rounded-2xl bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-extrabold py-3"
            >
              Back
            </button>
            {/* Show leaderboard if visibility is always */}
            {leaderboardVisibility === 'always' && (
              <div className="mt-6">
                <KidsLeaderboard
                  examId={id!}
                  nickname={safeNick}
                  refreshKey="pre-start"
                />
              </div>
            )}          </div>
        ) : (
          <div className="mt-6">
            {/* Question card */}
            <div className="bg-white/80 dark:bg-gray-900/70 backdrop-blur border border-white/60 dark:border-gray-800 rounded-3xl shadow-2xl p-6 sm:p-10">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-gray-900 dark:text-white">
                  Question {currentIndex + 1} / {totalQuestions}
                </div>
                <div className="text-xs font-bold text-gray-600 dark:text-gray-300">{q.points} pts</div>
              </div>

              <p className="mt-4 text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">{q.question_text}</p>

              {q.media_url && (
                <div className="mt-4">
                  {q.media_type === 'image' && (
                    <img src={q.media_url} alt="Question" className="max-h-96 rounded-2xl mx-auto" />
                  )}
                  {q.media_type === 'audio' && (
                    <audio src={q.media_url} controls className="w-full" />
                  )}
                  {q.media_type === 'video' && (
                    <video src={q.media_url} controls className="w-full rounded-2xl" />
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-3">
                {(q.type === 'multiple_choice' || q.type === 'true_false') && (q.options || (q.type === 'true_false' ? ['True', 'False'] : [])).map((opt: string, idx: number) => {
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      type="button"
                      key={`${q.id}_${idx}`}
                      onClick={() => setAnswer(q.id, opt)}
                      className={`w-full text-left rounded-2xl border-2 px-4 py-3 font-extrabold transition-all ${isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-white/60 bg-white/60 hover:bg-white text-gray-900'}
                      `}
                    >
                      {opt}
                    </button>
                  );
                })}

                {q.type === 'kids_color_picker' && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-4">
                    {(q.options || []).map((clr: string, i: number) => {
                      const isSelected = answers[q.id] === clr;
                      const safeColor = /^#([0-9A-Fa-f]{3}){1,2}$/.test(clr) ? clr : '#ffffff';
                      return (
                        <button
                          type="button"
                          key={`${q.id}_color_${i}`}
                          onClick={() => setAnswer(q.id, clr)}
                          className={`rounded-full h-16 w-16 border-4 transition-all ${isSelected ? 'ring-4 ring-offset-2 ring-yellow-400 scale-110' : 'border-gray-300'}`}
                          style={{ background: safeColor }}
                          aria-label={`Color ${i + 1}`}
                          title={clr}
                        />
                      );
                    })}
                  </div>
                )}

                {q.type === 'kids_odd_one_out' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i: number) => {
                      const isSelected = answers[q.id] === String(i);
                      const val = (q.options || [])[i] || '';
                      return (
                        <button
                          type="button"
                          key={`${q.id}_odd_${i}`}
                          onClick={() => setAnswer(q.id, String(i))}
                          className={`rounded-2xl border-4 p-4 transition-all text-center overflow-hidden ${isSelected ? 'border-green-500 bg-green-50 ring-4 ring-green-300 scale-105' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                        >
                          {val.startsWith('http') ? (
                            <img src={val} alt={`item-${i + 1}`} className="h-24 w-full object-cover rounded" />
                          ) : (
                            <span className="font-bold text-lg">{val || 'Item'}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === 'kids_picture_pairing' && (
                  <div className="space-y-4">
                    <div className="text-sm font-bold text-gray-700 bg-amber-50 rounded-lg p-3">
                      👈 Tap an item on the left, then tap its match on the right
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-purple-600 mb-3 bg-purple-50 rounded p-2">LEFT</p>
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i: number) => {
                            const val = (q.options || [])[i] || '';
                            const pairs = (answers[q.id] || []) as number[];
                            const isSelected = pairs.some((_, idx) => idx % 2 === 0 && pairs[idx] === i);
                            const isPaired = pairs.some((p) => p === i);
                            return (
                              <button
                                type="button"
                                key={`pair_left_${i}`}
                                onClick={() => {
                                  const current = (answers[q.id] || []) as number[];
                                  if (current.length % 2 === 0) {
                                    setAnswer(q.id, [...current, i]);
                                  }
                                }}
                                disabled={isPaired && !isSelected}
                                className={`w-full rounded-2xl border-4 p-4 text-sm font-bold transition-all ${
                                  isSelected ? 'border-purple-600 bg-purple-100 ring-4 ring-purple-300' : isPaired ? 'opacity-50 cursor-default border-gray-200' : 'border-purple-200 bg-white hover:border-purple-300'
                                }`}
                              >
                                {val.startsWith('http') ? (
                                  <img src={val} alt={`left-${i}`} className="h-16 w-full object-cover rounded" />
                                ) : (
                                  val || `Item ${i + 1}`
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-600 mb-3 bg-blue-50 rounded p-2">RIGHT</p>
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i: number) => {
                            const val = (q.options || [])[i + 4] || '';
                            const pairs = (answers[q.id] || []) as number[];
                            const isSelected = pairs.some((_, idx) => idx % 2 === 1 && pairs[idx] === i);
                            const isPaired = pairs.some((p) => p === i);
                            return (
                              <button
                                type="button"
                                key={`pair_right_${i}`}
                                onClick={() => {
                                  const current = (answers[q.id] || []) as number[];
                                  if (current.length % 2 === 1) {
                                    setAnswer(q.id, [...current, i]);
                                  }
                                }}
                                disabled={isPaired && !isSelected}
                                className={`w-full rounded-2xl border-4 p-4 text-sm font-bold transition-all ${
                                  isSelected ? 'border-blue-600 bg-blue-100 ring-4 ring-blue-300' : isPaired ? 'opacity-50 cursor-default border-gray-200' : 'border-blue-200 bg-white hover:border-blue-300'
                                }`}
                              >
                                {val.startsWith('http') ? (
                                  <img src={val} alt={`right-${i}`} className="h-16 w-full object-cover rounded" />
                                ) : (
                                  val || `Match ${i + 1}`
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {q.type === 'kids_story_sequence' && (
                  <div className="space-y-4">
                    <div className="text-sm font-bold text-gray-700 bg-amber-50 rounded-lg p-3">
                      🎬 Drag the cards below to arrange them in the correct order
                    </div>
                    <div className="space-y-3">
                      {((answers[q.id] || (q.options || []).map((_, i) => i)) as number[]).map((idx: number, pos: number) => {
                        const val = (q.options || [])[idx] || '';
                        return (
                          <div
                            key={`seq_${pos}`}
                            className="rounded-2xl border-4 border-purple-300 bg-gradient-to-r from-purple-50 to-purple-100 p-4 text-center font-bold cursor-grab active:cursor-grabbing transition-all hover:shadow-lg"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer?.setData('dragIdx', String(pos));
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const dragIdx = parseInt(e.dataTransfer?.getData('dragIdx') || '-1');
                              if (dragIdx !== -1 && dragIdx !== pos) {
                                const current = (answers[q.id] || (q.options || []).map((_, i) => i)) as number[];
                                [current[dragIdx], current[pos]] = [current[pos], current[dragIdx]];
                                setAnswer(q.id, current);
                              }
                            }}
                          >
                            <div className="text-2xl font-black text-purple-600 mb-2">{pos + 1}</div>
                            {val.startsWith('http') ? (
                              <img src={val} alt={`card-${pos}`} className="h-28 w-full object-cover rounded-lg" />
                            ) : (
                              <div className="text-lg">{val}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex-1 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 font-extrabold py-3 disabled:opacity-60"
                >
                  Previous
                </button>

                {currentIndex < totalQuestions - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl bg-gradient-to-r from-pink-500 via-indigo-600 to-purple-600 hover:from-pink-600 hover:via-indigo-700 hover:to-purple-700 text-white font-extrabold py-3 disabled:opacity-60"
                  >
                    {isSubmitting ? 'Submitting…' : 'Finish'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
