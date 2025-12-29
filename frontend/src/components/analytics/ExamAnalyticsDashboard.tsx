import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, BarChart3, Users, Activity, TrendingUp, Calendar, LogOut, Settings, Menu, X, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import toast from 'react-hot-toast';
import {
    BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';

interface SubmissionData {
    id: string;
    student_name: string;
    student_email: string;
    score: number;
    total_points: number;
    max_score?: number;
    percentage?: number;
    submitted_at: string;
    created_at?: string;
    time_taken?: number | null;
    student_data?: any;
    answers?: any;
}

interface QuestionStats {
    question_text: string;
    correct_count: number;
    incorrect_count: number;
    average_time: number;
}

export function ExamAnalyticsDashboard() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState<any>(null);
    const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
    const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (examId) {
            fetchAnalytics();
        }
    }, [examId]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error logging out');
        }
    };

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);

            // Fetch exam details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .single();

            if (examError) throw examError;
            setExam(examData);

            // Fetch submissions with created_at instead of submitted_at
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('submissions')
                .select('*')
                .eq('exam_id', examId)
                .order('created_at', { ascending: false });

            if (submissionsError) throw submissionsError;

            // Transform submissions to match expected format
            const transformedSubmissions = (submissionsData || []).map(sub => ({
                ...sub,
                submitted_at: sub.created_at,
                total_points: sub.max_score,
                time_taken: sub.time_taken || 0
            }));

            setSubmissions(transformedSubmissions);

            // Calculate score distribution
            if (submissionsData && submissionsData.length > 0) {
                const distribution = Array(11).fill(0);
                submissionsData.forEach(sub => {
                    if (sub.max_score && sub.max_score > 0) {
                        const percentage = (sub.score / sub.max_score) * 100;
                        const bucket = Math.floor(percentage / 10);
                        distribution[Math.min(bucket, 10)]++;
                    }
                });

                setScoreDistribution(
                    distribution.map((count, index) => ({
                        range: `${index * 10}-${(index + 1) * 10}%`,
                        students: count
                    }))
                );
            }

            // Fetch questions from questions table
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', examId)
                .order('created_at', { ascending: true });

            if (questionsError) {
                console.error('Error fetching questions:', questionsError);
            }

            // Fetch all submission answers for this exam
            if (questionsData && questionsData.length > 0 && submissionsData && submissionsData.length > 0) {
                const submissionIds = submissionsData.map(s => s.id);

                const { data: answersData, error: answersError } = await supabase
                    .from('submission_answers')
                    .select('*')
                    .in('submission_id', submissionIds);

                if (answersError) {
                    console.error('Error fetching answers:', answersError);
                }

                // Calculate stats for each question
                const stats = questionsData.map(q => {
                    let correctCount = 0;
                    let incorrectCount = 0;

                    if (answersData) {
                        answersData.forEach(answer => {
                            if (answer.question_id === q.id) {
                                if (answer.is_correct) {
                                    correctCount++;
                                } else {
                                    incorrectCount++;
                                }
                            }
                        });
                    }

                    return {
                        question_text: q.question_text || `Question`,
                        correct_count: correctCount,
                        incorrect_count: incorrectCount,
                        average_time: 0 // Time not tracked in current schema
                    };
                });

                setQuestionStats(stats);
            }
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    const studentFields = (exam?.required_fields || []).length
        ? exam.required_fields || []
        : ['name'];

    const resolveFieldValue = (s: SubmissionData, field: string) => {
        if (field === 'name') return s.student_data?.name || s.student_name || '-';
        if (field === 'email') return s.student_data?.email || s.student_email || '-';
        return s.student_data?.[field] ?? (s as any)[field] ?? '-';
    };

    const formatDuration = (seconds?: number | null) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const exportResults = async (format: 'csv' | 'pdf') => {
        try {
            if (format === 'csv') {
                const headers = [...studentFields.map((f: string) => f.replace(/_/g, ' ')), 'Score', 'Max Score', 'Percentage', 'Submitted At'];
                const rows = submissions.map((s) => {
                    const maxScore = s.max_score || s.total_points || 1;
                    const percentage = s.percentage ? `${s.percentage.toFixed(2)}%` : `${(((s.score || 0) / maxScore) * 100).toFixed(2)}%`;
                    const dynamicFields = studentFields.map((f: string) => resolveFieldValue(s, f));
                    return [
                        ...dynamicFields,
                        s.score || 0,
                        maxScore,
                        percentage,
                        new Date(s.submitted_at || s.created_at || new Date()).toLocaleString()
                    ];
                });

                const csv = [headers, ...rows].map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${exam?.title}-results.csv`;
                a.click();
                window.URL.revokeObjectURL(url);

                toast.success('Results exported as CSV');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            toast.error('Export failed');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    const avgScore = submissions.length > 0
        ? (submissions.reduce((sum, s) => {
            const maxScore = s.max_score || s.total_points || 1;
            return sum + ((s.score || 0) / maxScore);
        }, 0) / submissions.length * 100).toFixed(1)
        : 0;


    const passRate = submissions.length > 0
        ? ((submissions.filter(s => {
            const max = s.max_score || s.total_points || 1;
            return ((s.score || 0) / max) >= 0.5;
        }).length / submissions.length) * 100).toFixed(0)
        : '0';

    const avgTimeTaken = submissions.length > 0
        ? formatDuration(Math.round(submissions.reduce((sum, s) => sum + (s.time_taken || 0), 0) / submissions.length))
        : '0:00';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 font-sans relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

            {/* Navbar */}
            <nav className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8 mb-8">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between h-16 px-6">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-3">
                            <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>

                            <Link
                                to="/settings"
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Settings className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('settings.title', 'Settings')}</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <LogOut className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('nav.logout', 'Logout')}</span>
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="h-6 w-6" />
                                ) : (
                                    <Menu className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mx-auto max-w-7xl">
                        <div className="px-4 py-3 space-y-2">
                            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 font-medium">
                                {user?.user_metadata?.full_name || user?.email}
                            </div>
                            <Link
                                to="/settings"
                                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Settings className="h-5 w-5 mr-3" />
                                {t('settings.title', 'Settings')}
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <LogOut className="h-5 w-5 mr-3" />
                                {t('nav.logout', 'Logout')}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-800 to-indigo-900 dark:from-white dark:via-indigo-200 dark:to-indigo-400">
                                {exam?.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Activity className="h-4 w-4 text-indigo-500" />
                                <span>Analytics Dashboard</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span>Updated {new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => exportResults('csv')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 font-medium"
                    >
                        <Download className="h-5 w-5" />
                        <span>Export CSV</span>
                    </button>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Card 1: Total Candidates */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="h-20 w-20 text-blue-600" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Candidates</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{submissions.length}</h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Participants</p>
                        </div>
                    </div>

                    {/* Card 2: Avg Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BarChart3 className="h-20 w-20 text-indigo-600" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Score</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{avgScore}%</h3>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">Performance</p>
                        </div>
                    </div>

                    {/* Card 3: Pass Rate */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="h-20 w-20 text-emerald-600" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pass Rate</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{passRate}%</h3>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">Success</p>
                        </div>
                    </div>

                    {/* Card 4: Avg Time Taken */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Clock className="h-20 w-20 text-orange-500" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Time Taken</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{avgTimeTaken}</h3>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">Efficiency</p>
                        </div>
                    </div>
                </div>

                {/* Main Charts Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Score Distribution Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Score Distribution</h3>
                                <p className="text-sm text-gray-500">How students performed across ranges</p>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={scoreDistribution}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="students" fill="url(#colorScore)" radius={[6, 6, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Timeline Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submission Timeline</h3>
                                <p className="text-sm text-gray-500">Performance trend over time</p>
                            </div>
                            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={submissions.map((s, idx) => ({
                                    index: idx + 1,
                                    score: s.max_score ? ((s.score / s.max_score) * 100) : 0,
                                    date: new Date(s.submitted_at).toLocaleDateString()
                                }))}>
                                    <defs>
                                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="index" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Question Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Question Analysis</h2>
                        <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">View detailed report</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-gray-800">
                                <tr>
                                    <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Question</th>
                                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Correct</th>
                                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Incorrect</th>
                                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {questionStats.map((q, idx) => {
                                    const total = q.correct_count + q.incorrect_count;
                                    const successRate = total > 0 ? ((q.correct_count / total) * 100).toFixed(2) : 0;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white max-w-md truncate">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 font-mono">Q{idx + 1}</span>
                                                    <span className="truncate">{q.question_text}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    {q.correct_count}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                    {q.incorrect_count}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{successRate}%</span>
                                                    <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${Number(successRate) >= 70 ? 'bg-green-500' : Number(successRate) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                            style={{ width: `${successRate}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Student Submissions</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 dark:bg-gray-800">
                                <tr>
                                    {studentFields.map((field: string) => (
                                        <th key={field} className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {field.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                    <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                                    <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {submissions.map((s) => {
                                    const maxScore = s.max_score || s.total_points || 1;
                                    const percentage = s.percentage ? s.percentage : ((s.score || 0) / maxScore) * 100;
                                    const passed = percentage >= 50;

                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            {studentFields.map((field: string) => (
                                                <td key={field} className="py-4 px-6 text-sm font-medium text-gray-900 dark:text-white">
                                                    {resolveFieldValue(s, field)}
                                                </td>
                                            ))}
                                            <td className="py-4 px-6 text-sm text-center">
                                                <div className="font-bold text-gray-900 dark:text-white">{s.score || 0} <span className="text-gray-400 font-normal">/ {maxScore}</span></div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-center text-gray-600 dark:text-gray-400">
                                                {formatDuration(s.time_taken)}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${passed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    {percentage.toFixed(1)}% {passed ? 'Pass' : 'Fail'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400 text-right font-mono">
                                                {new Date(s.submitted_at || s.created_at || new Date()).toLocaleDateString()}
                                                <span className="ml-2 text-xs text-gray-400">{new Date(s.submitted_at || s.created_at || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
