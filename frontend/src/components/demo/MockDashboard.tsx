import { Plus, Share2, BarChart3, Edit, Trash2, BookOpen, CheckCircle, Clock, Users } from 'lucide-react';

export function MockDashboard() {
    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 overflow-auto z-[9998] pointer-events-none">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8" id="demo-dashboard">
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">My Exams Dashboard</h1>
                    <div className="flex gap-3">
                        <button
                            id="demo-qbank-btn"
                            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 pointer-events-auto"
                        >
                            <BookOpen className="h-5 w-5 mr-2" />
                            Question Bank
                        </button>
                        <button
                            id="demo-create-btn"
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 pointer-events-auto"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Create New Exam
                        </button>
                    </div>
                </div>

                {/* Exam Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Exam Card 1 */}
                    <div id="demo-exam-card" className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                    Mathematics Final Exam
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Algebra and Calculus topics
                                </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                            </span>
                        </div>

                        <div className="mb-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="h-4 w-4 mr-2" />
                                60 minutes
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Users className="h-4 w-4 mr-2" />
                                45 submissions
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Created 2 days ago
                            </div>
                            <div className="flex space-x-2">
                                <button
                                    id="demo-copy-link-btn"
                                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                    title="Copy Link"
                                >
                                    <Share2 className="h-5 w-5" />
                                </button>
                                <button
                                    id="demo-results-btn"
                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                    title="View Results"
                                >
                                    <BarChart3 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                    <Edit className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Exam Card 2 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 opacity-75">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                    Physics Quiz
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Newton's Laws
                                </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                            </span>
                        </div>

                        <div className="mb-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="h-4 w-4 mr-2" />
                                30 minutes
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Users className="h-4 w-4 mr-2" />
                                23 submissions
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Created 1 week ago
                            </div>
                            <div className="flex space-x-2">
                                <button className="p-2 text-gray-400">
                                    <Share2 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400">
                                    <BarChart3 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400">
                                    <Edit className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Exam Card 3 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 opacity-75">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                    English Grammar Test
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Tenses and Articles
                                </p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                            </span>
                        </div>

                        <div className="mb-4 space-y-2">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="h-4 w-4 mr-2" />
                                45 minutes
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Users className="h-4 w-4 mr-2" />
                                12 submissions
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Created 2 weeks ago
                            </div>
                            <div className="flex space-x-2">
                                <button className="p-2 text-gray-400">
                                    <Share2 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400">
                                    <BarChart3 className="h-5 w-5" />
                                </button>
                                <button className="p-2 text-gray-400">
                                    <Edit className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mock Exam Form Overlay */}
            <div id="demo-exam-form" className="fixed top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 pointer-events-auto max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Exam</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Exam Title
                        </label>
                        <input
                            type="text"
                            value="My First Exam"
                            readOnly
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value="A comprehensive exam covering all topics"
                            readOnly
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                value="60"
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Passing Score (%)
                            </label>
                            <input
                                type="number"
                                value="60"
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div id="demo-add-question" className="border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg p-4 text-center">
                        <Plus className="h-8 w-8 mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Question</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiple choice, True/False, Short answer, Essay</p>
                    </div>

                    <div id="demo-anti-cheat" className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                        <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
                            Anti-Cheating Settings
                        </h3>
                        <div className="space-y-2 text-sm">
                            <label className="flex items-center text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked readOnly className="mr-2" />
                                Enable Fullscreen Mode
                            </label>
                            <label className="flex items-center text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked readOnly className="mr-2" />
                                Track Tab Switches
                            </label>
                            <label className="flex items-center text-gray-700 dark:text-gray-300">
                                <input type="checkbox" checked readOnly className="mr-2" />
                                Randomize Questions
                            </label>
                        </div>
                    </div>

                    <button
                        id="demo-publish"
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
                    >
                        Publish Exam
                    </button>
                </div>
            </div>

            {/* Mock Share Link Popup */}
            <div id="demo-share-link" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 pointer-events-auto z-[9999]">
                <div className="text-center mb-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Exam Published Successfully!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Share this link with your students
                    </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                    <code className="text-sm text-indigo-600 dark:text-indigo-400 break-all">
                        https://durrahexams.com/exam/abc123xyz
                    </code>
                </div>

                <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Copy Link
                </button>
            </div>

            {/* Mock Live Monitor */}
            <div id="demo-live-monitor" className="fixed top-20 right-4 w-80 max-w-[90vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 pointer-events-auto">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    Live Monitoring
                </h3>
                <div id="demo-student-list" className="space-y-2">
                    {['Sarah Ahmed', 'Mohammed Ali', 'Fatima Hassan'].map((name, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{name}</span>
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                                In Progress
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mock Notifications */}
            <div id="demo-notifications" className="fixed bottom-4 right-4 w-80 max-w-[90vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border-l-4 border-indigo-500 pointer-events-auto">
                <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                            New Submission
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Sarah Ahmed completed the exam with 95%
                        </p>
                    </div>
                </div>
            </div>

            {/* Mock Analytics Chart */}
            <div id="demo-analytics-chart" className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-200 dark:border-gray-700 pointer-events-auto max-h-[80vh] overflow-y-auto z-[9999]">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Exam Analytics</h2>
                
                {/* Mock Bar Chart */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Score Distribution</h3>
                    <div className="flex items-end justify-between h-40 gap-2">
                        {[20, 35, 60, 85, 75, 50, 30].map((height, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                                <div 
                                    className="w-full bg-gradient-to-t from-indigo-600 to-violet-500 rounded-t"
                                    style={{ height: `${height}%` }}
                                ></div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                                    {i * 10}-{(i + 1) * 10}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div id="demo-grade-table" className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Student</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Score</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {[
                                { name: 'Sarah Ahmed', score: 95, status: 'Passed' },
                                { name: 'Mohammed Ali', score: 88, status: 'Passed' },
                                { name: 'Fatima Hassan', score: 76, status: 'Passed' }
                            ].map((student, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{student.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{student.score}%</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                            {student.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button id="demo-export" className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                    Export to Excel
                </button>
            </div>

            {/* Mock Question Bank */}
            <div id="demo-qbank-categories" className="fixed top-20 left-4 w-64 max-w-[90vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 pointer-events-auto">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Categories</h3>
                <div className="space-y-2">
                    {['Mathematics', 'Physics', 'Chemistry', 'English'].map((cat, i) => (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-1 rounded">
                                {Math.floor(Math.random() * 50) + 10}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div id="demo-qbank-reuse" className="fixed bottom-20 left-1/2 -translate-x-1/2 w-96 max-w-[90vw] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 border border-gray-200 dark:border-gray-700 pointer-events-auto">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    <CheckCircle className="inline h-4 w-4 text-green-500 mr-2" />
                    5 questions selected from Question Bank
                </p>
                <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium text-sm">
                    Add to Exam
                </button>
            </div>
        </div>
    );
}
