import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import 'driver.js/dist/driver.css';
import '../styles/driver-theme.css';
import { Play, RotateCcw, ArrowRight, CheckCircle, Plus, Share2, BarChart3, BookOpen, Users, Shield, Zap, MousePointerClick } from 'lucide-react';
import { Logo } from '../components/Logo';

export default function DemoPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

    const scenarios = [
        { 
            id: 'create-exam', 
            title: t('demo.scenarios.createExam.title', 'Create Your First Exam'), 
            description: t('demo.scenarios.createExam.desc', 'Learn how to create a professional exam in minutes'), 
            icon: Plus, 
            color: 'from-indigo-500 to-violet-500',
            action: () => {
                localStorage.setItem('demoMode', 'true');
                localStorage.setItem('demoScenario', 'create-exam');
                navigate('/exam/new?demo=true');
            }
        },
        { 
            id: 'share-monitor', 
            title: t('demo.scenarios.shareMonitor.title', 'Share & Monitor Live'), 
            description: t('demo.scenarios.shareMonitor.desc', 'See how to share exams and track student progress'), 
            icon: Share2, 
            color: 'from-green-500 to-emerald-500',
            action: () => {
                localStorage.setItem('demoMode', 'true');
                localStorage.setItem('demoScenario', 'share-monitor');
                navigate('/dashboard?demo=true&showSharing=true');
            }
        },
        { 
            id: 'view-analytics', 
            title: t('demo.scenarios.viewAnalytics.title', 'View Analytics & Results'), 
            description: t('demo.scenarios.viewAnalytics.desc', 'Explore powerful analytics and grading features'), 
            icon: BarChart3, 
            color: 'from-purple-500 to-fuchsia-500',
            action: () => {
                localStorage.setItem('demoMode', 'true');
                localStorage.setItem('demoScenario', 'view-analytics');
                navigate('/dashboard?demo=true&showAnalytics=true');
            }
        },
        { 
            id: 'question-bank', 
            title: t('demo.scenarios.questionBank.title', 'Question Bank Workflow'), 
            description: t('demo.scenarios.questionBank.desc', 'Manage and reuse questions efficiently'), 
            icon: BookOpen, 
            color: 'from-orange-500 to-red-500',
            action: () => {
                localStorage.setItem('demoMode', 'true');
                localStorage.setItem('demoScenario', 'question-bank');
                navigate('/question-bank?demo=true');
            }
        }
    ];

    const startScenario = (scenario: typeof scenarios[0]) => {
        setCompletedSteps(prev => new Set([...prev, scenario.id]));
        scenario.action();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-violet-50/30 dark:from-gray-900 dark:via-indigo-950/30 dark:to-violet-950/30">
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-50 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl">
                <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
                    <Link to="/" className="flex items-center gap-2 sm:gap-3">
                        <Logo className="h-8 w-8 sm:h-9 sm:w-9" showText={false} />
                        <div className="flex flex-col"><span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span><span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">Interactive Demo</span></div>
                    </Link>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={() => { setCompletedSteps(new Set()); }} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition-colors">
                            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Reset</span>
                        </button>
                        <Link to="/register" className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-full font-medium text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all">
                            Start Free<ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Link>
                    </div>
                </div>
            </nav>
            <section className="pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-full px-4 py-2 mb-6">
                        <MousePointerClick className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /><span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Interactive Experience</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 dark:text-white mb-4 sm:mb-6 leading-tight">Experience Durrah<br /><span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">in 2 Minutes</span></h1>
                    <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">Click through interactive scenarios. No signup required!</p>
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" /><span>No Signup</span></div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" /><span>100% Interactive</span></div>
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" /><span>2 Minutes</span></div>
                    </div>
                </div>
            </section>
            <section className="pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-8 sm:mb-12"><h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Choose Your Journey</h2><p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Select a scenario to explore!</p></div>
                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                        {scenarios.map((s) => { const Icon = s.icon; const done = completedSteps.has(s.id); return (
                            <div key={s.id} id={`scenario-${s.id}`} className={`relative group bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${done ? 'border-green-500' : 'border-gray-200 dark:border-slate-700'} hover:-translate-y-1 p-4 sm:p-6 cursor-pointer`} onClick={() => startScenario(s)}>
                                {done && <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 bg-green-500 text-white rounded-full p-1.5 sm:p-2 shadow-lg"><CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /></div>}
                                <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}><Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" /></div>
                                    <div className="flex-1 min-w-0"><h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{s.title}</h3><p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{s.description}</p></div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Interactive Demo</span>
                                    <button onClick={(e) => { e.stopPropagation(); startScenario(s); }} className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:scale-105`}>
                                        <Play className="w-3 h-3 sm:w-4 sm:h-4" />Start Demo
                                    </button>
                                </div>
                            </div>
                        ); })}
                    </div>
                </div>
            </section>
            <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
                <div className="max-w-6xl mx-auto"><div className="text-center mb-8 sm:mb-12"><h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Why Tutors Love Durrah</h2></div>
                    <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
                        {[{ icon: Zap, title: 'Lightning Fast', desc: 'Create exams in minutes' }, { icon: Shield, title: 'Anti-Cheating', desc: 'Built-in security' }, { icon: Users, title: 'Unlimited Students', desc: 'No limits' }].map((f, i) => { const Icon = f.icon; return (
                            <div key={i} className="text-center"><div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center"><Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" /></div><h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2">{f.title}</h3><p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{f.desc}</p></div>
                        ); })}
                    </div>
                </div>
            </section>
            <section id="cta-section" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
                <div className="max-w-4xl mx-auto text-center"><h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">Ready to Create Your First Exam?</h2><p className="text-base sm:text-xl text-indigo-100 mb-6 sm:mb-8">Start free trial - no credit card required.</p>
                    <Link to="/register" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold hover:shadow-2xl hover:scale-105 transition-all">Get Started Free<ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" /></Link>
                </div>
            </section>
        </div>
    );
}
