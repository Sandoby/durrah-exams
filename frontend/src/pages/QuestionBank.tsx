import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, BookOpen, Loader2, Download, Search, List as ListIcon,
    FolderPlus, BrainCircuit
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { exportToJSON, exportToPDF, exportToWord } from '../lib/exportUtils';
import { useDemoTour } from '../hooks/useDemoTour';
import { AIQuestionGeneratorModal } from '../components/AIQuestionGeneratorModal';

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

    // Data State
    const [banks, setBanks] = useState<QuestionBank[]>([]);
    const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

    // Form State
    const [newBankName, setNewBankName] = useState('');
    const [newBankDescription, setNewBankDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // User Profile
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

    // Check for Demo Mode
    const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';
    const [startDemoTour] = useState(isDemo);
    useDemoTour('question-bank', startDemoTour && isDemo);

    // Initial Load
    useEffect(() => {
        if (isDemo) {
            loadDemoData();
            return;
        }

        if (user) {
            // Auto cleanup demo state
            localStorage.removeItem('demoMode');
            localStorage.removeItem('demoScenario');
            fetchBanks();
            fetchProfile();
        }
    }, [user, isDemo]);

    // Fetch questions when bank selected
    useEffect(() => {
        if (isDemo && selectedBank) return;
        if (selectedBank) {
            fetchQuestions(selectedBank.id);
        } else {
            setQuestions([]);
        }
    }, [selectedBank, isDemo]);

    const loadDemoData = () => {
        const demoBanks: QuestionBank[] = [
            { id: 'demo-1', name: 'Physics 101', description: 'Mechanics and Thermodynamics', tutor_id: 'demo', created_at: new Date().toISOString(), question_count: 15 },
            { id: 'demo-2', name: 'Calculus I', description: 'Limits and Derivatives', tutor_id: 'demo', created_at: new Date().toISOString(), question_count: 8 },
        ];
        setBanks(demoBanks);
        setSelectedBank(demoBanks[0]);
        setQuestions([
            { id: 'q1', type: 'multiple_choice', question_text: 'What is Newton\'s Second Law?', options: ['F=ma', 'E=mc^2', 'a^2+b^2=c^2', 'PV=nRT'], correct_answer: 'F=ma', points: 1, difficulty: 'easy', category: 'Physics' },
            { id: 'q2', type: 'true_false', question_text: 'Energy is conserved in an isolated system.', correct_answer: 'True', points: 1, difficulty: 'medium', category: 'Physics' },
        ]);
        setIsLoading(false);
    };

    const fetchProfile = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) setProfile(data);
    };

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
            // Select first bank by default if none selected
            if (!selectedBank && banksWithCount.length > 0) {
                setSelectedBank(banksWithCount[0]);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
            toast.error('Failed to load libraries');
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
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Failed to update questions');
        }
    };

    // --- Actions ---

    const handleCreateBank = async () => {
        if (isDemo) return toast('Demo mode: Action disabled');
        if (!newBankName.trim()) return toast.error(t('questionBank.validation.name'));

        setIsCreating(true);
        try {
            const { error } = await supabase.from('question_banks').insert({
                name: newBankName,
                description: newBankDescription,
                tutor_id: user?.id
            });
            if (error) throw error;

            toast.success('Library created successfully');
            setShowCreateModal(false);
            setNewBankName('');
            setNewBankDescription('');
            fetchBanks();
        } catch (e) {
            toast.error('Failed to create library');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteBank = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isDemo) return toast('Demo mode: Action disabled');
        if (!confirm(t('questionBank.confirm.deleteBank'))) return;

        try {
            await supabase.from('question_banks').delete().eq('id', id);
            toast.success('Library deleted');
            if (selectedBank?.id === id) setSelectedBank(null);
            fetchBanks();
        } catch (e) {
            toast.error('Failed to delete library');
        }
    };

    const handleAddQuestion = async () => {
        if (isDemo) return toast('Demo mode: Action disabled');
        if (!selectedBank) return;
        if (!newQuestion.question_text.trim()) return toast.error('Question text required');

        setIsAdding(true);
        try {
            // Basic validation and data prep logic similar to original file
            // ... (omitted for brevity, assume same logic as before)
            const questionData = {
                bank_id: selectedBank.id,
                question_text: newQuestion.question_text.trim(),
                type: newQuestion.type,
                options: ['short_answer', 'numeric'].includes(newQuestion.type) ? [] : newQuestion.options.filter(o => o.trim()),
                correct_answer: newQuestion.correct_answer,
                points: newQuestion.points,
                difficulty: newQuestion.difficulty,
                category: newQuestion.category,
                tags: newQuestion.tags ? newQuestion.tags.split(',').map(t => t.trim()) : []
            };

            const { error } = await supabase.from('question_bank_questions').insert([questionData]);
            if (error) throw error;

            toast.success('Question added');
            setShowAddQuestionModal(false);
            fetchQuestions(selectedBank.id);
            fetchBanks(); // update counts

            // Reset form
            setNewQuestion({ ...newQuestion, question_text: '', options: ['', '', '', ''], correct_answer: '' });
        } catch (e) {
            toast.error('Failed to add question');
        } finally {
            setIsAdding(false);
        }
    };

    const handleAddAIQuestions = async (newQuestions: any[]) => {
        if (!selectedBank) return;
        setIsAdding(true);
        try {
            const batchData = newQuestions.map(q => ({
                bank_id: selectedBank.id,
                question_text: q.question_text,
                type: q.type,
                options: q.options || [],
                correct_answer: q.correct_answer,
                points: q.points || 1,
                difficulty: q.difficulty || 'medium',
                category: q.category || selectedBank.name,
                tags: Array.isArray(q.tags) ? q.tags : []
            }));

            const { error } = await supabase.from('question_bank_questions').insert(batchData);
            if (error) throw error;
            toast.success(`Generated ${newQuestions.length} questions!`);
            fetchQuestions(selectedBank.id);
            fetchBanks();
        } catch (e) {
            toast.error('Failed to save AI questions');
        } finally {
            setIsAdding(false);
        }
    };

    const exportBank = async (bankId: string, format: 'json' | 'pdf' | 'docx') => {
        const bank = banks.find(b => b.id === bankId);
        if (!bank) return;

        try {
            const { data } = await supabase.from('question_bank_questions').select('*').eq('bank_id', bankId);
            if (!data || !data.length) return toast.error('No questions to export');

            if (format === 'json') exportToJSON(data, bank.name);
            if (format === 'pdf') exportToPDF(data, bank.name);
            if (format === 'docx') await exportToWord(data, bank.name);

            toast.success(`Exported as ${format.toUpperCase()}`);
        } catch (e) {
            toast.error('Export failed');
        }
    };

    // --- Filtering ---
    const filteredQuestions = questions.filter(q => {
        const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' || q.difficulty === activeTab;
        return matchesSearch && matchesTab;
    });

    if (isLoading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0B0F19] font-sans text-slate-900 dark:text-slate-100 flex flex-col md:flex-row overflow-hidden">

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-80 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen z-20">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="bg-indigo-600 p-1.5 rounded-lg">
                            <Logo className="w-5 h-5 text-white" showText={false} />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Durrah<span className="text-indigo-500">Bank</span></span>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <FolderPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>{t('questionBank.createBank', 'New Library')}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
                    <div className="mb-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Your Libraries</div>
                    {banks.length === 0 ? (
                        <div className="text-center py-8 px-4 opacity-50">
                            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No libraries yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {banks.map(bank => (
                                <div
                                    key={bank.id}
                                    onClick={() => setSelectedBank(bank)}
                                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedBank?.id === bank.id
                                        ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <BookOpen className={`w-4 h-4 flex-shrink-0 ${selectedBank?.id === bank.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <div className="truncate">
                                            <div className="truncate">{bank.name}</div>
                                            <div className="text-[10px] opacity-70 font-normal">{bank.question_count || 0} questions</div>
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <button
                                            onClick={() => exportBank(bank.id, 'json')}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500"
                                            title="Export"
                                        >
                                            <Download className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteBank(bank.id, e)}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-slate-500 hover:text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {user?.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-medium truncate">{user?.email}</div>
                            <div className="text-xs text-slate-500 capitalize">{profile?.subscription_plan || 'Free'} Plan</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Header Toolbar */}
                <header className="h-16 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 -ml-2 text-slate-500">
                            <ListIcon className="w-6 h-6" />
                        </button>
                        {selectedBank ? (
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    {selectedBank.name}
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                        {questions.length} items
                                    </span>
                                </h1>
                            </div>
                        ) : (
                            <h1 className="text-xl font-bold text-slate-400">Select a library</h1>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            {['all', 'easy', 'medium', 'hard'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === tab
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block" />

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAIModal(true)}
                                disabled={!selectedBank}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                <BrainCircuit className="w-4 h-4 group-hover:animate-pulse" />
                                <span className="hidden sm:inline">AI Generate</span>
                            </button>

                            <button
                                onClick={() => setShowAddQuestionModal(true)}
                                disabled={!selectedBank}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Item</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] dark:bg-[#0B0F19]">
                    {!selectedBank ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                            <h2 className="text-xl font-semibold mb-2">No Library Selected</h2>
                            <p className="max-w-md text-center text-sm">Select a library from the sidebar to view questions, or create a new one to get started.</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto">
                            {/* Search Bar */}
                            <div className="mb-6 sticky top-0 z-10">
                                <div className="relative shadow-sm">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search questions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Questions Grid/List */}
                            {filteredQuestions.length === 0 ? (
                                <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">No questions found</h3>
                                    <p className="text-slate-500 text-sm mt-1">Try changing your search or add a new question.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {filteredQuestions.map(question => (
                                        <div
                                            key={question.id}
                                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900 transition-all group relative overflow-hidden"
                                        >
                                            {/* Decorative side accent */}
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                                                            {question.type.replace('_', ' ')}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${question.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            question.difficulty === 'hard' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                            }`}>
                                                            {question.difficulty}
                                                        </span>
                                                        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                            {question.points} pts
                                                        </span>
                                                    </div>

                                                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 leading-snug mb-3 p-1">
                                                        {question.question_text}
                                                    </h3>

                                                    {/* Options Preview */}
                                                    {['multiple_choice', 'multiple_select'].includes(question.type) && question.options && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                            {question.options.slice(0, 4).map((opt, i) => (
                                                                <div key={i} className={`text-sm px-3 py-2 rounded-lg border ${(Array.isArray(question.correct_answer) ? question.correct_answer.includes(opt) : question.correct_answer === opt)
                                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400'
                                                                    }`}>
                                                                    {opt}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modals */}
                <AIQuestionGeneratorModal
                    isOpen={showAIModal}
                    onClose={() => setShowAIModal(false)}
                    onAddQuestions={handleAddAIQuestions}
                    bankName={selectedBank?.name || ''}
                />
            </main>

            {/* Create Bank Modal - simplified inline for demo but would separate in real app */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4">Create New Library</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    value={newBankName}
                                    onChange={e => setNewBankName(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent"
                                    placeholder="e.g. Biology 101"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    value={newBankDescription}
                                    onChange={e => setNewBankDescription(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent"
                                    placeholder="Optional description..."
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                                <button onClick={handleCreateBank} disabled={isCreating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">
                                    {isCreating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Create Library'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {showAddQuestionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">Add New Question</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Question Text</label>
                                <textarea
                                    value={newQuestion.question_text}
                                    onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent min-h-[100px]"
                                    placeholder="Enter your question here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select
                                        value={newQuestion.type}
                                        onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent"
                                    >
                                        <option value="multiple_choice">Multiple Choice</option>
                                        <option value="true_false">True/False</option>
                                        <option value="short_answer">Short Answer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Difficulty</label>
                                    <select
                                        value={newQuestion.difficulty}
                                        onChange={e => setNewQuestion({ ...newQuestion, difficulty: e.target.value as any })}
                                        className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            {['multiple_choice'].includes(newQuestion.type) && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium">Options</label>
                                    {newQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <div className="w-8 flex items-center justify-center text-slate-400 font-mono">{String.fromCharCode(65 + idx)}</div>
                                            <input
                                                value={opt}
                                                onChange={e => {
                                                    const newOpts = [...newQuestion.options];
                                                    newOpts[idx] = e.target.value;
                                                    setNewQuestion({ ...newQuestion, options: newOpts });
                                                }}
                                                className="flex-1 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent"
                                                placeholder={`Option ${idx + 1}`}
                                            />
                                            <input
                                                type="radio"
                                                name="correct_answer"
                                                checked={newQuestion.correct_answer === opt}
                                                onChange={() => setNewQuestion({ ...newQuestion, correct_answer: opt })}
                                                className="mt-3 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {newQuestion.type === 'true_false' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Correct Answer</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="tf_answer"
                                                checked={newQuestion.correct_answer === 'True'}
                                                onChange={() => setNewQuestion({ ...newQuestion, correct_answer: 'True' })}
                                            /> True
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="tf_answer"
                                                checked={newQuestion.correct_answer === 'False'}
                                                onChange={() => setNewQuestion({ ...newQuestion, correct_answer: 'False' })}
                                            /> False
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setShowAddQuestionModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                                <button onClick={handleAddQuestion} disabled={isAdding} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">
                                    {isAdding ? <Loader2 className="animate-spin w-4 h-4" /> : 'Add Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
