import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BarChart, PieChart } from '../charts';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Target, Clock, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface QuestionAnalytics {
    question_id: string;
    question_text: string;
    question_number: number;
    total_attempts: number;
    correct_attempts: number;
    difficulty_percentage: number;
    average_time_seconds: number;
}

interface ExamAnalytics {
    exam_id: string;
    exam_title: string;
    total_submissions: number;
    average_score: number;
    highest_score: number;
    lowest_score: number;
    median_score: number;
    passed_count: number;
    failed_count: number;
}

export const AnalyticsDashboard = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [examAnalytics, setExamAnalytics] = useState<ExamAnalytics | null>(null);
    const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
    const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);

    useEffect(() => {
        if (examId) {
            fetchAnalytics();
        }
    }, [examId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Fetch exam summary analytics
            const { data: examData, error: examError } = await supabase
                .from('exam_analytics_summary')
                .select('*')
                .eq('exam_id', examId)
                .single();

            if (examError) throw examError;
            setExamAnalytics(examData);

            // Fetch question-level analytics
            const { data: questionsData, error: questionsError } = await supabase
                .from('question_analytics')
                .select(`
                    *,
                    questions (
                        question_text
                    )
                `)
                .eq('exam_id', examId)
                .order('question_id');

            if (questionsError) throw questionsError;

            const formattedQuestions = questionsData.map((q: any, index: number) => ({
                question_id: q.question_id,
                question_text: q.questions?.question_text || `Question ${index + 1}`,
                question_number: index + 1,
                total_attempts: q.total_attempts,
                correct_attempts: q.correct_attempts,
                difficulty_percentage: q.total_attempts > 0 ? (q.correct_attempts / q.total_attempts) * 100 : 0,
                average_time_seconds: q.average_time_seconds || 0
            }));

            setQuestionAnalytics(formattedQuestions);

            // Fetch submissions for score distribution
            const { data: submissions, error: submissionsError } = await supabase
                .from('submissions')
                .select('score, max_score')
                .eq('exam_id', examId);

            if (submissionsError) throw submissionsError;

            // Create score distribution (0-10, 11-20, 21-30, etc.)
            const distribution: { [key: string]: number } = {};
            submissions.forEach((sub: any) => {
                const percentage = (sub.score / sub.max_score) * 100;
                const bucket = Math.floor(percentage / 10) * 10;
                const key = `${bucket}-${bucket + 9}%`;
                distribution[key] = (distribution[key] || 0) + 1;
            });

            const distributionArray = Object.entries(distribution).map(([range, count]) => ({
                range,
                count
            }));

            setScoreDistribution(distributionArray);

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const getDifficultyColor = (percentage: number) => {
        if (percentage >= 70) return 'text-green-600 bg-green-100';
        if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getDifficultyLabel = (percentage: number) => {
        if (percentage >= 70) return 'Easy';
        if (percentage >= 40) return 'Medium';
        return 'Hard';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!examAnalytics) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 text-indigo-600 hover:text-indigo-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const passRate = examAnalytics.total_submissions > 0
        ? (examAnalytics.passed_count / examAnalytics.total_submissions) * 100
        : 0;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {examAnalytics.exam_title}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Analytics Dashboard</p>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.success('Export feature coming soon!')}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Report
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Submissions</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {examAnalytics.total_submissions}
                                </p>
                            </div>
                            <Users className="h-10 w-10 text-indigo-600" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Average Score</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {examAnalytics.average_score?.toFixed(1) || 0}%
                                </p>
                            </div>
                            <Target className="h-10 w-10 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Pass Rate</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {passRate.toFixed(1)}%
                                </p>
                            </div>
                            {passRate >= 70 ? (
                                <TrendingUp className="h-10 w-10 text-green-600" />
                            ) : (
                                <TrendingDown className="h-10 w-10 text-red-600" />
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Median Score</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {examAnalytics.median_score?.toFixed(1) || 0}%
                                </p>
                            </div>
                            <Clock className="h-10 w-10 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Score Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <BarChart
                            data={scoreDistribution}
                            xKey="range"
                            yKey="count"
                            title="Score Distribution"
                            color="#6366f1"
                            height={300}
                        />
                    </div>

                    {/* Pass/Fail Ratio */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <PieChart
                            data={[
                                { name: 'Passed', value: examAnalytics.passed_count },
                                { name: 'Failed', value: examAnalytics.failed_count }
                            ]}
                            nameKey="name"
                            valueKey="value"
                            title="Pass/Fail Ratio"
                            colors={['#10b981', '#ef4444']}
                            height={300}
                        />
                    </div>
                </div>

                {/* Question Performance Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Question Performance Analysis
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Question
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Attempts
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Correct
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Success Rate
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Difficulty
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {questionAnalytics.map((q) => (
                                    <tr key={q.question_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                Q{q.question_number}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                                                {q.question_text}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {q.total_attempts}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {q.correct_attempts}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full"
                                                        style={{ width: `${q.difficulty_percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-900 dark:text-white">
                                                    {q.difficulty_percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(q.difficulty_percentage)}`}>
                                                {getDifficultyLabel(q.difficulty_percentage)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
