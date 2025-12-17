import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, FileText, BookOpen, Loader2, Download, Search, X, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToJSON, exportToPDF, exportToWord } from '../lib/exportUtils';
import { useDemoTour } from '../hooks/useDemoTour';

interface Question {
    id: string;
    type: string;
    question_text: string;
    options?: string[];
    correct_answer?: string | string[];
    points: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    tags?: string[];
}

interface QuestionBank {
    id: string;
    name: string;
    description: string;
    tutor_id: string;
    created_at: string;
    question_count?: number;
}

export default function QuestionBank() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [banks, setBanks] = useState<QuestionBank[]>([]);
    const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [newBankDescription, setNewBankDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [exportMenuOpen, setExportMenuOpen] = useState<string | null>(null);

    // New question form state
    const [newQuestion, setNewQuestion] = useState<{
        question_text: string;
        type: string;
        options: string[];
        correct_answer: string | string[];
        points: number;
        difficulty: 'easy' | 'medium' | 'hard';
        category: string;
        tags: string;
    }>({
        question_text: '',
        type: 'multiple_choice',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 1,
        difficulty: 'medium',
        category: '',
        tags: ''
    });

    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true' || localStorage.getItem('demoMode') === 'true';
    const [startDemoTour] = useState(isDemo);

    useDemoTour('question-bank', startDemoTour && isDemo);

    useEffect(() => {
        if (isDemo) {
            const demoBanks: QuestionBank[] = [
                {
                    id: 'demo-bank-1',
                    name: 'STEM Essentials',
                    description: 'Math, Physics, and Chemistry fundamentals',
                    tutor_id: 'demo',
                    created_at: new Date().toISOString(),
                    question_count: 12,
                },
                {
                    id: 'demo-bank-2',
                    name: 'English Mastery',
                    description: 'Grammar, comprehension, and vocabulary drills',
                    tutor_id: 'demo',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    question_count: 8,
                },
            ];

            const demoQuestions: Question[] = [
                {
                    id: 'q1',
                    type: 'multiple_choice',
                    question_text: 'What is the derivative of x²?',
                    options: ['x', '2x', 'x²', '2'],
                    correct_answer: '1',
                    points: 2,
                    difficulty: 'medium',
                    category: 'Calculus',
                    tags: ['derivative', 'basics'],
                },
                {
                    id: 'q2',
                    type: 'multiple_choice',
                    question_text: 'The chemical symbol for Sodium is:',
                    options: ['S', 'Na', 'So', 'No'],
                    correct_answer: '1',
                    points: 2,
                    difficulty: 'easy',
                    category: 'Chemistry',
                    tags: ['elements'],
                },
                {
                    id: 'q3',
                    type: 'short_answer',
                    question_text: 'State Newton’s Second Law of Motion.',
                    options: [],
                    correct_answer: 'F = m a',
                    points: 3,
                    difficulty: 'medium',
                    category: 'Physics',
                    tags: ['laws', 'dynamics'],
                },
            ];

            setBanks(demoBanks);
            setSelectedBank(demoBanks[0]);
            setQuestions(demoQuestions);
            setIsLoading(false);
            return;
        }

        if (user) {
            fetchBanks();
        }
    }, [user, isDemo]);

    useEffect(() => {
        if (isDemo) return;
        if (selectedBank) {
            fetchQuestions(selectedBank.id);
        }
    }, [selectedBank, isDemo]);

    // AI key handlers no longer needed

    const fetchBanks = async () => {
        try {
            const { data, error } = await supabase
                .from('question_banks')
                .select('*, questions:question_bank_questions(count)')
                .eq('tutor_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const banksWithCount = data?.map(bank => ({
                ...bank,
                question_count: bank.questions[0]?.count || 0
            })) || [];

            setBanks(banksWithCount);
        } catch (error: any) {
            console.error('Error fetching banks:', error);
            toast.error('Failed to load question banks');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQuestions = async (bankId: string) => {
        try {
            const { data, error } = await supabase
                .from('question_bank_questions')
                .select('*')
                .eq('bank_id', bankId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setQuestions(data || []);
        } catch (error: any) {
            console.error('Error fetching questions:', error);
            toast.error('Failed to load questions');
        }
    };

    const createBank = async () => {
        if (isDemo) {
            toast('Demo mode: Sign up to save your own question banks');
            return;
        }
        if (!newBankName.trim()) {
            toast.error('Please enter a bank name');
            return;
        }

        setIsCreating(true);
        try {
            const { error } = await supabase
                .from('question_banks')
                .insert({
                    name: newBankName,
                    description: newBankDescription,
                    tutor_id: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Question bank created successfully');
            setShowCreateModal(false);
            setNewBankName('');
            setNewBankDescription('');
            fetchBanks();
        } catch (error: any) {
            console.error('Error creating bank:', error);
            toast.error('Failed to create question bank');
        } finally {
            setIsCreating(false);
        }
    };

    const deleteBank = async (bankId: string) => {
        if (isDemo) {
            toast('Demo mode: Sign up to delete and manage banks');
            return;
        }
        if (!confirm('Are you sure you want to delete this question bank? All questions will be removed.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('question_banks')
                .delete()
                .eq('id', bankId);

            if (error) throw error;

            toast.success('Question bank deleted');
            fetchBanks();
            if (selectedBank?.id === bankId) {
                setSelectedBank(null);
                setQuestions([]);
            }
        } catch (error: any) {
            console.error('Error deleting bank:', error);
            toast.error('Failed to delete question bank');
        }
    };



    const handleAddQuestion = async () => {
        if (isDemo) {
            toast('Demo mode: Sign up to add your own questions');
            return;
        }
        if (!newQuestion.question_text.trim()) {
            toast.error('Please enter a question');
            return;
        }
        if (!selectedBank) {
            toast.error('Please select a question bank first');
            return;
        }

        setIsAdding(true);
        try {
            // Validate based on question type
            if (['multiple_choice', 'multiple_select', 'dropdown'].includes(newQuestion.type)) {
                const validOptions = newQuestion.options.filter(o => o.trim());
                if (validOptions.length < 2) {
                    toast.error('Please provide at least 2 options');
                    setIsAdding(false);
                    return;
                }

                const hasCorrect = Array.isArray(newQuestion.correct_answer)
                    ? newQuestion.correct_answer.length > 0
                    : !!newQuestion.correct_answer;

                if (!hasCorrect) {
                    toast.error('Please select a correct answer');
                    setIsAdding(false);
                    return;
                }
            }

            // Prepare question data
            const questionData = {
                bank_id: selectedBank.id,
                question_text: newQuestion.question_text.trim(),
                type: newQuestion.type,
                options: ['short_answer', 'numeric'].includes(newQuestion.type)
                    ? []
                    : newQuestion.options.filter(o => o.trim()),
                correct_answer: newQuestion.correct_answer,
                points: newQuestion.points,
                difficulty: newQuestion.difficulty,
                category: newQuestion.category.trim() || null,
                tags: newQuestion.tags
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0)
            };

            const { error } = await supabase
                .from('question_bank_questions')
                .insert([questionData]);

            if (error) throw error;

            toast.success('Question added successfully!');

            // Reset form
            setNewQuestion({
                question_text: '',
                type: 'multiple_choice',
                options: ['', '', '', ''],
                correct_answer: '',
                points: 1,
                difficulty: 'medium',
                category: '',
                tags: ''
            });

            setShowAddQuestionModal(false);
            if (selectedBank) {
                fetchQuestions(selectedBank.id);
                fetchBanks();
            }
        } catch (error: any) {
            console.error('Error adding question:', error);
            toast.error('Failed to add question');
        } finally {
            setIsAdding(false);
        }
    };

    const deleteQuestion = async (questionId: string) => {
        if (!confirm('Delete this question?')) return;

        try {
            const { error } = await supabase
                .from('question_bank_questions')
                .delete()
                .eq('id', questionId);

            if (error) throw error;

            toast.success('Question deleted');
            if (selectedBank) {
                fetchQuestions(selectedBank.id);
                fetchBanks();
            }
        } catch (error: any) {
            console.error('Error deleting question:', error);
            toast.error('Failed to delete question');
        }
    };

    const exportBank = async (bankId: string, format: 'json' | 'pdf' | 'docx' = 'json') => {
        try {
            const bank = banks.find(b => b.id === bankId);
            const bankName = bank?.name || 'question_bank';

            const { data, error } = await supabase
                .from('question_bank_questions')
                .select('*')
                .eq('bank_id', bankId);

            if (error) throw error;
            if (!data || data.length === 0) {
                toast.error('No questions to export');
                return;
            }

            switch (format) {
                case 'pdf':
                    exportToPDF(data, bankName);
                    break;
                case 'docx':
                    await exportToWord(data, bankName);
                    break;
                case 'json':
                default:
                    exportToJSON(data, bankName);
                    break;
            }

            toast.success(`Question bank exported as ${format.toUpperCase()}`);
        } catch (error: any) {
            console.error('Error exporting:', error);
            toast.error('Failed to export');
        }
    };

    const filteredQuestions = questions.filter(q =>
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {isDemo && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 sm:px-6 lg:px-8 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Demo Mode - Explore the question bank. Sign up to create and save your own.</span>
                        </div>
                        <Link to="/demo" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Back to Demo</Link>
                    </div>
                </div>
            )}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Question Banks</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage reusable question collections</p>
                    </div>
                    <button
                        onClick={() => navigate(isDemo ? '/demo' : '/dashboard')}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                    >
                        ← Back to {isDemo ? 'Demo' : 'Dashboard'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Banks List */}
                    <div className="lg:col-span-1" id="bank-list">
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Banks</h2>
                                <button
                                    id="create-bank-btn"
                                    onClick={() => setShowCreateModal(true)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {banks.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                        No question banks yet.<br />Create your first one!
                                    </p>
                                ) : (
                                    banks.map(bank => (
                                        <div
                                            key={bank.id}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedBank?.id === bank.id
                                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                                }`}
                                            onClick={() => setSelectedBank(bank)}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="h-4 w-4 text-indigo-600" />
                                                        <h3 className="font-medium text-gray-900 dark:text-white">{bank.name}</h3>
                                                    </div>
                                                    {bank.description && (
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{bank.description}</p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-2">{bank.question_count || 0} questions</p>
                                                </div>
                                                <div className="flex gap-1 relative">
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExportMenuOpen(exportMenuOpen === bank.id ? null : bank.id);
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-green-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                            title="Export"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                            <ChevronDown className="h-3 w-3" />
                                                        </button>

                                                        {/* Export dropdown menu */}
                                                        {exportMenuOpen === bank.id && (
                                                            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'pdf');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t"
                                                                >
                                                                    📄 Export as PDF
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'docx');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-200 dark:border-gray-600"
                                                                >
                                                                    📝 Export as Word
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'json');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 border-t border-gray-200 dark:border-gray-600 rounded-b"
                                                                >
                                                                    { } Export as JSON
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteBank(bank.id);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-red-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Questions List */}
                    <div className="lg:col-span-2" id="questions-list">
                        {selectedBank ? (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBank.name}</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{questions.length} questions</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddQuestionModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Question
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="mb-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search questions..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {/* Questions */}
                                <div className="space-y-4">
                                    {filteredQuestions.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500 dark:text-gray-400">
                                                {searchQuery ? 'No questions found' : 'No questions yet. Import some!'}
                                            </p>
                                        </div>
                                    ) : (
                                        filteredQuestions.map((question, idx) => (
                                            <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded">
                                                                {question.type.replace('_', ' ')}
                                                            </span>
                                                            {question.difficulty && (
                                                                <span className={`px-2 py-1 text-xs font-medium rounded ${question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                                    question.difficulty === 'hard' ? 'bg-red-100 text-red-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                    }`}>
                                                                    {question.difficulty}
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-gray-500">{question.points} pts</span>
                                                        </div>
                                                        <p className="text-gray-900 dark:text-white font-medium">{idx + 1}. {question.question_text}</p>
                                                        {question.options && question.options.length > 0 && (
                                                            <ul className="mt-2 ml-4 space-y-1">
                                                                {question.options.map((opt, i) => (
                                                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                                                                        {String.fromCharCode(65 + i)}. {opt}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => deleteQuestion(question.id)}
                                                        className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Bank Selected</h3>
                                <p className="text-gray-600 dark:text-gray-400">Select a question bank to view and manage questions</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Bank Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Question Bank</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    value={newBankName}
                                    onChange={(e) => setNewBankName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="e.g., Math Grade 10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
                                <textarea
                                    value={newBankDescription}
                                    onChange={(e) => setNewBankDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                    placeholder="Describe this question bank..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBank}
                                disabled={isCreating}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {isCreating ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {showAddQuestionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Question</h3>
                            <button
                                onClick={() => setShowAddQuestionModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Question Text */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Question Text *
                                </label>
                                <textarea
                                    value={newQuestion.question_text}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    rows={3}
                                    placeholder="Enter your question here..."
                                />
                            </div>

                            {/* Question Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Question Type *
                                </label>
                                <select
                                    value={newQuestion.type}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        setNewQuestion({
                                            ...newQuestion,
                                            type: newType,
                                            options: (newType === 'short_answer' || newType === 'numeric') ? [] : ['', '', '', ''],
                                            correct_answer: newType === 'multiple_select' ? [] : ''
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="multiple_choice">Multiple Choice</option>
                                    <option value="multiple_select">Multiple Select</option>
                                    <option value="dropdown">Dropdown</option>
                                    <option value="true_false">True / False</option>
                                    <option value="short_answer">Short Answer</option>
                                    <option value="numeric">Numeric Answer</option>
                                </select>
                            </div>

                            {/* Options (for MCQ, True/False, Multiple Select, Dropdown) */}
                            {['multiple_choice', 'multiple_select', 'true_false', 'dropdown'].includes(newQuestion.type) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Options {newQuestion.type !== 'true_false' ? '*' : ''}
                                    </label>
                                    <div className="space-y-3">
                                        {(newQuestion.type === 'true_false' ? ['True', 'False'] : newQuestion.options).map((option, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                {/* Selection Input (Radio or Checkbox) */}
                                                <input
                                                    type={newQuestion.type === 'multiple_select' ? 'checkbox' : 'radio'}
                                                    name="correct_answer"
                                                    value={option}
                                                    checked={
                                                        newQuestion.type === 'multiple_select'
                                                            ? (Array.isArray(newQuestion.correct_answer) && newQuestion.correct_answer.includes(option))
                                                            : newQuestion.correct_answer === option
                                                    }
                                                    onChange={() => {
                                                        if (newQuestion.type === 'multiple_select') {
                                                            const current = Array.isArray(newQuestion.correct_answer) ? [...newQuestion.correct_answer] : [];
                                                            if (current.includes(option)) {
                                                                setNewQuestion({ ...newQuestion, correct_answer: current.filter(c => c !== option) });
                                                            } else {
                                                                setNewQuestion({ ...newQuestion, correct_answer: [...current, option] });
                                                            }
                                                        } else {
                                                            setNewQuestion({ ...newQuestion, correct_answer: option });
                                                        }
                                                    }}
                                                    className={`h-4 w-4 cursor-pointer text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${newQuestion.type !== 'multiple_select' ? 'rounded-full' : ''}`}
                                                />

                                                {/* Text Input (Disabled for True/False) */}
                                                <input
                                                    type="text"
                                                    value={option}
                                                    onChange={(e) => {
                                                        if (newQuestion.type !== 'true_false') {
                                                            const newOptions = [...newQuestion.options];
                                                            const oldVal = newOptions[index];
                                                            newOptions[index] = e.target.value;

                                                            // Update correct_answer reference if it was selected
                                                            let newCorrect = newQuestion.correct_answer;
                                                            if (newQuestion.type === 'multiple_select' && Array.isArray(newCorrect)) {
                                                                if (newCorrect.includes(oldVal)) {
                                                                    newCorrect = newCorrect.map(c => c === oldVal ? e.target.value : c);
                                                                }
                                                            } else if (newCorrect === oldVal) {
                                                                newCorrect = e.target.value;
                                                            }

                                                            setNewQuestion({ ...newQuestion, options: newOptions, correct_answer: newCorrect });
                                                        }
                                                    }}
                                                    disabled={newQuestion.type === 'true_false'}
                                                    placeholder={`Option ${index + 1}`}
                                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                                />

                                                {/* Remove Button */}
                                                {newQuestion.type !== 'true_false' && (
                                                    <button
                                                        onClick={() => {
                                                            const newOptions = newQuestion.options.filter((_, i) => i !== index);
                                                            // Cleanup correct answer if removed
                                                            let newCorrect = newQuestion.correct_answer;
                                                            if (newQuestion.type === 'multiple_select' && Array.isArray(newCorrect)) {
                                                                newCorrect = newCorrect.filter(c => c !== option);
                                                            } else if (newCorrect === option) {
                                                                newCorrect = '';
                                                            }
                                                            setNewQuestion({ ...newQuestion, options: newOptions, correct_answer: newCorrect });
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remove option"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {/* Add Option Button */}
                                        {newQuestion.type !== 'true_false' && (
                                            <button
                                                onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                                                className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add Option
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {newQuestion.type === 'multiple_select'
                                            ? 'Check all that apply.'
                                            : 'Select the radio button for the correct answer.'}
                                    </p>
                                </div>
                            )}

                            {/* Correct Answer for Short/Numeric */}
                            {(newQuestion.type === 'short_answer' || newQuestion.type === 'numeric') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Correct Answer *
                                    </label>
                                    <input
                                        type={newQuestion.type === 'numeric' ? 'number' : 'text'}
                                        value={newQuestion.correct_answer as string}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Enter the correct answer..."
                                    />
                                </div>
                            )}

                            {/* Points */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Points
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={newQuestion.points}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Difficulty
                                </label>
                                <select
                                    value={newQuestion.difficulty}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category (optional)
                                </label>
                                <input
                                    type="text"
                                    value={newQuestion.category}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="e.g., Biology, Chapter 3"
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tags (optional, comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={newQuestion.tags}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="e.g., important, exam2024"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddQuestionModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddQuestion}
                                disabled={isAdding}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isAdding ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-5 w-5" />
                                        Add Question
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
