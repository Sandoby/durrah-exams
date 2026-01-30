import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../store';
import { useSaveExam } from '../hooks/useSaveExam';
import { Logo } from '../../../components/Logo';
import {
    ArrowLeft,
    Save,
    Eye,
    EyeOff,
    Loader2
} from 'lucide-react';

export function EditorNavbar() {
    const navigate = useNavigate();
    const { isSaving, isPreviewMode, setPreviewMode } = useExamStore();
    const { saveExam } = useSaveExam();

    return (
        <nav className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between px-6 z-30">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors group"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:-translate-x-0.5 transition-transform" />
                </button>

                <div className="flex items-center gap-3">
                    <Logo showText={false} size="sm" />
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Durrah Editor</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                                {isSaving ? 'Saving Changes...' : 'All changes saved'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setPreviewMode(!isPreviewMode)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${isPreviewMode
                        ? 'bg-gray-100 text-gray-900 dark:bg-gray-800'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                >
                    {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {isPreviewMode ? 'Editing' : 'Preview'}
                </button>

                <button
                    onClick={saveExam}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-black rounded-xl shadow-lg shadow-gray-200 dark:shadow-none hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Exam'}
                </button>

            </div>
        </nav>
    );
}
