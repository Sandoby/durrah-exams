import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BarChart3, Users, CheckCircle, Clock } from 'lucide-react';
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
    submitted_at: string;
    time_taken: number;
    answers: any;
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

            // Fetch submissions
            const { data: submissionsData, error: submissionsError } = await supabase
                .from('submissions')
                .select('*')
                .eq('exam_id', examId)
                .order('submitted_at', { ascending: false });

            if (submissionsError) throw submissionsError;
            setSubmissions(submissionsData || []);

            // Calculate score distribution
            if (submissionsData && submissionsData.length > 0) {
                const distribution = Array(11).fill(0);
                submissionsData.forEach(sub => {
                    const percentage = (sub.score / sub.total_points) * 100;
                    const bucket = Math.floor(percentage / 10);
                    distribution[Math.min(bucket, 10)]++;
                });

                setScoreDistribution(
                    distribution.map((count, index) => ({
                        range: `${index * 10}-${(index + 1) * 10}%`,
                        students: count
                    }))
                );
            }

            // Get questions from exam data (they're stored as JSONB in the exam)
            const questionsData = examData?.questions || [];

            if (questionsData && questionsData.length > 0 && submissionsData && submissionsData.length > 0) {
                const stats = questionsData.map((q: any, index: number) => {
                    let correctCount = 0;
                    let incorrectCount = 0;
                    let totalTime = 0;
                    let timeCount = 0;

                    const questionKey = q.id || `q${index}`;

                    submissionsData.forEach((sub: any) => {
                        const answer = sub.answers?.[questionKey];
                        if (answer) {
                            if (answer.is_correct || answer.isCorrect) {
                                correctCount++;
                            } else {
                                incorrectCount++;
                            }
                            if (answer.time_spent || answer.timeSpent) {
                                totalTime += (answer.time_spent || answer.timeSpent);
                                timeCount++;
                            }
                        }
                    });

                    return {
                        question_text: q.question || q.question_text || `Question ${index + 1}`,
                        correct_count: correctCount,
                        incorrect_count: incorrectCount,
                        average_time: timeCount > 0 ? Math.round(totalTime / timeCount) : 0
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
                const headers = ['Student Name', 'Email', 'Score', 'Percentage', 'Submitted At', 'Time Taken'];
                const rows = submissions.map(s => [
                    s.student_name,
                    s.student_email,
                    `${s.score}/${s.total_points}`,
                    `${((s.score / s.total_points) * 100).toFixed(2)}%`,
                    new Date(s.submitted_at).toLocaleString(),
                    `${s.time_taken} min`
                ]);

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
        ? (submissions.reduce((sum, s) => sum + (s.score / s.total_points), 0) / submissions.length * 100).toFixed(2)
        : 0;

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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                                    {submissions.length > 0
                                        ? `${Math.max(...submissions.map(s => (s.score / s.total_points) * 100)).toFixed(2)}%`
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                                    {submissions.length > 0
                                        ? `${Math.round(submissions.reduce((sum, s) => sum + s.time_taken, 0) / submissions.length)} min`
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                            <Clock className="h-8 w-8 text-orange-600" />
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
                                score: (s.score / s.total_points) * 100
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Avg Time</th>
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
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{q.average_time}s</td>
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
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Student Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Score</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Percentage</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Submitted</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Time Taken</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{s.student_name}</td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{s.student_email}</td>
                                        <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">{s.score}/{s.total_points}</td>
                                        <td className="py-3 px-4 text-sm font-medium text-indigo-600">
                                            {((s.score / s.total_points) * 100).toFixed(2)}%
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {new Date(s.submitted_at).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{s.time_taken} min</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
