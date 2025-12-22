import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, FileText, BookOpen, Loader2, Download, Search, X, ChevronDown, Sparkles, Menu, LogOut, Settings, Crown, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
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
    const { t } = useTranslation();
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);

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
            fetchProfile();
        }
    }, [user, isDemo]);

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

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
        <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 font-sans">
            {/* Navbar */}
            <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Logo />
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {user?.user_metadata?.full_name || user?.email}
                            </span>
                            {profile?.subscription_status !== 'active' && (
                                <Link
                                    to="/checkout"
                                    className="inline-flex items-center px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full hover:bg-indigo-100 transition-all"
                                >
                                    <Crown className="h-4 w-4 mr-2" />
                                    {t('settings.subscription.upgrade')}
                                </Link>
                            )}
                            <Link
                                to="/settings"
                                className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                                title={t('settings.title')}
                            >
                                <Settings className="h-5 w-5" />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                title={t('nav.logout', 'Logout')}
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                            >
                                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
                        <div className="px-4 py-6 space-y-4">
                            <div className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                {user?.user_metadata?.full_name || user?.email}
                            </div>
                            <Link to="/settings" className="flex items-center px-4 py-3 rounded-2xl text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                                <Settings className="h-5 w-5 mr-3" />
                                {t('settings.title')}
                            </Link>
                            <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 rounded-2xl text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <LogOut className="h-5 w-5 mr-3" />
                                {t('nav.logout', 'Logout')}
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {isDemo && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 lg:px-8 py-3">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-sm font-medium">Demo Mode - Explore the question bank. Sign up to save your own.</span>
                        </div>
                        <Link to="/demo" className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all">Back to Demo</Link>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link to="/dashboard" className="p-2 rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 shadow-sm border border-gray-100 dark:border-gray-700 transition-all">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                Question <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Banks</span>
                            </h1>
                        </div>
                        <p className="text-lg text-gray-600 dark:text-gray-400 font-medium ml-12">Create and manage reusable question collections</p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all ml-12 md:ml-0"
                    >
                        <Plus className="h-5 w-5" />
                        Create New Bank
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Banks List Sidebar */}
                    <div className="lg:col-span-4" id="bank-list">
                        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm border border-gray-100 dark:border-gray-700 rounded-[2rem] p-8">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-1 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-indigo-600" />
                                Your Libraries
                            </h2>

                            <div className="space-y-4">
                                {banks.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                        No question banks yet.<br />Create your first one!
                                    </p>
                                ) : (
                                    banks.map(bank => (
                                        <div
                                            key={bank.id}
                                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] ${selectedBank?.id === bank.id
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20 ring-4 ring-indigo-100 dark:ring-indigo-900/10'
                                                : 'border-white dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-gray-100 dark:hover:border-gray-700 shadow-sm'
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
                                                <div className="flex gap-2 relative">
                                                    <div className="relative">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExportMenuOpen(exportMenuOpen === bank.id ? null : bank.id);
                                                            }}
                                                            className="flex items-center gap-1 p-2 text-gray-400 hover:text-green-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                                                            title="Export"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </button>

                                                        {/* Export dropdown menu */}
                                                        {exportMenuOpen === bank.id && (
                                                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 py-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'pdf');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                                >
                                                                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                                                                    Export as PDF
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'docx');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                                >
                                                                    <FileText className="w-4 h-4 mr-2 text-blue-500" />
                                                                    Export as Word
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        exportBank(bank.id, 'json');
                                                                        setExportMenuOpen(null);
                                                                    }}
                                                                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                                                >
                                                                    <FileText className="w-4 h-4 mr-2 text-yellow-500" />
                                                                    Export as JSON
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteBank(bank.id);
                                                        }}
                                                        className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
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

                    {/* Questions List Main Area */}
                    <div className="lg:col-span-8" id="questions-list">
                        {selectedBank ? (
                            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-sm border border-gray-100 dark:border-gray-700 rounded-[2rem] p-8 min-h-[600px]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedBank.name}</h2>
                                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">{questions.length} questions</span>
                                            <span>•</span>
                                            <span>Collection Library</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowAddQuestionModal(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md"
                                    >
                                        <Plus className="h-5 w-5" />
                                        Add Question
                                    </button>
                                </div>

                                {/* Search Bar */}
                                <div className="mb-8 group">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search items in this bank..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-6 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
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
                                        filteredQuestions.map((question) => (
                                            <div key={question.id} className="group border-2 border-gray-50 dark:border-gray-800 hover:border-indigo-100 dark:hover:border-indigo-900/30 rounded-2xl p-6 transition-all hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-indigo-500/5">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                                            <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                                                                {question.type.replace('_', ' ')}
                                                            </span>
                                                            {question.difficulty && (
                                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${question.difficulty === 'easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-900/50' :
                                                                    question.difficulty === 'hard' ? 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-900/50' :
                                                                        'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900/50'
                                                                    }`}>
                                                                    {question.difficulty}
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                                <FileText className="w-3 h-3" />
                                                                {question.points} Points
                                                            </div>
                                                        </div>
                                                        <p className="text-lg text-gray-900 dark:text-white font-bold leading-tight mb-4">
                                                            {question.question_text}
                                                        </p>
                                                        {question.options && question.options.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mt-4">
                                                                {question.options.map((option, i) => (
                                                                    <span key={i} className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 rounded-xl border border-gray-100 dark:border-gray-800">
                                                                        {option}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => deleteQuestion(question.id)}
                                                            className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-900/50 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl shadow-sm border border-gray-100 dark:border-gray-700 rounded-[2rem] p-24 text-center flex flex-col items-center justify-center">
                                <div className="w-32 h-32 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
                                    <BookOpen className="h-16 w-16 text-indigo-600/50" />
                                </div>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Select a Library</h3>
                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-sm">Choose a question bank from the sidebar to start managing your collection</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create Bank Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="absolute top-0 right-0 p-6">
                                <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mb-8">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Create Library</h3>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Group your questions by topic or subject</p>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">Library Name</label>
                                    <input
                                        type="text"
                                        value={newBankName}
                                        onChange={(e) => setNewBankName(e.target.value)}
                                        className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
                                        placeholder="e.g., Mathematics Vol. 1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">Brief Description (optional)</label>
                                    <textarea
                                        value={newBankDescription}
                                        onChange={(e) => setNewBankDescription(e.target.value)}
                                        className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none resize-none"
                                        rows={3}
                                        placeholder="What topics does this library cover?"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={createBank}
                                    disabled={isCreating}
                                    className="flex-1 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isCreating ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : 'Create Library'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Question Modal */}
            {
                showAddQuestionModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAddQuestionModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl max-w-2xl w-full my-8 p-10 overflow-hidden border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">New Question</h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Adding to {selectedBank?.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowAddQuestionModal(false)}
                                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                {/* Question Text */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                        Question Prompt *
                                    </label>
                                    <textarea
                                        value={newQuestion.question_text}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                        className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none resize-none"
                                        rows={3}
                                        placeholder="What would you like to ask?"
                                    />
                                </div>

                                {/* Question Type */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                        Response Format *
                                    </label>
                                    <div className="relative group">
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
                                            className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="multiple_choice">Multiple Choice</option>
                                            <option value="multiple_select">Multiple Select</option>
                                            <option value="dropdown">Dropdown Selection</option>
                                            <option value="true_false">True / False</option>
                                            <option value="short_answer">Short Text Response</option>
                                            <option value="numeric">Numerical Value</option>
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Options (for MCQ, True/False, Multiple Select, Dropdown) */}
                                {['multiple_choice', 'multiple_select', 'true_false', 'dropdown'].includes(newQuestion.type) && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                            Choices {newQuestion.type !== 'true_false' ? '*' : ''}
                                        </label>
                                        <div className="space-y-4">
                                            {(newQuestion.type === 'true_false' ? ['True', 'False'] : newQuestion.options).map((option, index) => (
                                                <div key={index} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 border-2 border-transparent focus-within:border-indigo-500/30 focus-within:bg-white dark:focus-within:bg-gray-900 transition-all group">
                                                    {/* Selection Input (Radio or Checkbox) */}
                                                    <div className="relative flex items-center justify-center">
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
                                                            className={`h-6 w-6 cursor-pointer text-indigo-600 focus:ring-offset-0 focus:ring-0 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 checked:bg-indigo-600 transition-colors ${newQuestion.type !== 'multiple_select' ? 'rounded-full' : 'rounded-lg'}`}
                                                        />
                                                    </div>

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
                                                        readOnly={newQuestion.type === 'true_false'}
                                                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none"
                                                    />

                                                    {newQuestion.type !== 'true_false' && newQuestion.options.length > 2 && (
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
                                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove option"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {newQuestion.type !== 'true_false' && newQuestion.options.length < 6 && (
                                                <button
                                                    onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ''] })}
                                                    className="flex items-center gap-2 px-4 py-3 text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl hover:bg-indigo-100 transition-all mt-4"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Choice
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Correct Answer for Short/Numeric */}
                                {(newQuestion.type === 'short_answer' || newQuestion.type === 'numeric') && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                            Correct Answer *
                                        </label>
                                        <input
                                            type={newQuestion.type === 'numeric' ? 'number' : 'text'}
                                            value={newQuestion.correct_answer as string}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                                            className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
                                            placeholder="Enter the correct answer..."
                                        />
                                    </div>
                                )}

                                {/* Points and Difficulty */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                            Points
                                        </label>
                                        <input
                                            type="number"
                                            value={newQuestion.points}
                                            onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                                            className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
                                            min="1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                            Difficulty
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={newQuestion.difficulty}
                                                onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                                                className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none appearance-none cursor-pointer"
                                            >
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                <ChevronDown className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                        Category (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={newQuestion.category}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value })}
                                        className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
                                        placeholder="e.g., Biology, Chapter 3"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 ml-1">
                                        Tags (optional, comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={newQuestion.tags}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, tags: e.target.value })}
                                        className="w-full px-5 py-4 border-2 border-gray-50 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:border-indigo-500/50 focus:bg-white dark:focus:bg-gray-900 transition-all outline-none"
                                        placeholder="e.g., important, exam2024"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-10">
                                <button
                                    onClick={() => setShowAddQuestionModal(false)}
                                    className="flex-1 px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-black hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddQuestion}
                                    disabled={isAdding}
                                    className="flex-[2] px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isAdding ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="h-6 w-6" />
                                            Add to Library
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
