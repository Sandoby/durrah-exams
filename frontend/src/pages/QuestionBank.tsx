import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, FileText, BookOpen, Loader2, Download, Search, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { extractQuestionsFromFile } from '../lib/extractors';
import { extractQuestionsHybrid, formatConfidenceDisplay, getConfidenceColor } from '../lib/ai/hybridExtractor';

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
    const [showImportModal, setShowImportModal] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [newBankDescription, setNewBankDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [useHybridExtraction, setUseHybridExtraction] = useState(true);
    const [extractionMetadata, setExtractionMetadata] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchBanks();
        }
    }, [user]);

    useEffect(() => {
        if (selectedBank) {
            fetchQuestions(selectedBank.id);
        }
    }, [selectedBank]);

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

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }
        if (!selectedBank) {
            toast.error('Please select a question bank first');
            return;
        }
        setIsImporting(true);
        const loadingToast = toast.loading('Extracting questions from file...');
        try {
            let extractedQuestions;
            let metadata = null;

            if (useHybridExtraction) {
                // Use hybrid extraction with AI fallback
                const text = await selectedFile.text();
                const result = await extractQuestionsHybrid(text, {
                    useAI: true,
                    confidenceThreshold: 80,
                });
                extractedQuestions = result.questions;
                metadata = result.metadata;
                setExtractionMetadata(metadata);

                // Log extraction details
                console.log(`✅ Hybrid extraction: ${extractedQuestions.length} questions`);
                console.log(`📊 Confidence: ${metadata.localConfidenceScore}%`);
                if (metadata.usedAI) {
                    console.log(`🤖 AI Provider: ${metadata.aiProvider}`);
                }
            } else {
                // Fallback to original extraction
                extractedQuestions = await extractQuestionsFromFile(selectedFile);
            }

            if (!extractedQuestions.length) throw new Error('No questions found in file');

            // Sanitize function to clean invalid characters
            const sanitizeText = (text: string | undefined): string => {
                if (!text) return '';
                // Remove null bytes and control characters
                return text
                    .replace(/\0/g, '') // Remove null bytes
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
                    .trim();
            };

            const sanitizeArray = (arr: any[] | undefined): string[] => {
                if (!Array.isArray(arr)) return [];
                return arr
                    .filter(item => item !== null && item !== undefined)
                    .map(item => sanitizeText(String(item)))
                    .filter(item => item.length > 0);
            };

            const questionsToInsert = extractedQuestions.map(q => ({
                bank_id: selectedBank.id,
                type: q.type || 'multiple_choice',
                question_text: sanitizeText(q.question_text),
                options: sanitizeArray(q.options),
                correct_answer: sanitizeText(String(q.correct_answer || '')),
                points: Math.max(1, Math.min(100, q.points || 1)),
                difficulty: q.difficulty || 'medium',
                category: sanitizeText(q.category),
                tags: sanitizeArray(q.tags)
            })).filter(q => q.question_text.length > 0); // Filter out empty questions

            if (!questionsToInsert.length) {
                throw new Error('No valid questions to insert after sanitization');
            }

            console.log(`📤 Inserting ${questionsToInsert.length} sanitized questions...`);
            const { error } = await supabase.from('question_bank_questions').insert(questionsToInsert);
            if (error) {
                console.error('❌ Supabase insert error:', error);
                throw error;
            }

            const successMsg = metadata 
                ? `Imported ${questionsToInsert.length} questions (${formatConfidenceDisplay(metadata.localConfidenceScore)})`
                : `Successfully imported ${questionsToInsert.length} questions!`;

            toast.success(successMsg, { id: loadingToast });
            setShowImportModal(false);
            setSelectedFile(null);
            fetchQuestions(selectedBank.id);
            fetchBanks();
        } catch (error: any) {
            console.error('Error importing questions:', error);
            toast.error(error.message || 'Failed to import questions', { id: loadingToast });
        } finally {
            setIsImporting(false);
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

    const exportBank = async (bankId: string) => {
        try {
            const { data, error } = await supabase
                .from('question_bank_questions')
                .select('*')
                .eq('bank_id', bankId);

            if (error) throw error;

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `question_bank_${bankId}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Question bank exported');
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Question Banks</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage reusable question collections</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Banks List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Banks</h2>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {banks.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                                        No question banks yet.<br/>Create your first one!
                                    </p>
                                ) : (
                                    banks.map(bank => (
                                        <div
                                            key={bank.id}
                                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                                selectedBank?.id === bank.id
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
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            exportBank(bank.id);
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-green-600"
                                                        title="Export"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </button>
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
                    <div className="lg:col-span-2">
                        {selectedBank ? (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedBank.name}</h2>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{questions.length} questions</p>
                                    </div>
                                    <button
                                        onClick={() => setShowImportModal(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Import Questions
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
                                                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
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

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import Questions</h3>
                        
                        <div className="space-y-4">
                            {/* Hybrid Extraction Toggle */}
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="hybridToggle"
                                        checked={useHybridExtraction}
                                        onChange={(e) => setUseHybridExtraction(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <label htmlFor="hybridToggle" className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-900 dark:text-white">
                                            <Zap className="h-4 w-4 text-amber-500" />
                                            Use Hybrid Extraction
                                        </label>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            Smart local + AI fallback for better accuracy
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Upload PDF or Word Document
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Supported formats: PDF, DOC, DOCX, TXT
                                </p>
                            </div>

                            {/* Extraction Metadata Display */}
                            {extractionMetadata && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Questions Extracted:</span>
                                        <span className="text-sm font-bold text-indigo-600">{extractionMetadata.totalExtracted}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Confidence:</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${extractionMetadata.localConfidenceScore}%`,
                                                        backgroundColor: getConfidenceColor(extractionMetadata.localConfidenceScore)
                                                    }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                {formatConfidenceDisplay(extractionMetadata.localConfidenceScore)}
                                            </span>
                                        </div>
                                    </div>
                                    {extractionMetadata.usedAI && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">AI Provider:</span>
                                            <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                                                {extractionMetadata.aiProvider?.toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    {extractionMetadata.issues.length > 0 && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                                ⚠️ {extractionMetadata.issues.join(', ')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowImportModal(false);
                                    setSelectedFile(null);
                                    setExtractionMetadata(null);
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFileUpload}
                                disabled={isImporting || !selectedFile}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-5 w-5" />
                                        Import
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
