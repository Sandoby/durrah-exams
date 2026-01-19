import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Download, BarChart3, Users,
    LogOut, Settings, Menu, X,
    Clock, Search, CheckCircle2, XCircle, Printer,
    RotateCcw, Trophy, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { printerService } from '../lib/printer';
import { downloaderService } from '../lib/downloader';
import * as XLSX from 'xlsx';
import { KidsLeaderboard } from '../components/kids/KidsLeaderboard';
import { ConvexLeaderboard } from '../components/ConvexLeaderboard';
import { CONVEX_FEATURES } from '../main';
import { useConvex } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface Submission {
    id: string;
    student_name: string;
    student_email: string;
    score: number;
    max_score: number;
    created_at: string;
    violations: any[];
    child_mode?: boolean;
    nickname?: string;
    quiz_code?: string;
    time_taken?: number | null;
    browser_info?: {
        student_data?: Record<string, string>;
    };
}

export default function ExamResultsPage() {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const { examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState<any>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isKidsMode, setIsKidsMode] = useState(false);
    const [requiredFields, setRequiredFields] = useState<string[]>(['name', 'email']);
    const [reopenId, setReopenId] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
    const [questionMap, setQuestionMap] = useState<Record<string, any>>({});

    // Filtering & Sorting State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');

    // Get Convex client safely (will be null if no provider)
    const convex = (() => {
        try {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            return useConvex();
        } catch {
            return null;
        }
    })();

    const fieldLabels: Record<string, string> = {
        name: 'Name',
        email: 'Email',
        student_id: 'Student ID',
        phone: 'Phone'
    };

    useEffect(() => {
        if (examId && user) {
            fetchData();
        }
    }, [examId, user]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            // Fetch exam details
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('*')
                .eq('id', examId)
                .eq('tutor_id', user?.id)
                .single();

            if (examError) throw examError;
            setExam(examData);

            const settings = examData.settings || {};
            const kidsMode = Boolean(settings.child_mode_enabled);
            setIsKidsMode(kidsMode);
            setRequiredFields(examData.required_fields || ['name', 'email']);

            // Fetch submissions
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('submissions')
                .select('*')
                .eq('exam_id', examId)
                .order('created_at', { ascending: false });

            if (submissionsError) throw submissionsError;
            setSubmissions(submissionsData || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load results');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Error logging out');
        }
    };

    const formatDuration = (seconds?: number | null) => {
        if (seconds === null || seconds === undefined) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStudentFieldValue = (submission: Submission, field: string): string => {
        if (submission.child_mode && field === 'name') {
            return submission.nickname || 'Kid Player';
        }
        if (submission.browser_info?.student_data?.[field]) {
            return submission.browser_info.student_data[field];
        }
        if (field === 'name') return submission.student_name;
        if (field === 'email') return submission.student_email;
        return '-';
    };

    const filteredSubmissions = useMemo(() => {
        let result = [...submissions];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.student_name.toLowerCase().includes(query) ||
                s.student_email.toLowerCase().includes(query) ||
                (s.nickname && s.nickname.toLowerCase().includes(query))
            );
        }

        if (filterStatus !== 'all') {
            result = result.filter(s => {
                const percentage = s.max_score > 0 ? (s.score / s.max_score) : 0;
                return filterStatus === 'passed' ? percentage >= 0.5 : percentage < 0.5;
            });
        }

        result.sort((a, b) => {
            if (sortBy === 'score') {
                const pA = a.max_score > 0 ? (a.score / a.max_score) : 0;
                const pB = b.max_score > 0 ? (b.score / b.max_score) : 0;
                return pB - pA;
            }
            if (sortBy === 'duration') {
                return (b.time_taken || 0) - (a.time_taken || 0);
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        return result;
    }, [submissions, searchQuery, filterStatus, sortBy]);

    const exportToExcel = async () => {
        if (submissions.length === 0) {
            toast.error('No submissions to export');
            return;
        }

        setIsExporting(true);
        try {
            const excelData = filteredSubmissions.map((sub, index) => {
                const row: Record<string, any> = { '#': index + 1 };
                requiredFields.forEach(field => {
                    row[fieldLabels[field] || field] = getStudentFieldValue(sub, field);
                });
                row['Score'] = sub.score;
                row['Max Score'] = sub.max_score;
                row['Percentage'] = sub.max_score > 0 ? ((sub.score / sub.max_score) * 100).toFixed(2) + '%' : '0%';
                row['Duration'] = formatDuration(sub.time_taken);
                row['Submitted At'] = new Date(sub.created_at).toLocaleString();
                return row;
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);
            const colWidths = [{ wch: 5 }, ...requiredFields.map(() => ({ wch: 20 })), { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 20 }];
            ws['!cols'] = colWidths;
            XLSX.utils.book_append_sheet(wb, ws, 'Results');
            const filename = `${(exam?.title || 'Exam').replace(/[^a-z0-9]/gi, '_')}_results_${new Date().toISOString().split('T')[0]}.xlsx`;
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            await downloaderService.downloadFile(filename, excelBuffer, 'base64');
            toast.success('Results exported successfully!');
        } catch (error: any) {
            console.error('Error exporting:', error);
            toast.error('Failed to export results');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = async () => {
        try {
            const html = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #4f46e5;">Exam Results: ${exam?.title}</h1>
                    <p style="color: #6b7280;">Date: ${new Date().toLocaleDateString()}</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
                        <thead>
                            <tr style="background-color: #f9fafb;">
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">#</th>
                                ${requiredFields.map(f => `<th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">${fieldLabels[f] || f}</th>`).join('')}
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">Score</th>
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">Percentage</th>
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb;">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSubmissions.map((sub, index) => `
                                <tr>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${index + 1}</td>
                                    ${requiredFields.map(f => `<td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${getStudentFieldValue(sub, f)}</td>`).join('')}
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${sub.score} / ${sub.max_score}</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${sub.max_score > 0 ? ((sub.score / sub.max_score) * 100).toFixed(1) : 0}%</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${new Date(sub.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            await printerService.printHtml(html);
        } catch (error) {
            console.error('Print failed:', error);
            toast.error('Printing failed');
        }
    };

    const handleAllowRetake = async (submission: Submission) => {
        const confirmText = `Allow ${submission.student_name || 'this student'} to retake? Their current submission will be removed.`;
        if (!window.confirm(confirmText)) return;

        setReopenId(submission.id);
        try {
            await supabase.from('submission_answers').delete().eq('submission_id', submission.id);
            await supabase.from('submissions').delete().eq('id', submission.id).eq('exam_id', examId);
            if (submission.student_email) {
                await supabase.from('exam_progress').delete().eq('exam_id', examId).eq('student_email', submission.student_email);
                if (CONVEX_FEATURES.proctoring && convex) {
                    try {
                        await convex.mutation(api.sessions.deleteSessionForRetake, { exam_id: examId!, student_email: submission.student_email });
                    } catch (e) { console.warn('Convex session delete failed', e); }
                }
            }
            setSubmissions(prev => prev.filter(s => s.id !== submission.id));
            toast.success('Student can re-enter the exam now');
        } catch (error) {
            console.error('Failed to allow retake', error);
            toast.error('Failed to allow retake');
        } finally {
            setReopenId(null);
        }
    };

    const openSubmissionDetail = async (submission: Submission) => {
        setSelectedSubmission(submission);
        try {
            const { data: answers } = await supabase.from('submission_answers').select('*').eq('submission_id', submission.id);
            const { data: qData } = await supabase.from('questions').select('*').eq('exam_id', examId);
            const qMap: Record<string, any> = {};
            (qData || []).forEach((q: any) => { qMap[q.id] = q; });

            const computedAnswers = (answers || []).map((a: any) => {
                const q = qMap[a.question_id];
                let awarded = a.awarded_score;
                if (awarded === null || awarded === undefined) {
                    if (!q) awarded = 0;
                    else if (q.type === 'short_answer') awarded = null;
                    else {
                        const qCorrect = q.correct_answer;
                        const studentVal = a.answer;
                        if (Array.isArray(qCorrect)) {
                            let parsed = studentVal;
                            if (typeof studentVal === 'string') {
                                try { parsed = JSON.parse(studentVal); } catch { parsed = String(studentVal).split('||').filter(Boolean); }
                            }
                            if (Array.isArray(parsed)) {
                                const a1 = (qCorrect as any[]).map(s => String(s).trim()).sort();
                                const b1 = parsed.map(s => String(s).trim()).sort();
                                awarded = (a1.length === b1.length && a1.every((v, i) => v === b1[i])) ? (q.points || 0) : 0;
                            } else awarded = 0;
                        } else {
                            if (q.type === 'numeric') {
                                const s = parseFloat(String(studentVal));
                                const c = parseFloat(String(qCorrect || ''));
                                awarded = (!isNaN(s) && !isNaN(c) && s === c) ? (q.points || 0) : 0;
                            } else awarded = (String(studentVal).trim().toLowerCase() === String(qCorrect || '').trim().toLowerCase()) ? (q.points || 0) : 0;
                        }
                    }
                }
                return { ...a, awarded_score: awarded };
            });
            setDetailedAnswers(computedAnswers);
            setQuestionMap(qMap);
        } catch (err) {
            console.error('Failed details:', err);
            toast.error('Failed to load details');
        }
    };

    const metrics = useMemo(() => {
        if (!submissions.length) return { avgScore: 0, passRate: 0, avgTime: '0:00' };
        const totalScore = submissions.reduce((sum, s) => sum + (s.max_score > 0 ? (s.score / s.max_score) : 0), 0);
        const passed = submissions.filter(s => (s.max_score > 0 ? (s.score / s.max_score) : 0) >= 0.5).length;
        const totalTime = submissions.reduce((sum, s) => sum + (s.time_taken || 0), 0);
        return {
            avgScore: (totalScore / submissions.length * 100).toFixed(1),
            passRate: (passed / submissions.length * 100).toFixed(0),
            avgTime: formatDuration(Math.round(totalTime / submissions.length))
        };
    }, [submissions]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 font-sans relative overflow-hidden pt-24">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pt-4">
                <div className="max-w-7xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-xl shadow-indigo-500/5 border border-gray-200/50 dark:border-gray-700/50">
                    <div className="flex justify-between h-16 px-6">
                        <div className="flex items-center gap-3">
                            <Logo className="h-9 w-9" showText={false} />
                            <div className="flex flex-col">
                                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Durrah</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">for Tutors</span>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center space-x-3">
                            <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>
                            <Link to="/settings" className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <Settings className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('settings.title', 'Settings')}</span>
                            </Link>
                            <button onClick={handleLogout} className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <LogOut className="h-4 w-4 lg:mr-2" />
                                <span className="hidden lg:inline">{t('nav.logout', 'Logout')}</span>
                            </button>
                        </div>
                        <div className="flex items-center md:hidden">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mx-auto max-w-7xl">
                        <div className="px-4 py-3 space-y-2">
                            <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 font-medium"> {user?.user_metadata?.full_name || user?.email} </div>
                            <Link to="/settings" className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200">
                                <Settings className="h-5 w-5 mr-3" /> {t('settings.title', 'Settings')}
                            </Link>
                            <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-200">
                                <LogOut className="h-5 w-5 mr-3" /> {t('nav.logout', 'Logout')}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm">
                            <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-indigo-800 to-indigo-900 dark:from-white dark:via-indigo-200 dark:to-indigo-400">
                                {exam?.title}
                            </h1>
                            <div className="flex items-center gap-2 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Trophy className="h-4 w-4 text-orange-500" />
                                <span>Exam Results & Performance</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span>{submissions.length} Submissions</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl shadow-sm hover:bg-gray-50 font-medium">
                            <Printer className="h-5 w-5" />
                            <span className="hidden sm:inline">Print Report</span>
                        </button>
                        <button onClick={exportToExcel} disabled={isExporting} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-500/20 font-medium disabled:opacity-50">
                            {isExporting ? <RotateCcw className="animate-spin h-5 w-5" /> : <Download className="h-5 w-5" />}
                            <span>Export Excel</span>
                        </button>
                    </div>
                </div>

                {/* Metrics */}
                {!isKidsMode && submissions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <MetricCard title="Total Candidates" value={submissions.length} icon={Users} color="blue" subtitle="Participants" />
                        <MetricCard title="Average Score" value={`${metrics.avgScore}%`} icon={BarChart3} color="indigo" subtitle="Performance" />
                        <MetricCard title="Pass Rate" value={`${metrics.passRate}%`} icon={TrendingUp} color="emerald" subtitle="Success" />
                        <MetricCard title="Avg Time" value={metrics.avgTime} icon={Clock} color="orange" subtitle="Efficiency" />
                    </div>
                )}

                {/* Content */}
                {isKidsMode ? (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl">
                                <Trophy className="h-8 w-8 text-yellow-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Kids Leaderboard</h2>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1 rounded-[2.5rem]">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.4rem] p-6">
                                {CONVEX_FEATURES.leaderboard ? (
                                    <ConvexLeaderboard quizCode={examId!} limit={50} />
                                ) : (
                                    <KidsLeaderboard examId={examId!} maxRows={50} refreshKey={submissions.length} />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 md:flex md:items-center md:justify-between space-y-4 md:space-y-0">
                            <h2 className="text-lg font-bold">Submissions List</h2>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-2 outline-none">
                                        <option value="all">All Status</option>
                                        <option value="passed">Passed</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-2 outline-none">
                                        <option value="date">Newest</option>
                                        <option value="score">Score</option>
                                        <option value="duration">Time</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        {submissions.length === 0 ? (
                            <div className="p-20 text-center text-gray-500">No submissions found yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50/50 dark:bg-gray-800">
                                        <tr>
                                            <th className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">#</th>
                                            {requiredFields.map(field => (
                                                <th key={field} className="text-left py-4 px-6 text-xs font-semibold text-gray-500 uppercase">{fieldLabels[field] || field}</th>
                                            ))}
                                            <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Score</th>
                                            <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                                            <th className="text-center py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Result</th>
                                            <th className="text-right py-4 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredSubmissions.map((s, idx) => {
                                            const passed = (s.max_score > 0 ? (s.score / s.max_score) : 0) >= 0.5;
                                            return (
                                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="py-4 px-6 text-sm text-gray-500">{idx + 1}</td>
                                                    {requiredFields.map(field => (
                                                        <td key={field} className="py-4 px-6 text-sm font-medium">{getStudentFieldValue(s, field)}</td>
                                                    ))}
                                                    <td className="py-4 px-6 text-sm text-center">
                                                        <span className="font-bold">{s.score}</span> <span className="text-gray-400">/ {s.max_score}</span>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-center text-gray-500">{formatDuration(s.time_taken)}</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${passed ? 'bg-green-100 text-green-800 dark:bg-green-900/30' : 'bg-red-100 text-red-800 dark:bg-red-900/30'}`}>
                                                            {passed ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                            {(s.max_score > 0 ? (s.score / s.max_score) * 100 : 0).toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => openSubmissionDetail(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                                <Search className="h-4 w-4" />
                                                            </button>
                                                            <button onClick={() => handleAllowRetake(s)} disabled={reopenId === s.id} className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50">
                                                                <RotateCcw className={`h-4 w-4 ${reopenId === s.id ? 'animate-spin' : ''}`} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-white/10 flex flex-col">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-white/5">
                            <div>
                                <h3 className="text-2xl font-bold">Grading Detail</h3>
                                <p className="text-sm text-gray-500 mt-1">{selectedSubmission.student_name} • {new Date(selectedSubmission.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedSubmission(null)} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {detailedAnswers.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <RotateCcw className="animate-spin h-8 w-8 mx-auto mb-4" />
                                    Loading answers...
                                </div>
                            ) : (
                                detailedAnswers.map((ans, idx) => {
                                    const q = questionMap[ans.question_id] || { question_text: 'Unknown Question', points: 0 };
                                    const isCorrect = (ans.awarded_score || 0) === q.points;
                                    return (
                                        <div key={ans.id} className="p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                            <div className="flex gap-4">
                                                <span className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 text-sm font-mono">{idx + 1}</span>
                                                <div className="flex-1">
                                                    <p className="font-bold mb-3">{q.question_text}</p>
                                                    <div className="p-3 bg-white dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5 text-sm">
                                                        <span className="text-gray-400 uppercase text-[10px] font-bold block mb-1">Student Answer</span>
                                                        {typeof ans.answer === 'string' ? ans.answer : JSON.stringify(ans.answer)}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className={`text-lg font-black ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>{ans.awarded_score ?? 0}</span>
                                                    <span className="text-gray-400 text-sm font-medium"> / {q.points}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, color, subtitle }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
        orange: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    };
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${colors[color]}`}> <Icon className="h-6 w-6" /> </div>
            </div>
            <div className="relative z-10">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-3xl font-bold mt-1">{value}</h3>
                <p className="text-xs mt-2 font-medium opacity-70">{subtitle}</p>
            </div>
            <Icon className="absolute -bottom-4 -right-4 h-24 w-24 opacity-5 group-hover:opacity-10 transition-opacity" />
        </div>
    );
}
