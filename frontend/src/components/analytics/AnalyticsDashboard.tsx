import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { BarChart } from '../charts';
import {
    ArrowLeft,
    Users,
    Target,
    Clock,
    AlertTriangle,
    Download,
    Loader2,
    ChevronDown,
    FileText,
    FileSpreadsheet,
    Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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
    const [exporting, setExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
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

            // Fetch questions with correct answers for re-grading
            const { data: questions, error: questionsError } = await supabase
                .from('questions')
                .select('id, question_text, type, correct_answer, options')
                .eq('exam_id', examId)
                .order('created_at', { ascending: true });

            if (questionsError) throw questionsError;

            // Fetch submissions with answers
            const { data: submissions, error: submissionsError } = await supabase
                .from('submissions')
                .select(`
                    score, 
                    max_score,
                    submission_answers (
                        question_id,
                        answer,
                        is_correct
                    )
                `)
                .eq('exam_id', examId);

            if (submissionsError) throw submissionsError;

            // Helper to check correctness
            const checkAnswer = (question: any, studentAnswer: string) => {
                if (!studentAnswer) return false;

                try {
                    if (question.type === 'multiple_select') {
                        let studentArr: string[] = [];
                        try {
                            studentArr = JSON.parse(studentAnswer);
                        } catch {
                            studentArr = studentAnswer.split('||').filter(Boolean);
                        }

                        if (!Array.isArray(question.correct_answer)) {
                            try {
                                const parsed = JSON.parse(question.correct_answer);
                                if (Array.isArray(parsed)) question.correct_answer = parsed;
                                else question.correct_answer = [question.correct_answer];
                            } catch {
                                question.correct_answer = [question.correct_answer];
                            }
                        }

                        const correctSorted = (question.correct_answer || []).map((s: string) => String(s).trim().toLowerCase()).sort();
                        const studentSorted = studentArr.map((s: string) => String(s).trim().toLowerCase()).sort();

                        return correctSorted.length === studentSorted.length &&
                            correctSorted.every((val: string, idx: number) => val === studentSorted[idx]);
                    } else if (question.type === 'numeric') {
                        const correctNum = parseFloat(question.correct_answer);
                        const studentNum = parseFloat(studentAnswer);
                        return !isNaN(correctNum) && !isNaN(studentNum) && correctNum === studentNum;
                    } else {
                        return String(question.correct_answer).trim().toLowerCase() === String(studentAnswer).trim().toLowerCase();
                    }
                } catch (e) {
                    console.error('Grading error', e);
                    return false;
                }
            };

            // Calculate Question Analytics Client-Side
            const questionStats: Record<string, { total: number; correct: number }> = {};
            const questionMap = new Map(questions.map(q => [q.id, q]));

            questions.forEach(q => {
                questionStats[q.id] = { total: 0, correct: 0 };
            });

            submissions.forEach((sub: any) => {
                if (sub.submission_answers) {
                    sub.submission_answers.forEach((ans: any) => {
                        if (questionStats[ans.question_id]) {
                            questionStats[ans.question_id].total++;

                            const question = questionMap.get(ans.question_id);
                            let isCorrect = false;

                            if (ans.is_correct === true) {
                                isCorrect = true;
                            } else if (question) {
                                isCorrect = checkAnswer(question, ans.answer);
                            }

                            if (isCorrect) {
                                questionStats[ans.question_id].correct++;
                            }
                        }
                    });
                }
            });

            const formattedQuestions = questions.map((q: any, index: number) => {
                const stats = questionStats[q.id] || { total: 0, correct: 0 };
                return {
                    question_id: q.id,
                    question_text: q.question_text || `Question ${index + 1}`,
                    question_number: index + 1,
                    total_attempts: stats.total,
                    correct_attempts: stats.correct,
                    difficulty_percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
                    average_time_seconds: 0
                };
            });

            setQuestionAnalytics(formattedQuestions);

            const distribution: { [key: string]: number } = {};
            submissions.forEach((sub: any) => {
                const percentage = sub.max_score > 0 ? (sub.score / sub.max_score) * 100 : 0;
                const bucket = Math.floor(percentage / 10) * 10;
                const key = `${bucket}-${bucket + 9}%`;
                distribution[key] = (distribution[key] || 0) + 1;
            });

            const distributionArray = Object.entries(distribution).map(([range, count]) => ({
                range,
                count
            })).sort((a, b) => {
                const aVal = parseInt(a.range.split('-')[0]);
                const bVal = parseInt(b.range.split('-')[0]);
                return aVal - bVal;
            });

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

    const handleExportPDF = async () => {
        if (!examAnalytics) return;
        setExporting(true);
        setShowExportMenu(false);
        const toastId = toast.loading('Generating PDF report...');

        try {
            const element = document.getElementById('analytics-dashboard-content');
            if (!element) throw new Error('Dashboard element not found');

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const margin = 10;
            const contentWidth = pdfWidth - (margin * 2);
            const scaleFactor = contentWidth / imgWidth;

            const scaledHeight = imgHeight * scaleFactor;

            pdf.setFontSize(18);
            pdf.text(`${examAnalytics.exam_title} - Analytics Report`, margin, 15);
            pdf.setFontSize(10);
            pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 22);

            pdf.addImage(imgData, 'PNG', margin, 30, contentWidth, scaledHeight);
            pdf.save(`${examAnalytics.exam_title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_analytics.pdf`);

            toast.success('PDF exported successfully!', { id: toastId });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export PDF', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = () => {
        if (!examAnalytics) return;
        setShowExportMenu(false);

        try {
            const wb = XLSX.utils.book_new();

            // Summary Sheet
            const summaryData = [
                ['Exam Analytics Report'],
                ['Generated On', new Date().toLocaleDateString()],
                [],
                ['Exam Title', examAnalytics.exam_title],
                ['Total Submissions', examAnalytics.total_submissions],
                ['Average Score', `${examAnalytics.average_score?.toFixed(1)}%`],
                ['Median Score', `${examAnalytics.median_score?.toFixed(1)}%`],
                ['Highest Score', `${examAnalytics.highest_score?.toFixed(1)}%`],
                ['Lowest Score', `${examAnalytics.lowest_score?.toFixed(1)}%`],
                ['Passed', examAnalytics.passed_count],
                ['Failed', examAnalytics.failed_count]
            ];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

            // Question Analysis Sheet
            const questionData = questionAnalytics.map(q => ({
                'Question Number': `Q${q.question_number}`,
                'Question Text': q.question_text,
                'Total Attempts': q.total_attempts,
                'Correct Attempts': q.correct_attempts,
                'Success Rate': `${q.difficulty_percentage.toFixed(1)}%`,
                'Difficulty': getDifficultyLabel(q.difficulty_percentage)
            }));
            const wsQuestions = XLSX.utils.json_to_sheet(questionData);
            XLSX.utils.book_append_sheet(wb, wsQuestions, "Question Analysis");

            // Score Distribution Sheet
            const distributionData = scoreDistribution.map(d => ({
                'Score Range': d.range,
                'Count': d.count
            }));
            const wsDistribution = XLSX.utils.json_to_sheet(distributionData);
            XLSX.utils.book_append_sheet(wb, wsDistribution, "Score Distribution");

            XLSX.writeFile(wb, `${examAnalytics.exam_title.replace(/[^a-z0-9]/gi, '_')}_analytics.xlsx`);
            toast.success('Excel exported successfully!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export Excel');
        }
    };

    const handlePrint = () => {
        setShowExportMenu(false);
        window.print();
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
                <div className="text-center max-w-md">
                    <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Analytics Data Available</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        This exam doesn't have any submissions yet, or the analytics database hasn't been set up.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 text-left">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold mb-2">To enable analytics:</p>
                        <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                            <li>Run the analytics migration in Supabase SQL Editor</li>
                            <li>Deploy the updated grade-exam Edge Function</li>
                            <li>Have students take the exam</li>
                        </ol>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:bg-white">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow print:hidden">
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

                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export Report
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </button>

                            {showExportMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 ring-1 ring-black ring-opacity-5">
                                    <div className="py-1">
                                        <button
                                            onClick={handleExportPDF}
                                            disabled={exporting}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                        >
                                            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2 text-red-500" />}
                                            Export as PDF
                                        </button>
                                        <button
                                            onClick={handleExportExcel}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                                            Export as Excel
                                        </button>
                                        <button
                                            onClick={handlePrint}
                                            className="flex items-center w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <Printer className="h-4 w-4 mr-2 text-gray-600" />
                                            Print Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Header (Only visible when printing) */}
            <div className="hidden print:block p-8 pb-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{examAnalytics.exam_title}</h1>
                <p className="text-gray-600">Analytics Report - Generated on {new Date().toLocaleDateString()}</p>
            </div>

            <div id="analytics-dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-900 print:bg-white print:p-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3 print:gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-200">
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

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-200">
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

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-200">
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
                <div className="grid grid-cols-1 mb-8 print:break-inside-avoid">
                    {/* Score Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 print:shadow-none print:border print:border-gray-200">
                        <BarChart
                            data={scoreDistribution}
                            xKey="range"
                            yKey="count"
                            title="Score Distribution"
                            color="#6366f1"
                            height={300}
                        />
                    </div>
                </div>

                {/* Question Performance Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden print:shadow-none print:border print:border-gray-200">
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
                                    <tr key={q.question_id} className="hover:bg-gray-50 dark:hover:bg-gray-700 print:break-inside-avoid">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                Q{q.question_number}
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md print:whitespace-normal">
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
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2 print:border print:border-gray-300">
                                                    <div
                                                        className="bg-indigo-600 h-2 rounded-full print:bg-black"
                                                        style={{ width: `${q.difficulty_percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm text-gray-900 dark:text-white">
                                                    {q.difficulty_percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(q.difficulty_percentage)} print:border print:border-gray-300`}>
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
