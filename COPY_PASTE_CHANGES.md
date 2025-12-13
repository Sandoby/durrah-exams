# ?? EXACT CHANGES TO MAKE - Copy & Paste Ready

## Change 1: Add Progress Bar (After line 596)

**FIND** (around line 596):
```tsx
{started && (
    <div className="timer">
        {t('examView.timeLeft')}: {timeLeft !== null ? `${Math.floor(timeLeft / 60)}:${('0' + (timeLeft % 60)).slice(-2)}` : '?'}
    </div>
)}
```

**ADD RIGHT AFTER IT**:
```tsx
{/* NEW: Progress Bar */}
{started && (
    <div className="mt-4 px-4 space-y-1">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>Progress: {answeredCount}/{totalQuestions} questions</span>
            <span className="font-semibold">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div
                className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
        {progress === 100 && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
                ? All questions answered!
            </p>
        )}
    </div>
)}
```

---

## Change 2: Replace Unanswered Modal (Around line 716)

**FIND AND REPLACE** (around line 716):
```tsx
{/* Unanswered Questions Modal */}
<Modal
    open={showUnansweredModal}
    onClose={() => setShowUnansweredModal(false)}
    title={t('examView.unansweredQuestions')}
>
    <div className="unanswered-content">
        <p>{t('examView.unansweredQuestionsMessage')}</p>
        <ul>
            {unansweredQuestions.map((qIndex) => (
                <li key={qIndex}>
                    {t('examView.question')} {qIndex + 1}
                </li>
            ))}
        </ul>
    </div>
    <div className="modal-actions">
        <button onClick={() => setShowUnansweredModal(false)} className="btn-primary">
            {t('common.ok')}
        </button>
    </div>
</Modal>
```

**WITH THIS**:
```tsx
{/* NEW: Unanswered Questions Modal */}
{showUnansweredModal && (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white rounded-full p-2">
                        <AlertCircle className="h-6 w-6 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                        Unanswered Questions
                    </h3>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                    You have <strong className="text-orange-600 dark:text-orange-400">{unansweredQuestions.length}</strong> unanswered question{unansweredQuestions.length !== 1 ? 's' : ''}.
                </p>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                        Jump to question:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {unansweredQuestions.map((index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentQuestionIndex(index);
                                    setShowUnansweredModal(false);
                                    if (viewMode === 'list') {
                                        navigate(`/exam/${id}/question/${index}`);
                                    }
                                }}
                                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                            >
                                Q{index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        ?? Submitting with unanswered questions will result in 0 points for those questions.
                    </p>
                </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
                <button
                    onClick={() => setShowUnansweredModal(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    Review Questions
                </button>
                <button
                    onClick={() => {
                        setShowUnansweredModal(false);
                        handleSubmit();
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
                >
                    Submit Anyway
                </button>
            </div>
        </div>
    </div>
)}
```

---

## Change 3: Replace Auto-Submit Warning (Around line 734)

**FIND AND REPLACE** (around line 734):
```tsx
{/* Auto-Submit Warning */}
{showAutoSubmitWarning && (
    <div className="auto-submit-warning">
        <p>{t('examView.autoSubmitWarning', { seconds: autoSubmitCountdown })}</p>
    </div>
)}
```

**WITH THIS**:
```tsx
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
                    <h3 className="text-xl font-bold text-white">
                        ? Time's Up!
                    </h3>
                </div>
            </div>

            <div className="p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                        <svg className="w-32 h-32 transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="60"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-gray-200 dark:text-gray-700"
                            />
                            <circle
                                cx="64"
                                cy="64"
                                r="60"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 60}`}
                                strokeDashoffset={`${2 * Math.PI * 60 * (1 - autoSubmitCountdown / 5)}`}
                                className="text-red-500 transition-all duration-1000"
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-5xl font-bold text-red-600 dark:text-red-500">
                                {autoSubmitCountdown}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        Your exam time has expired
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                        Submitting automatically in {autoSubmitCountdown} second{autoSubmitCountdown !== 1 ? 's' : ''}...
                    </p>
                </div>

                <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((dot) => (
                        <div
                            key={dot}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                dot > autoSubmitCountdown
                                    ? 'bg-red-500'
                                    : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                        />
                    ))}
                </div>
            </div>

            <div className="px-6 pb-6">
                <button
                    onClick={() => {
                        setShowAutoSubmitWarning(false);
                        setAutoSubmitCountdown(5);
                        handleSubmit();
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105"
                >
                    Submit Now
                </button>
            </div>
        </div>
    </div>
)}
```

---

## ? DONE!

That's it! Those are the only 3 changes you need to make to ExamView.tsx.

**Time required**: 5-10 minutes
**Difficulty**: Copy & paste
**Result**: 3 beautiful, functional features!

---

## Testing

1. Start your dev server: `npm run dev`
2. Create a test exam
3. Take the exam and verify:
   - ? Progress bar shows and updates
   - ? Try to submit with blank answers ? modal appears
   - ? Create exam with 2-min timer, wait for expiry ? countdown appears

---

*Note: Equation support requires finding your QuestionComponent file - skip it for now if you can't find it quickly. The 3 features above are the high-impact ones!*
