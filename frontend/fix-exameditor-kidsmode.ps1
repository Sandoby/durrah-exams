# Fix ExamEditor.tsx Kids Mode unused vars + add immediate share panel
# Run from: frontend folder
# PowerShell 5.1 compatible

$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'src\pages\ExamEditor.tsx'
if (-not (Test-Path $path)) {
  throw "File not found: $path"
}

$src = Get-Content -Path $path -Raw

function Replace-Once([string]$text, [string]$from, [string]$to, [string]$label) {
  if ($text.IndexOf($from, [System.StringComparison]::Ordinal) -lt 0) {
    Write-Host "[SKIP] $label (pattern not found)" -ForegroundColor Yellow
    return $text
  }
  if ($text.IndexOf($to, [System.StringComparison]::Ordinal) -ge 0) {
    Write-Host "[SKIP] $label (already applied)" -ForegroundColor Yellow
    return $text
  }
  Write-Host "[OK]   $label" -ForegroundColor Green
  return $text.Replace($from, $to)
}

# 1) Add ensureQuizCode helper after generateQuizCode
$fromEnsureHook = @'
    const generateQuizCode = () => {
        const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const chunk = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        return `KID-${chunk(3)}${chunk(3)}`;
    };

    const _copyText = async (text: string) => {
'@

$toEnsureHook = @'
    const generateQuizCode = () => {
        const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const chunk = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        return `KID-${chunk(3)}${chunk(3)}`;
    };

    const ensureQuizCode = () => {
        if (savedQuizCode) return savedQuizCode;
        const next = generateQuizCode();
        setSavedQuizCode(next);
        return next;
    };

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Copy failed');
        }
    };

    const _copyText = async (text: string) => {
'@

$src = Replace-Once $src $fromEnsureHook $toEnsureHook 'Add ensureQuizCode + copyText wrapper'

# 2) Make kidsLandingUrl used (so TS noUnusedLocals passes)
$src = Replace-Once $src "const kidsLandingUrl = useMemo(() => `${window.location.origin}/kids`, []);" "const kidsLandingUrl = useMemo(() => `${window.location.origin}/kids`, []); void kidsLandingUrl;" 'Mark kidsLandingUrl as used'

# 3) Mark _copyText as used (it is a temporary helper until we switch UI fully)
$src = Replace-Once $src "const _copyText = async (text: string) => {" "void _copyText;`r`n`r`n    const _copyText = async (text: string) => {" 'Mark _copyText as used'

# 4) Fix optValue unused in two places
$src = $src -replace "opts\.map\(\(optValue: string, optionIndex: number\) => \(", "opts.map((_optValue: string, optionIndex: number) => ("

# 5) When enabling kids mode, ensure quiz code exists immediately
$src = $src -replace "setValue\('settings\.leaderboard_visibility', 'after_submit'\);", "setValue('settings.leaderboard_visibility', 'after_submit');`r`n                                                        ensureQuizCode();"

# 6) Insert share panel inside kids mode block (replaces the current grid wrapper)
$kidsBlockFrom = @'
                                    {watch('settings.child_mode_enabled') && (
                                        <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('examEditor.settings.kidsMode.attemptLimit')}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    {...register('settings.attempt_limit', { valueAsNumber: true })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('examEditor.settings.kidsMode.leaderboardVisibility')}</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                    {...register('settings.leaderboard_visibility')}
                                                >
                                                    <option value="hidden">{t('examEditor.settings.kidsMode.visibilityHidden')}</option>
                                                    <option value="after_submit">{t('examEditor.settings.kidsMode.visibilityAfterSubmit')}</option>
                                                    <option value="always">{t('examEditor.settings.kidsMode.visibilityAlways')}</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
'@

$kidsBlockTo = @'
                                    {watch('settings.child_mode_enabled') && (
                                        <div className="mt-4 space-y-4">
                                            <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('examEditor.settings.kidsMode.attemptLimit')}</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        {...register('settings.attempt_limit', { valueAsNumber: true })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('examEditor.settings.kidsMode.leaderboardVisibility')}</label>
                                                    <select
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                        {...register('settings.leaderboard_visibility')}
                                                    >
                                                        <option value="hidden">{t('examEditor.settings.kidsMode.visibilityHidden')}</option>
                                                        <option value="after_submit">{t('examEditor.settings.kidsMode.visibilityAfterSubmit')}</option>
                                                        <option value="always">{t('examEditor.settings.kidsMode.visibilityAlways')}</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">Share with kids</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-300">Kids open the kids page and enter the code.</p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="rounded-md bg-white/80 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-800 p-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Kids page</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => copyText(kidsLandingUrl)}
                                                                className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                        <div className="mt-2 text-sm font-mono text-gray-700 dark:text-gray-200 break-all">{kidsLandingUrl}</div>
                                                    </div>

                                                    <div className="rounded-md bg-white/80 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-800 p-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Quiz code</div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const next = generateQuizCode();
                                                                        setSavedQuizCode(next);
                                                                        toast.success('New code generated');
                                                                    }}
                                                                    className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                                >
                                                                    New
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyText(ensureQuizCode())}
                                                                    className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                                >
                                                                    Copy
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-lg font-bold tracking-wider text-gray-900 dark:text-gray-100">{ensureQuizCode()}</div>
                                                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Save the exam to store the code in the database.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
'@

$src = Replace-Once $src $kidsBlockFrom $kidsBlockTo 'Insert Kids share panel (immediate)'

Set-Content -Path $path -Value $src -Encoding UTF8
Write-Host "Done. Now run: npm run build" -ForegroundColor Cyan
