import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, LogOut, Loader2, Share2, BarChart3, FileText, Settings, Crown } from 'lucide-react';
import { Logo } from '../components/Logo';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { ExamResults } from '../components/ExamResults';
import { ChatWidget } from '../components/ChatWidget';

interface Exam {
    id: string;
    title: string;
    description: string;
    created_at: string;
    is_active: boolean;
}

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedExamForResults, setSelectedExamForResults] = useState<Exam | null>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchExams();
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('subscription_status, subscription_plan, subscription_end_date')
                .eq('id', user?.id)
                .single();
            setProfile(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const fetchExams = async () => {
        try {
            const { data, error } = await supabase
                .from('exams')
                .select('*')
                .eq('tutor_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setExams(data || []);
        } catch (error: any) {
            toast.error('Failed to fetch exams');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateExam = (e: React.MouseEvent) => {
        // Check if user is on free plan and has reached limit
        if (profile?.subscription_status !== 'active' && exams.length >= 3) {
            e.preventDefault();
            toast.error('Free plan is limited to 3 exams. Upgrade to Professional for unlimited exams!');
            return;
        }
        // If check passes, navigate
        navigate('/exam/new');
    };

    const downloadExamPDF = async (examId: string) => {
        try {
            const { data: exam, error: examError } = await supabase.from('exams').select('*').eq('id', examId).single();
            if (examError || !exam) throw examError || new Error('Exam not found');
            const { data: questions, error: qErr } = await supabase.from('questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true });
            if (qErr) throw qErr;

            const escapeHtml = (str: any) => {
                if (str === null || str === undefined) return '';
                return String(str)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#039;');
            };

            const html = `
                <!doctype html>
                <html>
                <head>
                  <meta charset="utf-8" />
                  <meta name="viewport" content="width=device-width,initial-scale=1" />
                  <title>${escapeHtml(exam.title)}</title>
                  <style>
                    @page { size: A4; margin: 20mm }
                    html,body{height:100%;}
                    body{font-family: 'Times New Roman', Times, serif; color:#111; line-height:1.45;}
                    .container{max-width:800px;margin:0 auto;color:#111}
                    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
                    .title{font-size:26px;font-weight:700}
                    .meta{font-size:12px;text-align:right}
                    .desc{margin:12px 0 18px;font-size:14px}
                    hr{border:none;border-top:1px solid #ddd;margin:12px 0}
                    .question{page-break-inside:avoid;margin-bottom:18px}
                    .q-title{font-size:15px;margin-bottom:8px}
                    .points{font-size:12px;color:#333;margin-left:8px}
                    .options{margin-left:22px;margin-top:6px}
                    .option{margin:6px 0;display:flex;align-items:flex-start}
                    .opt-letter{width:22px;display:inline-block;text-align:center;margin-right:8px;font-weight:600}
                    .opt-text{flex:1}
                    .answer-lines{margin-left:22px;margin-top:8px}
                    .answer-line{border-bottom:1px dashed #444;height:28px;margin:10px 0}
                    .long-answer{height:120px;border:1px solid #ddd;padding:8px;margin-top:8px}
                    .footer-note{font-size:12px;color:#666;margin-top:16px}
                    @media print{body{font-size:12pt}.no-print{display:none}.container{max-width:100%;margin:0}}
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <div>
                        <div class="title">${escapeHtml(exam.title)}</div>
                        <div style="font-size:13px;margin-top:6px">${escapeHtml(exam.description || '')}</div>
                      </div>
                      <div class="meta">
                        <div>Date: ${new Date().toLocaleDateString()}</div>
                      </div>
                    </div>
                    <hr />

                    <div style="margin-bottom:18px">
                      <strong>Student Info (fill before starting):</strong>
                      <div style="margin-left:14px;margin-top:8px">
                        ${(exam.required_fields || ['name', 'email']).map((f: string) => {
                const labels: Record<string, string> = { name: 'Full Name', email: 'Email', student_id: 'Student ID', phone: 'Phone' };
                return `<div style="margin-top:12px"><strong>${labels[f] || f}:</strong> ____________________________________________</div>`;
            }).join('')}
                      </div>
                    </div>

                    ${questions.map((q: any, i: number) => {
                const qText = escapeHtml(q.question_text || '');
                const pts = q.points || 0;
                let bodyHtml = '';
                if (Array.isArray(q.options) && q.options.length) {
                    bodyHtml += `<div class="options">`;
                    q.options.forEach((opt: string, oi: number) => {
                        bodyHtml += `<div class="option"><div class="opt-letter">${String.fromCharCode(65 + oi)}</div><div class="opt-text">${escapeHtml(opt)}</div></div>`;
                    });
                    bodyHtml += `</div>`;
                }

                if (q.type === 'short_answer') {
                    bodyHtml += `<div class="answer-lines">${Array.from({ length: 6 }).map(() => '<div class="answer-line"></div>').join('')}</div>`;
                } else if (q.type === 'numeric') {
                    bodyHtml += `<div class="answer-lines"><div class="answer-line" style="width:40%"></div></div>`;
                } else if (q.type === 'multiple_select') {
                    if (!(Array.isArray(q.options) && q.options.length)) {
                        bodyHtml += `<div class="answer-lines"><div class="answer-line"></div></div>`;
                    }
                } else {
                    if (!Array.isArray(q.options) || !q.options.length) {
                        bodyHtml += `<div class="answer-lines"><div class="answer-line"></div></div>`;
                    }
                }

                return `
                          <div class="question">
                            <div class="q-title"><strong>${i + 1}. ${qText}</strong> <span class="points">(${pts} pts)</span></div>
                            ${bodyHtml}
                          </div>
                        `;
            }).join('')}

                    <div class="footer-note">This printout is for administering the exam on paper. Students should write legibly and include their name on each page.</div>
                  </div>
                </body>
                </html>
                `;

            const w = window.open('', '_blank');
            if (!w) {
                toast.error('Popup blocked. Allow popups to download PDF.');
                return;
            }
            w.document.open();
            w.document.write(html);
            w.document.close();
            w.focus();
            setTimeout(() => w.print(), 600);
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to prepare printable exam');
        }
    };

    const copyExamLink = (examId: string) => {
        const examUrl = `${window.location.origin}/exam/${examId}`;
        try {
            navigator.clipboard.writeText(examUrl);
            toast.success('Exam link copied to clipboard!');
        } catch (e) {
            // fallback
            const input = document.createElement('textarea');
            input.value = examUrl;
            document.body.appendChild(input);
            input.select();
            try { document.execCommand('copy'); toast.success('Exam link copied to clipboard!'); } catch { toast.error('Failed to copy link'); }
            document.body.removeChild(input);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this exam?')) return;

        try {
            const { error } = await supabase
                .from('exams')
                .delete()
                .eq('id', id)
                .eq('tutor_id', user?.id);

            if (error) throw error;

            toast.success('Exam deleted successfully');
            setExams(prev => prev.filter(exam => exam.id !== id));
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to delete exam');
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <nav className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Logo />
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Welcome, {user?.user_metadata?.full_name || user?.email}
                            </span>
                            {profile?.subscription_status !== 'active' && (
                                <Link
                                    to="/checkout"
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 focus:outline-none transition"
                                >
                                    <Crown className="h-4 w-4 mr-2" />
                                    Upgrade
                                </Link>
                            )}
                            <Link
                                to="/settings"
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition"
                            >
                                <Settings className="h-4 w-4 mr-2" />
                                Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition"
                            >
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">My Exams</h1>
                        <button
                            onClick={handleCreateExam}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Exam
                        </button>
                    </div>

                    {exams.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <FileText className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No exams</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new exam.</p>
                            <div className="mt-6">
                                <button
                                    onClick={handleCreateExam}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create New Exam
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-3">
                            {exams.map((exam) => (
                                <div key={exam.id} className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                    {exam.title}
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 h-10">
                                                    {exam.description}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${exam.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {exam.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(exam.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => copyExamLink(exam.id)}
                                                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                                    title="Copy Link"
                                                >
                                                    <Share2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => downloadExamPDF(exam.id)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    title="Print / Save as PDF"
                                                >
                                                    <FileText className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedExamForResults(exam)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                                    title="View Results"
                                                >
                                                    <BarChart3 className="h-5 w-5" />
                                                </button>
                                                <Link
                                                    to={`/exam/${exam.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(exam.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Results Modal */}
            {selectedExamForResults && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Results: {selectedExamForResults.title}
                            </h2>
                            <button
                                onClick={() => setSelectedExamForResults(null)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <ExamResults examId={selectedExamForResults.id} examTitle={selectedExamForResults.title} />
                        </div>
                    </div>
                </div>
            )}
            <ChatWidget />
        </div>
    );
}
