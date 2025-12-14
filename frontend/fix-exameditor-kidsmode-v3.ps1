# Fix ExamEditor.tsx Kids Mode (v3 - regex based)
# - Removes bad `void _copyText;`
# - Adds ensureQuizCode() + copyText()
# - Inserts immediate share UI (uses i18n keys where available, otherwise English fallbacks)
# - Fixes optValue/_optValue issues
# - Makes build pass
#
# Run from: frontend folder
# PowerShell 5.1:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\fix-exameditor-kidsmode-v3.ps1

$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'src\pages\ExamEditor.tsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

$src = Get-Content -Path $path -Raw

function Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Ok($msg) { Write-Host $msg -ForegroundColor Green }
function Skip($msg) { Write-Host $msg -ForegroundColor Yellow }

# 1) Remove the bad standalone line: void _copyText;
if ($src -match "(?m)^\s*void\s+_copyText;\s*$") {
  $src = [regex]::Replace($src, "(?m)^\s*void\s+_copyText;\s*\r?\n", "")
  Ok "Removed: void _copyText;"
} else {
  Skip "No 'void _copyText;' line found"
}

# 2) Add ensureQuizCode() and copyText() (if missing) right after generateQuizCode()
if ($src -match "const\s+ensureQuizCode\s*=") {
  Skip "ensureQuizCode already exists"
} else {
  $pattern = "(?s)(const\s+generateQuizCode\s*=\s*\(\)\s*=>\s*\{.*?\};)"
  if ($src -match $pattern) {
    $insert = @'
$1

    const ensureQuizCode = () => {
        if (savedQuizCode) return savedQuizCode;
        const next = generateQuizCode();
        setSavedQuizCode(next);
        return next;
    };

    const copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(t?.('common.copied') ?? 'Copied');
        } catch {
            toast.error(t?.('common.copyFailed') ?? 'Copy failed');
        }
    };
'@
    $src = [regex]::Replace($src, $pattern, $insert, 1)
    Ok "Inserted ensureQuizCode + copyText"
  } else {
    throw "Could not find generateQuizCode() block to insert ensureQuizCode()"
  }
}

# 3) Call ensureQuizCode() when Kids Mode enabled (if not already there)
$onChangeBlock = "setValue\('settings\.leaderboard_visibility',\s*'after_submit'\);\s*\r?\n\s*ensureQuizCode\(\);"
if ($src -match $onChangeBlock) {
  Skip "ensureQuizCode() already called on enable"
} else {
  $src2 = [regex]::Replace(
    $src,
    "setValue\('settings\.leaderboard_visibility',\s*'after_submit'\);",
    "setValue('settings.leaderboard_visibility', 'after_submit');`r`n                                                        ensureQuizCode();",
    1
  )
  if ($src2 -ne $src) {
    $src = $src2
    Ok "Added ensureQuizCode() call when Kids Mode is enabled"
  } else {
    Skip "Could not add ensureQuizCode() call (pattern not found)"
  }
}

# 4) Fix kidsLandingUrl unused by making it used in UI; no need for void.
# (No action needed; share panel will reference it. If share panel insert fails, we will add `void kidsLandingUrl;` as fallback.)

# 5) Replace multiple-choice/dropdown map argument to underscore only if it's unused
# Safer: only replace exact signature occurrences.
$src = $src -replace "opts\.map\(\(optValue: string, optionIndex: number\) => \(", "opts.map((_optValue: string, optionIndex: number) => ("

# 6) Fix multiple_select map block references: if a block uses optValue, ensure the map arg is optValue not _optValue.
# We'll keep map arg as optValue for multiple_select (since body references optValue).
$src = $src -replace "opts\.map\(\(_optValue: string, optionIndex: number\) => \(\s*\r?\n\s*\)\)\}", "opts.map((optValue: string, optionIndex: number) => (\r\n                                                                            ))}"

# 7) Insert Share panel in Kids Mode section (after the attempt/visibility grid)
if ($src -like "*Share with kids*" -or $src -like "*examEditor.settings.kidsMode.shareTitle*") {
  Skip "Share panel seems already present"
} else {
  # Use single quotes so the embedded double-quotes are not interpreted by PowerShell.
  $gridEndPattern = '(?s)(\{watch\(\x27settings\.child_mode_enabled\x27\) && \(\s*\r?\n\s*<div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2">.*?</div>\s*\r?\n\s*\)\}\s*)'
  if ($src -match $gridEndPattern) {
    $sharePanel = @'
$1
                                    <div className="mt-4 p-4 rounded-lg border border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-900/20">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                                                    {t('examEditor.settings.kidsMode.shareTitle', 'Share with kids')}
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                                    {t('examEditor.settings.kidsMode.shareDesc', 'Kids open the kids page and enter the code.')}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-md bg-white/80 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-800 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {t('examEditor.settings.kidsMode.kidsPage', 'Kids page')}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyText(kidsLandingUrl)}
                                                        className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                    >
                                                        {t('common.copy', 'Copy')}
                                                    </button>
                                                </div>
                                                <div className="mt-2 text-sm font-mono text-gray-700 dark:text-gray-200 break-all">{kidsLandingUrl}</div>
                                            </div>

                                            <div className="rounded-md bg-white/80 dark:bg-gray-800/60 border border-indigo-100 dark:border-indigo-800 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {t('examEditor.settings.kidsMode.quizCode', 'Quiz code')}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const next = generateQuizCode();
                                                                setSavedQuizCode(next);
                                                                toast.success(t('examEditor.settings.kidsMode.newCodeToast', 'New code generated'));
                                                            }}
                                                            className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                        >
                                                            {t('common.new', 'New')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyText(ensureQuizCode())}
                                                            className="text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300"
                                                        >
                                                            {t('common.copy', 'Copy')}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-lg font-bold tracking-wider text-gray-900 dark:text-gray-100">{ensureQuizCode()}</div>
                                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                                    {t('examEditor.settings.kidsMode.saveToStore', 'Save the exam to store the code in the database.')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
'@
    $src = [regex]::Replace($src, $gridEndPattern, $sharePanel, 1)
    Ok "Inserted share panel"
  } else {
    Skip "Could not find Kids Mode grid to insert share panel; adding fallback 'void kidsLandingUrl;'"
    if ($src -match "const\s+kidsLandingUrl\s*=\s*useMemo\(") {
      $src = [regex]::Replace($src, "(const\s+kidsLandingUrl\s*=\s*useMemo\([^;]+;)", "`$1 void kidsLandingUrl;", 1)
      Ok "Added: void kidsLandingUrl;"
    }
  }
}

Set-Content -Path $path -Value $src -Encoding UTF8
Info "Done. Now run: npm run build"
