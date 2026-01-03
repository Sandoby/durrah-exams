import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, FileDown, Trophy, Search, Filter, ArrowUpDown, Clock, CheckCircle2, XCircle, Printer, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { printerService } from '../lib/printer';
import { downloaderService } from '../lib/downloader';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { TableSkeleton } from './skeletons';
import { KidsLeaderboard } from './kids/KidsLeaderboard';


interface ExamResultsProps {
    examId: string;
    examTitle: string;
}

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

export const ExamResults: React.FC<ExamResultsProps> = ({ examId, examTitle }) => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [requiredFields, setRequiredFields] = useState<string[]>(['name', 'email']);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [reopenId, setReopenId] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
    const [questionMap, setQuestionMap] = useState<Record<string, any>>({});
    const [isKidsMode, setIsKidsMode] = useState(false);

    // Filtering & Sorting State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');
    const [sortBy, setSortBy] = useState<'date' | 'score' | 'duration'>('date');


    const fieldLabels: Record<string, string> = {
        name: 'Name',
        email: 'Email',
        student_id: 'Student ID',
        phone: 'Phone'
    };

    useEffect(() => {
        if (user) fetchExamAndSubmissions();
    }, [examId, user]);

    const fetchExamAndSubmissions = async () => {
        try {
            // Fetch exam to get required_fields and check Kids Mode
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('required_fields, settings')
                .eq('id', examId)
                .eq('tutor_id', user?.id)
                .single();

            if (examError) throw examError;
            const settings = examData.settings || {};
            const kidsMode = Boolean(settings.child_mode_enabled);
            setIsKidsMode(kidsMode);
            setRequiredFields(examData.required_fields || ['name', 'email']);

            // Fetch submissions
            const { data, error } = await supabase
                .from('submissions')
                .select('*')
                .eq('exam_id', examId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setSubmissions(data || []);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load submissions');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDuration = (seconds?: number | null) => {
        if (seconds === null || seconds === undefined) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStudentFieldValue = (submission: Submission, field: string): string => {
        // For Kids Mode, show nickname
        if (submission.child_mode && field === 'name') {
            return submission.nickname || 'Kid Player';
        }
        // Try to get from browser_info.student_data first
        if (submission.browser_info?.student_data?.[field]) {
            return submission.browser_info.student_data[field];
        }
        // Fallback to direct fields
        if (field === 'name') return submission.student_name;
        if (field === 'email') return submission.student_email;
        return '-';
    };

    const filteredSubmissions = useMemo(() => {
        let result = [...submissions];

        // Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.student_name.toLowerCase().includes(query) ||
                s.student_email.toLowerCase().includes(query) ||
                (s.nickname && s.nickname.toLowerCase().includes(query))
            );
        }

        // Status Filter
        if (filterStatus !== 'all') {
            result = result.filter(s => {
                const percentage = s.max_score > 0 ? (s.score / s.max_score) : 0;
                return filterStatus === 'passed' ? percentage >= 0.5 : percentage < 0.5;
            });
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'score') {
                const pA = a.max_score > 0 ? (a.score / a.max_score) : 0;
                const pB = b.max_score > 0 ? (b.score / b.max_score) : 0;
                return pB - pA;
            }
            if (sortBy === 'duration') {
                return (b.time_taken || 0) - (a.time_taken || 0);
            }
            // Default: date (newest first)
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
            // Prepare data for Excel with dynamic columns
            const excelData = filteredSubmissions.map((sub, index) => {
                const row: Record<string, any> = {
                    '#': index + 1,
                };

                // Add dynamic student fields
                requiredFields.forEach(field => {
                    row[fieldLabels[field] || field] = getStudentFieldValue(sub, field);
                });

                // Add score columns
                row['Score'] = sub.score;
                row['Max Score'] = sub.max_score;
                row['Percentage'] = sub.max_score > 0 ? ((sub.score / sub.max_score) * 100).toFixed(2) + '%' : '0%';
                row['Duration'] = formatDuration(sub.time_taken);
                row['Submitted At'] = new Date(sub.created_at).toLocaleString();

                return row;
            });

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths dynamically
            const colWidths = [
                { wch: 5 },  // #
                ...requiredFields.map(() => ({ wch: 20 })), // Dynamic fields
                { wch: 8 },  // Score
                { wch: 10 }, // Max Score
                { wch: 12 }, // Percentage
                { wch: 20 }, // Submitted At
            ];
            ws['!cols'] = colWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Results');

            // Generate filename
            const filename = `${examTitle.replace(/[^a-z0-9]/gi, '_')}_results_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Download using native service or browser
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
            await downloaderService.downloadFile(filename, excelBuffer, 'base64');

            toast.success('Results exported successfully!');
        } catch (error: any) {
            console.error('Error exporting to Excel:', error);
            toast.error('Failed to export results');
        } finally {
            setIsExporting(false);
        }
    };

    const handlePrint = async () => {
        try {
            const html = `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #4f46e5;">Exam Results: ${examTitle}</h1>
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
            const { error: ansErr } = await supabase
                .from('submission_answers')
                .delete()
                .eq('submission_id', submission.id)
                .eq('exam_id', examId);
            if (ansErr) throw ansErr;

            const { error: subErr } = await supabase
                .from('submissions')
                .delete()
                .eq('id', submission.id)
                .eq('exam_id', examId);
            if (subErr) throw subErr;

            setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
            toast.success('Student can re-enter the exam now');
        } catch (error) {
            console.error('Failed to allow retake', error);
            toast.error('Failed to allow retake (permissions or network)');
        } finally {
            setReopenId(null);
        }
    };



    const openSubmissionDetail = async (submission: Submission) => {
        setSelectedSubmission(submission);
        // fetch answers and questions
        try {
            const { data: answers, error: answersErr } = await supabase
                .from('submission_answers')
                .select('*')
                .eq('submission_id', submission.id);
            if (answersErr) throw answersErr;

            const { data: qData, error: qErr } = await supabase
                .from('questions')
                .select('*')
                .eq('exam_id', examId);
            if (qErr) throw qErr;

            const qMap: Record<string, any> = {};
            (qData || []).forEach((q: any) => { qMap[q.id] = q; });

            // Prepare read-only view: compute awarded_score in-memory for display if not persisted
            const computedAnswers = (answers || []).map((a: any) => {
                const q = qMap[a.question_id];
                let awarded = a.awarded_score;
                try {
                    if (awarded === null || awarded === undefined) {
                        // compute based on question type and correct_answer
                        if (!q) {
                            awarded = 0;
                        } else if (q.type === 'short_answer') {
                            awarded = a.awarded_score ?? null;
                        } else {
                            const qCorrect = q.correct_answer;
                            const studentVal = a.answer;
                            if (Array.isArray(qCorrect)) {
                                let parsed: any = studentVal;
                                if (typeof studentVal === 'string') {
                                    try { parsed = JSON.parse(studentVal); } catch { parsed = String(studentVal).split('||').filter(Boolean); }
                                }
                                if (Array.isArray(parsed)) {
                                    const a1 = (qCorrect as any[]).map((s: any) => String(s).trim()).sort();
                                    const b1 = parsed.map((s: any) => String(s).trim()).sort();
                                    awarded = (a1.length === b1.length && a1.every((v: any, i: number) => v === b1[i])) ? (q.points || 0) : 0;
                                } else awarded = 0;
                            } else {
                                if (q.type === 'numeric') {
                                    const s = parseFloat(String(studentVal));
                                    const c = parseFloat(String(qCorrect || ''));
                                    awarded = (!isNaN(s) && !isNaN(c) && s === c) ? (q.points || 0) : 0;
                                } else {
                                    awarded = (String(studentVal).trim().toLowerCase() === String(qCorrect || '').trim().toLowerCase()) ? (q.points || 0) : 0;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error computing awarded score', e);
                    if (awarded === null || awarded === undefined) awarded = 0;
                }
                return { ...a, awarded_score: awarded };
            });

            setDetailedAnswers(computedAnswers);
            setQuestionMap(qMap);
        } catch (err: any) {
            console.error('Failed to load submission details', err);
            toast.error('Failed to load submission details');
        }
    };

    const closeSubmissionDetail = () => {
        setSelectedSubmission(null);
        setDetailedAnswers([]);
        setQuestionMap({});
    };

    // Manual grading disabled; no handler required

    // Manual grading has been disabled; no saveGrading implementation

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="mb-6 animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
                <TableSkeleton rows={5} columns={5} />
            </div>
        );
    }

    // Kids Mode: show ONLY the leaderboard
    if (isKidsMode) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">Kids Leaderboard</h4>
                </div>
                <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-1 rounded-3xl">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6">
                        <KidsLeaderboard
                            examId={examId}
                            maxRows={20}
                            refreshKey={submissions.length}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Exam Results ({submissions.length} submission{submissions.length !== 1 ? 's' : ''})
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        disabled={submissions.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                    </button>
                    <button
                        onClick={exportToExcel}
                        disabled={isExporting || submissions.length === 0}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileDown className="h-4 w-4 mr-2" />
                                Export to Excel
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Kids banner removed in non-kids view to keep UI focused */}

            {
                submissions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No submissions yet</p>
                    </div>
                ) : (
                    <>
                        {/* Search & Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value as any)}
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-2 outline-none"
                                    >
                                        <option value="all">All Results</option>
                                        <option value="passed">Passed Only</option>
                                        <option value="failed">Failed Only</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as any)}
                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm px-3 py-2 outline-none"
                                    >
                                        <option value="date">Newest First</option>
                                        <option value="score">Highest Score</option>
                                        <option value="duration">Longest Duration</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto hidden sm:block">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                        {requiredFields.map(field => (
                                            <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {fieldLabels[field] || field}
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredSubmissions.map((submission, index) => (
                                        <tr key={submission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                                            {requiredFields.map(field => (
                                                <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                    {getStudentFieldValue(submission, field)}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                <div className="flex items-center space-x-2">
                                                    <div>{submission.score} / {submission.max_score}</div>
                                                    <button
                                                        onClick={() => openSubmissionDetail(submission)}
                                                        className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded text-indigo-600 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Search className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                                                    {formatDuration(submission.time_taken)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${(submission.score / submission.max_score) >= 0.5
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                                    }`}>
                                                    {(submission.score / submission.max_score) >= 0.5 ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                    {submission.max_score > 0 ? ((submission.score / submission.max_score) * 100).toFixed(1) : 0}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(submission.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openSubmissionDetail(submission)}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleAllowRetake(submission)}
                                                        disabled={reopenId === submission.id}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        {reopenId === submission.id ? 'Working...' : 'Allow Retake'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="space-y-4 sm:hidden">
                            {filteredSubmissions.map((submission, index) => (
                                <div key={submission.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3 border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">#{index + 1}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(submission.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="text-base font-semibold text-gray-900 dark:text-white">
                                        {getStudentFieldValue(submission, requiredFields[0] || 'name')}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-2">
                                        {requiredFields.slice(1).map(field => (
                                            <span key={field} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">{getStudentFieldValue(submission, field)}</span>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-sm">
                                        <span className="font-semibold text-gray-900 dark:text-white">{submission.score} / {submission.max_score}</span>
                                        <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${(submission.score / submission.max_score) >= 0.5
                                            ? 'bg-green-100 text-green-800 border border-green-200'
                                            : 'bg-red-100 text-red-800 border border-red-200'
                                            }`}>
                                            {(submission.max_score > 0 ? ((submission.score / submission.max_score) * 100).toFixed(1) : 0)}%
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                                            <Clock className="h-3.5 w-3.5" /> {formatDuration(submission.time_taken)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openSubmissionDetail(submission)}
                                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleAllowRetake(submission)}
                                            disabled={reopenId === submission.id}
                                            className="flex-1 px-3 py-2 text-xs font-semibold rounded-md bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" /> {reopenId === submission.id ? 'Working...' : 'Allow Retake'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Leaderboard is not shown here; only in Kids Mode branch above */}
                    </>
                )
            }

            {
                selectedSubmission && (
                    <>


                        {/* Grading Modal */}
                        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${selectedSubmission ? '' : 'hidden'}`}>
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">Grade: {selectedSubmission.student_name}</h3>
                                    <div className="space-x-2">
                                        <button onClick={closeSubmissionDetail} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <div className="text-sm text-gray-600">Submitted: {new Date(selectedSubmission.created_at).toLocaleString()}</div>

                                </div>

                                <div className="space-y-4">
                                    {detailedAnswers.length === 0 ? (
                                        <div className="text-center py-8 text-sm text-gray-500">Loading answers...</div>
                                    ) : (
                                        detailedAnswers.map((ans) => {
                                            const q = questionMap[ans.question_id] || { question_text: 'Question not found', points: 0, type: '' };
                                            return (
                                                <div key={ans.id} className="p-3 border rounded-md bg-gray-50 dark:bg-gray-900">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{q.question_text}</div>
                                                            <div className="text-sm text-gray-500 mt-1">Answer: {typeof ans.answer === 'string' ? ans.answer : JSON.stringify(ans.answer)}</div>
                                                        </div>
                                                        <div className="ml-4 w-36 text-right">
                                                            <div className="text-sm text-gray-500">Max: {q.points}</div>
                                                            <div className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{ans.awarded_score ?? '-'} pts</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )
            }
        </div >
    );
}
