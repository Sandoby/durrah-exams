import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BarChart3, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
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
    const { examId } = useParams();
    const navigate = useNavigate();
    const [exam, setExam] = useState<any>(null);
    const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
    const [questionStats, setQuestionStats] = useState<QuestionStats[]>([]);

    useEffect(() => {
        if (examId) {
            fetchAnalytics();
        }
    }, [examId]);

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
                time_taken: 0 // Not stored in schema
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
            <div className="flex items-center justify-center min-h-screen">
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
        }, 0) / submissions.length * 100).toFixed(2)
        : 0;

    const highestScore = submissions.length > 0
        ? Math.max(...submissions.map(s => {
            const maxScore = s.max_score || s.total_points || 1;
            return ((s.score || 0) / maxScore) * 100;
        })).toFixed(2)
        : 'N/A';

    const studentFields = (exam?.required_fields || []).length
        ? exam.required_fields || []
        : ['name'];

    const resolveFieldValue = (s: SubmissionData, field: string) => {
        if (field === 'name') return s.student_data?.name || s.student_name || '-';
        if (field === 'email') return s.student_data?.email || s.student_email || '-';
        return s.student_data?.[field] ?? (s as any)[field] ?? '-';
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{exam?.title}</h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">Analytics & Results</p>
                        </div>
                    </div>
                    <button
                        onClick={() => exportResults('csv')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Submissions</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{submissions.length}</p>
                            </div>
                            <Users className="h-8 w-8 text-indigo-600" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{avgScore}%</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Highest Score</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                    {highestScore}%
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Score Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Score Distribution</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={scoreDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="range" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="students" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Score Trend */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submission Timeline</h2>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={submissions.map((s, idx) => ({
                                index: idx + 1,
                                score: (() => {
                                    const maxScore = s.max_score || s.total_points || 1;
                                    return ((s.score || 0) / maxScore) * 100;
                                })()
                            }))}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="index" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="score" fill="#4f46e5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Question Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Question Performance</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Question</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Correct</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Incorrect</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questionStats.map((q, idx) => {
                                    const total = q.correct_count + q.incorrect_count;
                                    const successRate = total > 0 ? ((q.correct_count / total) * 100).toFixed(2) : 0;
                                    return (
                                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white truncate max-w-md">{q.question_text}</td>
                                            <td className="py-3 px-4 text-sm text-green-600 font-medium">{q.correct_count}</td>
                                            <td className="py-3 px-4 text-sm text-red-600 font-medium">{q.incorrect_count}</td>
                                            <td className="py-3 px-4 text-sm font-medium text-indigo-600">{successRate}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Student Submissions</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    {studentFields.map((field: string) => (
                                        <th key={field} className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {field.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Score</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Percentage</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => {
                                    const maxScore = s.max_score || s.total_points || 1;
                                    const percentage = s.percentage || ((s.score || 0) / maxScore) * 100;
                                    return (
                                        <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            {studentFields.map((field: string) => (
                                                <td key={field} className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                    {resolveFieldValue(s, field)}
                                                </td>
                                            ))}
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{s.score || 0}/{maxScore}</td>
                                            <td className="py-3 px-4 text-sm font-medium text-indigo-600">
                                                {percentage.toFixed(2)}%
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {new Date(s.submitted_at || s.created_at || new Date()).toLocaleString()}
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
