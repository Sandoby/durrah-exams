# PowerShell Script to Apply All ExamView Changes
# Run this script from the root directory: .\APPLY_CHANGES.ps1

Write-Host "?? Applying ExamView.tsx Changes..." -ForegroundColor Cyan

$filePath = "frontend\src\pages\ExamView.tsx"
$backupPath = "frontend\src\pages\ExamView.tsx.backup"

# Create backup
Write-Host "?? Creating backup..." -ForegroundColor Yellow
Copy-Item $filePath $backupPath -Force
Write-Host "? Backup created at: $backupPath" -ForegroundColor Green

# Read the file
$content = Get-Content $filePath -Raw

# Change 1: Add missing icons
Write-Host "?? Change 1: Adding AlertCircle and X icons..." -ForegroundColor Yellow
$content = $content -replace 
    "import { AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Sun, Moon, Calculator as CalcIcon, Star, Eye } from 'lucide-react';",
    "import { AlertTriangle, CheckCircle, Loader2, Save, Flag, LayoutGrid, Sun, Moon, Calculator as CalcIcon, Star, Eye, AlertCircle, X } from 'lucide-react';"

# Change 2: Add new state variables
Write-Host "?? Change 2: Adding state variables..." -ForegroundColor Yellow
$stateVars = @"

    // NEW: State for 3 features
    const [showUnansweredModal, setShowUnansweredModal] = useState(false);
    const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
    const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false);
    const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(5);
"@

$content = $content -replace 
    "(const isSubmittingRef = useRef<boolean>\(false\);)",
    "`$1$stateVars"

# Change 3: Update timer logic
Write-Host "?? Change 3: Updating timer logic..." -ForegroundColor Yellow
$content = $content -replace 
    "} else if \(timeLeft === 0 && !submitted && !isSubmitting\) \{\s*handleSubmit\(\);",
    "} else if (timeLeft === 0 && !submitted && !isSubmitting && !showAutoSubmitWarning) {`n            setShowAutoSubmitWarning(true);"

# Change 4: Add countdown useEffect
Write-Host "?? Change 4: Adding countdown effect..." -ForegroundColor Yellow
$countdownEffect = @"

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

$content = $content -replace 
    "(\}, \[started, timeLeft, exam, submitted, isSubmitting\]\);)",
    "`$1$countdownEffect"

# Change 5: Add handleSubmitWithCheck function
Write-Host "?? Change 5: Adding handleSubmitWithCheck function..." -ForegroundColor Yellow
$checkFunction = @"


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
"@

$content = $content -replace 
    "(const handleSubmit = async \(\) => \{)",
    "$checkFunction`n`n    `$1"

# Change 6: Add progress calculation
Write-Host "?? Change 6: Adding progress calculation..." -ForegroundColor Yellow
$progressCalc = @"

    // NEW: Calculate progress
    const answeredCount = Object.keys(answers).filter(key => {
        const ans = answers[key];
        return ans && ans.answer !== undefined && ans.answer !== '' && 
               !(Array.isArray(ans.answer) && ans.answer.length === 0);
    }).length;
    const totalQuestions = exam?.questions.length || 0;
    const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

"@

$content = $content -replace 
    "(if \(!exam\) return \()",
    "$progressCalc    `$1"

# Change 7: Replace submit buttons
Write-Host "?? Change 7: Updating submit buttons..." -ForegroundColor Yellow
$content = $content -replace 
    "<button\s+type=`"submit`"\s+disabled=\{isSubmitting\}",
    '<button type="button" onClick={handleSubmitWithCheck} disabled={isSubmitting}'

# Change 8 & 9: Add progress bar and modals will need manual insertion due to complexity
Write-Host "??  Changes 8 & 9 (Progress Bar UI and Modals) require manual insertion" -ForegroundColor Yellow
Write-Host "    Please add them according to SAFE_MANUAL_PATCH.md" -ForegroundColor Yellow

# Save the file
Write-Host "?? Saving changes..." -ForegroundColor Yellow
$content | Set-Content $filePath -NoNewline

Write-Host "" -ForegroundColor White
Write-Host "? CHANGES APPLIED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "?? Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Manually add Progress Bar UI (Change 8)" -ForegroundColor White
Write-Host "  2. Manually add Modal components (Change 9)" -ForegroundColor White
Write-Host "  3. Run: cd frontend && npm run build" -ForegroundColor White
Write-Host "  4. If errors, restore backup: Copy-Item $backupPath $filePath -Force" -ForegroundColor White
Write-Host "" -ForegroundColor White
