$ErrorActionPreference = "Stop"

Write-Host "?? Applying ALL exam view changes..." -ForegroundColor Cyan

$file = "frontend\src\pages\ExamView.tsx"
$content = Get-Content $file -Raw

Write-Host "? Step 1: Fixing import..." -ForegroundColor Green
$content = $content -replace "import \{ AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Sun, Moon, Calculator as CalcIcon, Star, Eye \} from 'lucide-react';", "import { AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Sun, Moon, Calculator as CalcIcon, Star, Eye, AlertCircle, X } from 'lucide-react';"

Write-Host "? Step 2: Adding state variables..." -ForegroundColor Green
$content = $content -replace "    const containerRef = useRef<HTMLDivElement>\(null\);\s+const isSubmittingRef = useRef<boolean>\(false\);\s+// Load exam data", @"
    const containerRef = useRef<HTMLDivElement>(null);
    const isSubmittingRef = useRef<boolean>(false);
    
    // NEW: State for 3 features
    const [showUnansweredModal, setShowUnansweredModal] = useState(false);
    const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
    const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);

    // Load exam data
"@

Write-Host "? Step 3: Fixing timer..." -ForegroundColor Green
$content = $content -replace "\} else if \(timeLeft === 0 && !submitted && !isSubmitting\) \{\s+handleSubmit\(\);\s+\}\s+\}, \[started, timeLeft, exam, submitted, isSubmitting\]\);", @"
} else if (timeLeft === 0 && !submitted && !isSubmitting && !showAutoSubmitWarning) {
            setShowAutoSubmitWarning(true);
        }
    }, [started, timeLeft, exam, submitted, isSubmitting, showAutoSubmitWarning]);

    // NEW: Auto-submit countdown
    useEffect(() => {
        if (showAutoSubmitWarning && autoSubmitCountdown > 0) {
            const timer = setTimeout(() => {
                setAutoSubmitCountdown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (showAutoSubmitWarning && autoSubmitCountdown === 0) {
            setShowAutoSubmitWarning(false);
            setAutoSubmitCountdown(5);
            handleSubmit();
        }
    }, [showAutoSubmitWarning, autoSubmitCountdown]);
"@

Write-Host "? Step 4: Adding handleSubmitWithCheck function..." -ForegroundColor Green
$content = $content -replace "    const handleSubmit = async \(\) => \{", @"
    // NEW: Check for unanswered questions before submission
    const handleSubmitWithCheck = () => {
        if (!exam) return;
        
        const unanswered: number[] = [];
        exam.questions.forEach((q, index) => {
            const answerData = answers[q.id];
            if (!answerData || answerData.answer === undefined || answerData.answer === '' || 
                (Array.isArray(answerData.answer) && answerData.answer.length === 0)) {
                unanswered.push(index);
            }
        });
        
        if (unanswered.length > 0) {
            setUnansweredQuestions(unanswered);
            setShowUnansweredModal(true);
            return;
        }
        
        handleSubmit();
    };

    const handleSubmit = async () => {
"@

Write-Host "? Step 5: Adding progress calculation..." -ForegroundColor Green
$content = $content -replace "    \}, \[\]\);\s+if \(!exam\) return \(", @"
    }, []);

    // NEW: Calculate progress
    const answeredCount = Object.keys(answers).filter(key => {
        const ans = answers[key];
        return ans && ans.answer !== undefined && ans.answer !== '' && 
               !(Array.isArray(ans.answer) && ans.answer.length === 0);
    }).length;
    const totalQuestions = exam?.questions.length || 0;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

    if (!exam) return (
"@

Write-Host "? Step 6: Adding progress bar UI..." -ForegroundColor Green
$progressBar = @"
                                        </button>
                                    </div>
                                </div>
                                
                                {/* NEW: Progress Bar */}
                                {started && (
                                    <div className="mt-3 space-y-1">
                                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                            <span>Progress: {answeredCount}/{totalQuestions} questions</span>
                                            <span className="font-semibold">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
                                                style={{ width: `${'$'}{progress}%` }}
                                            />
                                        </div>
                                        {progress === 100 && (
                                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                ? All questions answered!
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
"@

$content = $content -replace "                                        </button>\s+</div>\s+</div>\s+</div>\s+</div>\s+\)\}", $progressBar

Write-Host "? Step 7: Updating submit buttons..." -ForegroundColor Green
$content = $content -replace "type=`"submit`"\s+disabled=\{isSubmitting\}", "type=`"button`"`r`n                                                        onClick={handleSubmitWithCheck}`r`n                                                        disabled={isSubmitting}"

Write-Host "? Step 8: Adding modals at end..." -ForegroundColor Green
$modals = @'

                {/* NEW: Unanswered Questions Modal */}
                {showUnansweredModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white rounded-full p-2">
                                        <AlertCircle className="h-6 w-6 text-orange-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Unanswered Questions</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-gray-700 dark:text-gray-300">
                                    You have <strong className="text-orange-600 dark:text-orange-400">{unansweredQuestions.length}</strong> unanswered question{unansweredQuestions.length !== 1 ? 's' : ''}.
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Jump to question:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {unansweredQuestions.map((index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    jumpToQuestion(index);
                                                    setShowUnansweredModal(false);
                                                }}
                                                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                            >
                                                Q{index + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">?? Submitting with unanswered questions will result in 0 points for those questions.</p>
                                </div>
                            </div>
                            <div className="px-6 pb-6 flex gap-3">
                                <button onClick={() => setShowUnansweredModal(false)} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                    Review Questions
                                </button>
                                <button onClick={() => { setShowUnansweredModal(false); handleSubmit(); }} className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg">
                                    Submit Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: Auto-Submit Warning Modal */}
                {showAutoSubmitWarning && (
                    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4 relative overflow-hidden">
                                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="bg-white rounded-full p-2 animate-pulse">
                                        <AlertTriangle className="h-6 w-6 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">? Time's Up!</h3>
                                </div>
                            </div>
                            <div className="p-8 text-center space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-gray-700"/>
                                            <circle cx="64" cy="64" r="60" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 60}`} strokeDashoffset={`${2 * Math.PI * 60 * (1 - autoSubmitCountdown / 5)}`} className="text-red-500 transition-all duration-1000" strokeLinecap="round"/>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-5xl font-bold text-red-600 dark:text-red-500">{autoSubmitCountdown}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-lg font-semibold text-gray-900 dark:text-white">Your exam time has expired</p>
                                    <p className="text-gray-600 dark:text-gray-400">Submitting automatically in {autoSubmitCountdown} second{autoSubmitCountdown !== 1 ? 's' : ''}...</p>
                                </div>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((dot) => (
                                        <div key={dot} className={`w-2 h-2 rounded-full transition-all duration-300 ${dot > autoSubmitCountdown ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}/>
                                    ))}
                                </div>
                            </div>
                            <div className="px-6 pb-6">
                                <button onClick={() => { setShowAutoSubmitWarning(false); setAutoSubmitCountdown(5); handleSubmit(); }} className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105">
                                    Submit Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
'@

$content = $content -replace "            </div>\s+</div >\s+\);\s+\}", $modals

Set-Content $file $content -NoNewline

Write-Host "`n?? ALL CHANGES APPLIED!" -ForegroundColor Green
Write-Host "?? Next: cd frontend && npm run build" -ForegroundColor Cyan
