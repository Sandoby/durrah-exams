import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { CheckCircle, Loader2, Sparkles, Star, Trophy, AlertCircle, Rocket, Orbit } from 'lucide-react';
import Latex from 'react-latex-next';

import { supabase } from '../lib/supabase';
import { KidsLeaderboard } from '../components/kids/KidsLeaderboard';
import { Logo } from '../components/Logo';

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

export default function KidsExamView() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);

  const isSubmittingRef = useRef(false);

  // Interactive Particle Background (Shared with KidsLanding)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: any[] = [];
    const particleCount = 80;
    let mouse = { x: -100, y: -100 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number; y: number; size: number; speedX: number; speedY: number; color: string;
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        const colors = ['#6366f1', '#a855f7', '#ec4899', '#fdd835', '#26c6da'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x > canvas!.width) this.x = 0;
        if (this.x < 0) this.x = canvas!.width;
        if (this.y > canvas!.height) this.y = 0;
        if (this.y < 0) this.y = canvas!.height;

        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (100 - distance) / 100;
          this.x -= forceDirectionX * force * 3;
          this.y -= forceDirectionY * force * 3;
        }
      }
      draw() {
        ctx!.fillStyle = this.color;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) particles.push(new Particle());
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    resize();
    init();
    animate();

    return () => window.removeEventListener('resize', resize);
  }, []);

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

        if (settings.randomize_questions) {
          for (let i = processed.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [processed[i], processed[j]] = [processed[j], processed[i]];
          }
        }

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
  }, [id, navigate]);

  if (!id) return <Navigate to="/kids" replace />;

  if (!safeNick || !safeCode) {
    toast.error('Please enter nickname and code');
    return <Navigate to="/kids" replace />;
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-[#050616] relative overflow-hidden flex items-center justify-center p-4">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />
        <div className="relative z-10 w-full max-w-md glass-panel p-8 rounded-[2.5rem] border-white/10 text-center shadow-3xl">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-red-500/10 rounded-3xl flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">Mission On Hold</h1>
          <p className="text-indigo-200/60 mb-8 leading-relaxed font-medium">
            Hi <strong>{safeNick}</strong>, your mission attempts for this code have reached their limit. Ask your tutor for more fuel!
          </p>
          <button
            onClick={() => navigate('/kids')}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black transition-all shadow-xl"
          >
            Go Back
          </button>
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
      const answersPayload = (exam.questions || []).map((q) => ({ question_id: q.id, answer: answers[q.id] }));
      const submissionData = {
        exam_id: id, child_mode: true, nickname: safeNick, quiz_code: safeCode,
        student_data: { name: safeNick, email: `${encodeURIComponent(safeNick || 'kid')}@kids.local` },
        answers: answersPayload, violations: [],
        browser_info: { user_agent: navigator.userAgent, language: navigator.language, screen_width: window.screen.width, screen_height: window.screen.height },
        time_taken: timeTakenSeconds
      };
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify(submissionData)
      });
      if (!response.ok) throw new Error('Server error');
      const result = await response.json();
      setScore({ score: result.score, max_score: result.max_score, percentage: result.percentage, submission_id: result.submission_id });
      setSubmitted(true);
      toast.success('Great job! 🎉');
    } catch (e: any) {
      toast.error('Failed to submit');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (isLoading || !exam) {
    return (
      <div className="min-h-screen bg-[#050616] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (exam.is_active === false) {
    return (
      <div className="min-h-screen bg-[#050616] flex items-center justify-center p-4 text-center">
        <div className="glass-panel p-10 rounded-[2.5rem] border-white/10 max-w-md">
          <Orbit className="h-16 w-16 text-indigo-500 animate-spin-slow mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white mb-4 uppercase">Mission Offline</h2>
          <p className="text-indigo-200/60 font-medium">This planetary mission is currently paused by the commander. Please return later!</p>
          <button onClick={() => navigate('/kids')} className="mt-8 px-8 py-3 bg-white/5 rounded-2xl text-white font-bold border border-white/10">Back to Earth</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const showResults = Boolean(exam?.settings?.show_results_immediately);
    const showLeaderboard = leaderboardVisibility === 'always' || (leaderboardVisibility === 'after_submit' && submitted);
    const getRewardEmoji = (percentage: number) => {
      if (percentage >= 90) return { emoji: '🏆', msg: 'SUPERSTAR!', color: 'from-orange-400 to-yellow-400', icon: 'image-1765886669181.png' }
      if (percentage >= 75) return { emoji: '⭐', msg: 'GREAT JOB!', color: 'from-indigo-400 to-purple-400', icon: 'image-1765886659078.png' }
      if (percentage >= 60) return { emoji: '👍', msg: 'WELL DONE!', color: 'from-emerald-400 to-teal-400', icon: 'image-1765886652001.png' }
      return { emoji: '💪', msg: 'KEEP TRYING!', color: 'from-pink-400 to-rose-400', icon: 'image-1765886645584.png' }
    }
    const reward = score ? getRewardEmoji(score.percentage) : null;

    return (
      <div className="min-h-screen bg-[#050616] relative overflow-hidden flex items-center justify-center p-6 py-20">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40" />
        <div className="relative z-10 w-full max-w-2xl glass-panel p-8 sm:p-12 rounded-[3rem] border-white/10 text-center shadow-3xl">
          {reward && (
            <div className="mb-8">
              <div className="h-32 w-32 mx-auto relative mb-6">
                <img src={`/kids/${reward.icon}`} className="w-full h-full object-contain animate-float" alt="Reward" />
                <div className="absolute inset-x-0 bottom-0 h-4 bg-indigo-500/20 blur-xl rounded-full" />
              </div>
              <h1 className={`text-5xl sm:text-7xl font-black bg-gradient-to-r ${reward.color} bg-clip-text text-transparent uppercase tracking-tighter mb-2`}>
                {reward.msg}
              </h1>
              <p className="text-xl text-indigo-200/80 font-bold">Mission Complete, Explorer {safeNick}!</p>
            </div>
          )}

          {showResults && score && (
            <div className={`inline-block px-10 py-6 rounded-[2rem] bg-gradient-to-tr ${reward?.color} text-white shadow-3xl transform hover:scale-105 transition-all duration-500 mb-8`}>
              <div className="text-6xl font-black leading-none mb-1">{score.percentage.toFixed(0)}%</div>
              <div className="text-sm font-black uppercase tracking-widest opacity-80">{score.score} / {score.max_score} POINTS</div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            <div className="glass-panel p-4 rounded-2xl group hover:border-yellow-500/30 transition-all">
              <Star className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{stars}</div>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Stars</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl group hover:border-indigo-400/30 transition-all">
              <Sparkles className="h-6 w-6 text-indigo-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{streak}</div>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Streak</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl group hover:border-pink-400/30 transition-all col-span-2 sm:col-span-1">
              <Trophy className="h-6 w-6 text-pink-400 mx-auto mb-2" />
              <div className="text-xl font-black text-white">BRAVE</div>
              <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Quizzer</p>
            </div>
          </div>

          {showLeaderboard && (
            <div className="mb-10 text-left">
              <KidsLeaderboard examId={id!} nickname={safeNick} refreshKey={score?.submission_id || 'submitted'} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/kids')}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-wider transition-all"
            >
              Finish Mission
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white font-black uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
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
    <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#050616] relative overflow-hidden font-sans">
      <Helmet><title>Mission Terminal | Durrah</title></Helmet>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-50" />

      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <style>{`
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .hologram-glow { filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.3)); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-32 pb-32">
        {/* Top HUD */}
        <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 pt-4">
          <div className="max-w-5xl mx-auto glass-panel p-4 sm:p-6 rounded-[2rem] border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                <Rocket className="h-7 w-7 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Active Explorer</p>
                <p className="text-xl font-black text-white">{safeNick}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex-1 sm:flex-initial glass-panel px-5 py-3 rounded-2xl flex items-center justify-center gap-3 border-indigo-500/20">
                <Star className="h-5 w-5 text-yellow-400" />
                <span className="text-xl font-black text-white">{stars}</span>
              </div>
              <div className="flex-1 sm:flex-initial bg-white/5 border border-white/10 px-5 py-3 rounded-2xl">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-[10px] text-white/30 font-black uppercase tracking-widest">Progress</span>
                  <span className="text-[10px] text-indigo-400 font-black">{progress}%</span>
                </div>
                <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Start Mission Gate */}
        {!started ? (
          <div className="glass-panel p-8 sm:p-16 rounded-[3rem] border-white/10 text-center shadow-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 uppercase tracking-tighter">
                Mission <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Briefing</span>
              </h1>
              <p className="text-xl text-indigo-200/60 max-w-lg mx-auto mb-10 font-medium">{exam.title}</p>

              <div className="inline-flex flex-col bg-white/5 border border-white/10 px-8 py-5 rounded-[2rem] mb-10 w-full sm:w-auto">
                <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase mb-1">Access Protocol</span>
                <span className="text-3xl font-black text-white tracking-[0.3em]">{safeCode}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/kids')}
                  className="py-5 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-wider hover:bg-white/10 transition-all font-bold"
                >
                  Abort Mission
                </button>
                <button
                  onClick={() => { setStarted(true); setStartedAt(Date.now()); toast.success('Protocols activated!'); }}
                  className="py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  Engage Engines <Rocket className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Question Hologram */}
            <div className="glass-panel p-6 sm:p-12 rounded-[3.5rem] border-white/10 shadow-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-1 opacity-20">
                <div className="w-16 h-[2px] bg-indigo-500" />
                <div className="w-8 h-[2px] bg-indigo-500" />
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="px-5 py-2 glass-panel rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] border-indigo-500/20">
                  Data Module {currentIndex + 1} / {totalQuestions}
                </div>
                <div className="flex-1 h-[1px] bg-white/5" />
                <div className="px-5 py-2 bg-indigo-500/10 rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                  {q.points} XP Available
                </div>
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-8">
                <Latex>{q.question_text}</Latex>
              </h2>

              {q.media_url && (
                <div className="mb-10 rounded-3xl overflow-hidden glass-panel p-2">
                  {q.media_type === 'image' && <img src={q.media_url} alt="Intel" className="w-full max-h-[400px] object-contain rounded-2xl" />}
                  {q.media_type === 'audio' && <audio src={q.media_url} controls className="w-full" />}
                  {q.media_type === 'video' && <video src={q.media_url} controls className="w-full rounded-2xl" />}
                </div>
              )}

              {/* Interaction Zone */}
              <div className="grid gap-4">
                {(q.type === 'multiple_choice' || q.type === 'true_false') && (q.options || (q.type === 'true_false' ? ['True', 'False'] : [])).map((opt: string, idx: number) => {
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={`${q.id}_${idx}`}
                      onClick={() => setAnswer(q.id, opt)}
                      className={`w-full text-left p-5 rounded-2xl border-2 transition-all group relative overflow-hidden ${isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={`h-8 w-8 rounded-xl border-2 flex items-center justify-center font-black transition-colors ${isSelected ? 'border-none bg-indigo-500 text-white' : 'border-white/10 text-white/30'}`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-indigo-100/60'}`}><Latex>{opt}</Latex></span>
                      </div>
                      {isSelected && <div className="absolute inset-y-0 right-5 flex items-center"><CheckCircle className="text-indigo-400 h-6 w-6" /></div>}
                    </button>
                  );
                })}

                {/* Picture Pairing zone */}
                {q.type === 'kids_picture_pairing' && (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest pl-2">Source Units</p>
                      {Array.from({ length: 4 }).map((_, i) => {
                        const val = (q.options || [])[i] || '';
                        const pairs = (answers[q.id] || []) as number[];
                        const isSelected = pairs.some((_, idx) => idx % 2 === 0 && pairs[idx] === i);
                        const isPaired = pairs.some((p) => p === i);
                        return (
                          <button
                            key={`pair_left_${i}`}
                            onClick={() => { if (pairs.length % 2 === 0) setAnswer(q.id, [...pairs, i]); }}
                            disabled={isPaired && !isSelected}
                            className={`w-full p-4 rounded-3xl border-2 transition-all aspect-video overflow-hidden flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-500/10 shadow-lg' : isPaired ? 'opacity-30 border-none' : 'glass-panel border-white/10 hover:border-white/20'}`}
                          >
                            {val.startsWith('http') ? <img src={val} className="w-full h-full object-cover rounded-xl" alt="" /> : <span className="text-white font-black">{val || i + 1}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest pl-2 text-right">Match Units</p>
                      {Array.from({ length: 4 }).map((_, i) => {
                        const val = (q.options || [])[i + 4] || '';
                        const pairs = (answers[q.id] || []) as number[];
                        const isSelected = pairs.some((_, idx) => idx % 2 === 1 && pairs[idx] === i);
                        const isPaired = pairs.some((p) => p === i);
                        return (
                          <button
                            key={`pair_right_${i}`}
                            onClick={() => { if (pairs.length % 2 === 1) setAnswer(q.id, [...pairs, i]); }}
                            disabled={isPaired && !isSelected}
                            className={`w-full p-4 rounded-3xl border-2 transition-all aspect-video overflow-hidden flex items-center justify-center ${isSelected ? 'border-purple-500 bg-purple-500/10 shadow-lg' : isPaired ? 'opacity-30 border-none' : 'glass-panel border-white/10 hover:border-white/20'}`}
                          >
                            {val.startsWith('http') ? <img src={val} className="w-full h-full object-cover rounded-xl" alt="" /> : <span className="text-white font-black">{val || i + 1}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Story Sequence zone */}
                {q.type === 'kids_story_sequence' && (
                  <div className="flex flex-wrap gap-4 pt-4">
                    {((answers[q.id] || (q.options || []).map((_, i) => i)) as number[]).map((idx, pos) => {
                      const val = (q.options || [])[idx] || '';
                      return (
                        <div
                          key={`seq_${pos}`}
                          draggable
                          onDragStart={(e) => { e.dataTransfer?.setData('dragIdx', String(pos)); }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dragIdx = parseInt(e.dataTransfer?.getData('dragIdx') || '-1');
                            if (dragIdx !== -1 && dragIdx !== pos) {
                              const current = (answers[q.id] || (q.options || []).map((_, i) => i)) as number[];
                              [current[dragIdx], current[pos]] = [current[pos], current[dragIdx]];
                              setAnswer(q.id, [...current]);
                            }
                          }}
                          className="glass-panel p-4 rounded-[2rem] border-indigo-500/20 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all text-center flex-1 min-w-[150px]"
                        >
                          <div className="h-10 w-10 mx-auto bg-indigo-500 text-white font-black rounded-xl flex items-center justify-center mb-4 text-sm shadow-lg shadow-indigo-500/30">{pos + 1}</div>
                          {val.startsWith('http') ? <img src={val} className="w-full h-32 object-cover rounded-2xl mb-2" alt="" /> : <div className="text-white font-bold h-32 flex items-center justify-center px-4">{val}</div>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Navigation Controls */}
              <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="w-full sm:w-auto px-10 py-4 glass-panel rounded-2xl text-indigo-200 font-bold disabled:opacity-30 transition-all uppercase tracking-widest"
                >
                  Back Unit
                </button>
                <div className="flex-1" />
                {currentIndex < totalQuestions - 1 ? (
                  <button
                    onClick={goNext}
                    className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Next Phase <Rocket className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-12 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/30 animate-glow transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <>Complete Mission <CheckCircle className="h-5 w-5" /></>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Brand Bar */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
          <div className="glass-panel px-6 py-4 rounded-[2.5rem] flex items-center justify-center gap-4 shadow-3xl border-white/5">
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-white/30 font-black tracking-[0.2em] uppercase leading-none mb-1">Secured By</span>
              <span className="text-[10px] text-white font-black tracking-tight leading-none group-hover:text-indigo-400">Durrah <span className="text-indigo-400">for Tutors</span></span>
            </div>
            <div className="h-6 w-[1px] bg-white/5" />
            <Logo showText={false} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
