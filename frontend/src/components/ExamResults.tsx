import * as React from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, FileDown, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
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
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [detailedAnswers, setDetailedAnswers] = useState<any[]>([]);
    const [questionMap, setQuestionMap] = useState<Record<string, any>>({});
    const [isKidsMode, setIsKidsMode] = useState(false);


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

    const exportToExcel = async () => {
        if (submissions.length === 0) {
            toast.error('No submissions to export');
            return;
        }

        setIsExporting(true);
        try {
            // Prepare data for Excel with dynamic columns
            const excelData = submissions.map((sub, index) => {
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

            // Download
            XLSX.writeFile(wb, filename);

            toast.success('Results exported successfully!');
        } catch (error: any) {
            console.error('Error exporting to Excel:', error);
            toast.error('Failed to export results');
        } finally {
            setIsExporting(false);
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

            {/* Kids banner removed in non-kids view to keep UI focused */}

            {submissions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-1">Average Score</div>
                        <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                            {(submissions.reduce((acc, s) => acc + (s.max_score > 0 ? (s.score / s.max_score) * 100 : 0), 0) / submissions.length).toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                        <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Pass Rate</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                            {((submissions.filter(s => (s.score / s.max_score) >= 0.5).length / submissions.length) * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800">
                        <div className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">Top Score</div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                            {Math.max(...submissions.map(s => s.max_score > 0 ? (s.score / s.max_score) * 100 : 0)).toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}

            {submissions.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No submissions yet</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Submitted</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {submissions.map((submission, index) => (
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
                                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(submission.score / submission.max_score) >= 0.7
                                                ? 'bg-green-100 text-green-800'
                                                : (submission.score / submission.max_score) >= 0.5
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                                }`}>
                                                {submission.max_score > 0 ? ((submission.score / submission.max_score) * 100).toFixed(1) : 0}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(submission.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Leaderboard is not shown here; only in Kids Mode branch above */}
                </>
            )}

            {selectedSubmission && (
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
            )}
        </div>
    );
}
