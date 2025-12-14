# Child Mode Implementation Script
Write-Host "?? Applying Child Mode Feature..." -ForegroundColor Cyan

$examViewPath = "frontend\src\pages\ExamView.tsx"

# Read the file
$content = Get-Content $examViewPath -Raw

# 1. Add child_mode to Exam interface
Write-Host "1. Adding child_mode to Exam interface..." -ForegroundColor Yellow
$content = $content -replace '(restrict_by_email\?: boolean;\s+allowed_emails\?: string\[\];)\s+\};\s+\}', '$1
        // Child mode
        child_mode?: boolean;
    };
}'

# 2. Add isChildMode derived flag after autoSubmitCountdown state
Write-Host "2. Adding isChildMode flag..." -ForegroundColor Yellow
$content = $content -replace '(const \[autoSubmitCountdown, setAutoSubmitCountdown\] = useState\(5\);)', '$1

    // Child Mode derived flag
    const isChildMode = !!exam?.settings.child_mode && !isReviewMode;'

# 3. Update root container background
Write-Host "3. Updating root container background..." -ForegroundColor Yellow
$content = $content -replace '(return \(\s+<div ref=\{containerRef\} className=\{`min-h-screen p-3 sm:p-6 )bg-gray-50 dark:bg-gray-900(`\}>)', '$1${isChildMode ? ''bg-gradient-to-br from-pink-50 via-yellow-50 to-blue-50'' : ''bg-gray-50 dark:bg-gray-900''}$2'

# 4. Hide watermark in child mode
Write-Host "4. Hiding watermark in child mode..." -ForegroundColor Yellow
$content = $content -replace '(\{started && \()', '{started && !isChildMode && ('

# 5. Update header title
Write-Host "5. Updating header title..." -ForegroundColor Yellow
$content = $content -replace '(<h1 className=")text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate max-w-\[50%\](">\{exam\.title\}</h1>)', '$1text-base sm:text-lg font-bold truncate max-w-[50%] ${isChildMode ? ''text-pink-600'' : ''text-gray-900 dark:text-white''}$2>{isChildMode ? `?? ${exam.title}` : exam.title}</h1>'

# 6. Update view mode button
Write-Host "6. Updating view mode button..." -ForegroundColor Yellow
$content = $content -replace '(onClick=\{\(\) => setViewMode\(prev => prev === ''list''\s+\? ''single'' : ''list''\)\}\s+className=")p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400(")', '$1p-2 ${isChildMode ? ''text-blue-600 hover:text-blue-700'' : ''text-gray-500 hover:text-indigo-600 dark:text-gray-400''}$2'

# 7. Hide Zen toggle in child mode
Write-Host "7. Hiding Zen toggle in child mode..." -ForegroundColor Yellow
$content = $content -replace '(<button\s+onClick=\{\(\) => setIsZenMode\(!isZenMode\)\})', '{!isChildMode && ($1'
$content = $content -replace '(\{isZenMode \? <Star size=\{20\} /> : <Eye size=\{20\} />\}\s+</button>)', '$1)}}'

# 8. Update progress label
Write-Host "8. Updating progress label..." -ForegroundColor Yellow
$content = $content -replace '(<span>)Progress: \{answeredCount\}/\{totalQuestions\} questions(</span>)', '$1{isChildMode ? `Progress: ? ${answeredCount}/${totalQuestions}` : `Progress: ${answeredCount}/${totalQuestions} questions`}$2'

# 9. Update progress percentage color
Write-Host "9. Updating progress percentage color..." -ForegroundColor Yellow
$content = $content -replace '(<span className=")font-semibold(">)', '$1font-semibold ${isChildMode ? ''text-blue-600'' : ''''}$2'

# 10. Update progress bar track
Write-Host "10. Updating progress bar track..." -ForegroundColor Yellow
$content = $content -replace '(<div className=")w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden(">)', '$1w-full ${isChildMode ? ''bg-yellow-100'' : ''bg-gray-200 dark:bg-gray-700''} rounded-full h-2 overflow-hidden$2'

# 11. Update progress bar fill
Write-Host "11. Updating progress bar fill..." -ForegroundColor Yellow
$content = $content -replace '(className=")bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full', '$1${isChildMode ? ''bg-gradient-to-r from-pink-400 via-orange-400 to-blue-400'' : ''bg-gradient-to-r from-indigo-500 to-purple-600''} h-2 rounded-full'

# 12. Update completion message
Write-Host "12. Updating completion message..." -ForegroundColor Yellow
$content = $content -replace '(<p className=")text-xs text-green-600 dark:text-green-400 font-medium(">\s+? All questions answered!\s+</p>)', '$1${isChildMode ? ''text-green-700'' : ''text-green-600 dark:text-green-400''} text-xs font-medium$2>
                                                {isChildMode ? ''?? All done!'' : ''? All questions answered!''}
                                            </p>'

# Write the updated content
Set-Content -Path $examViewPath -Value $content -NoNewline

Write-Host "? Child Mode feature applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "?? Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "? Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "?? Committing changes..." -ForegroundColor Cyan
    git add $examViewPath
    git commit -m "feat(child-mode): add playful UI skin for children exams"
    Write-Host ""
    Write-Host "?? Pushing to GitHub..." -ForegroundColor Cyan
    git push origin main
    Write-Host ""
    Write-Host "?? Child Mode feature is now live!" -ForegroundColor Green
} else {
    Write-Host "? Build failed. Please check the errors above." -ForegroundColor Red
}
