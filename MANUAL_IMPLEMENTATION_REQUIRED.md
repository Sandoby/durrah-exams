# ?? MANUAL IMPLEMENTATION REQUIRED

## Current Status

I've successfully added:
? New icons (`AlertCircle`, `X`) to imports  
? New state variables for modals and countdown  
? Updated timer effect to show warning  
? Added auto-submit countdown effect  
? Added `handleSubmitWithCheck()` function  
? Progress calculation before render

## ? Still Need to Add Manually

Your `ExamView.tsx` file has a significantly different structure than expected. The automatic edits cannot be applied safely. 

### You Need to Manually Add:

#### 1. **Progress Bar UI Component**
Find your header/title section and add this progress bar:

```tsx
{/* Add this in your header section after the title */}
{started && (
    <div className="space-y-1 mt-3">
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

#### 2. **Unanswered Questions Modal**
Add this before your `<ViolationModal>` component:

```tsx
{/* Unanswered Questions Modal */}
{showUnansweredModal && (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
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

            {/* Content */}
            <div className="p-6 space-y-4">
                <p className="text-gray-700 dark:text-gray-300">
                    You have <strong className="text-orange-600 dark:text-orange-400">{unansweredQuestions.length}</strong> unanswered question{unansweredQuestions.length !== 1 ? 's' : ''}.
                </p>

                {/* Question Numbers Grid */}
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
                                }}
                                className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                            >
                                Q{index + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                        ?? Submitting with unanswered questions will result in 0 points for those questions.
                    </p>
                </div>
            </div>

            {/* Actions */}
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

#### 3. **Auto-Submit Warning Modal**
Add this after the unanswered modal:

```tsx
{/* Auto-Submit Warning Modal */}
{showAutoSubmitWarning && (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Animated Header */}
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

            {/* Content */}
            <div className="p-8 text-center space-y-6">
                {/* Countdown Circle */}
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

                {/* Progress dots */}
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

            {/* Action */}
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

#### 4. **Update Form Submission**
Find your `<form onSubmit=...>` line and change `handleSubmit()` to `handleSubmitWithCheck()`.

#### 5. **Add Equation Type Support**
In your question rendering section (where you handle different question types), add:

```tsx
{question.type === 'equation' && (
    <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter your answer (LaTeX format supported)
        </label>
        <textarea
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-base"
            rows={4}
            value={answers[question.id]?.answer || ''}
            onChange={(e) => setAnswers({ ...answers, [question.id]: { answer: e.target.value } })}
            placeholder="Example: x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
        />
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>LaTeX Examples:</strong><br />
                • Fraction: <code>\frac{'{a}'}{'{b}'}</code><br />
                • Square root: <code>\sqrt{'{x}'}</code><br />
                • Superscript: <code>x^2</code><br />
                • Subscript: <code>x_1</code>
            </p>
        </div>
    </div>
)}
```

---

## ? What's Already Done

The following have been successfully added to your code:
1. ? Icons imported
2. ? State variables added
3. ? Timer logic updated
4. ? Countdown effect added
5. ? `handleSubmitWithCheck()` function added
6. ? Progress calculation added

---

## ?? Next Steps

1. **Add the 3 UI components above** (copy-paste them into your ExamView.tsx)
2. **Update form submission** (change handleSubmit to handleSubmitWithCheck)
3. **Add equation type rendering** (in your question types section)
4. **Test the features**
5. **Update ExamEditor.tsx** to add equation option

---

## ?? For ExamEditor.tsx

Add equation option to the question type dropdown:

```tsx
<option value="equation">Equation/Math Expression</option>
```

Add handler after the numeric type handler:

```tsx
{watch(`questions.${index}.type`) === 'equation' && (
    <textarea
        rows={3}
        className="mt-1 block w-full rounded border p-2 font-mono dark:bg-gray-700 dark:text-white"
        {...register(`questions.${index}.correct_answer`)}
        placeholder="Sample answer in LaTeX format"
    />
)}
```

---

## ?? Ready to Test

Once you've added these 5 components manually:
1. Start your dev server
2. Test each feature
3. Verify animations work
4. Deploy!

**Estimated time**: 15-20 minutes of copy-paste work

---

*Your file structure is unique, so manual implementation ensures everything works correctly with your specific setup.*
