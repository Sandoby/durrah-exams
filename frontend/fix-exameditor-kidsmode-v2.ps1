# Fix ExamEditor.tsx Kids Mode helpers + immediate share UI (v2)
# Run from: frontend folder
# PowerShell 5.1 compatible

$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'src\pages\ExamEditor.tsx'
if (-not (Test-Path $path)) { throw "File not found: $path" }

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

# A) Fix helper block: kidsLandingUrl used, add ensureQuizCode + copyText, fix _copyText order
$fromHelpers = @'
    // Kids Mode helpers
    const [savedQuizCode, setSavedQuizCode] = useState<string | null>(null);
    const kidsLandingUrl = useMemo(() => `${window.location.origin}/kids`, []);
    const generateQuizCode = () => {
        const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const chunk = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
        return `KID-${chunk(3)}${chunk(3)}`;
    };
    void _copyText;
    const _copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Copy failed');
        }
    };
    useDemoTour('create-exam', startTour && isDemo);
'@

$toHelpers = @'
    // Kids Mode helpers
    const [savedQuizCode, setSavedQuizCode] = useState<string | null>(null);
    const kidsLandingUrl = useMemo(() => `${window.location.origin}/kids`, []);
    void kidsLandingUrl;

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

    // legacy helper (safe to remove later)
    const _copyText = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied');
        } catch {
            toast.error('Copy failed');
        }
    };

    useDemoTour('create-exam', startTour && isDemo);
'@

$src = Replace-Once $src $fromHelpers $toHelpers 'Fix Kids helpers block (ensureQuizCode + copyText + noUnusedLocals)'

# B) Fix multiple_choice/dropdown map unused arg (2 places)
$src = $src -replace "opts\.map\(\(optValue: string, optionIndex: number\) => \(", "opts.map((_optValue: string, optionIndex: number) => ("

# C) Fix multiple_select block: switch optValue references to _optValue
$src = $src -replace "checked=\{optValue \? currentCorrect\.includes\(optValue\) : false\}", "checked={_optValue ? currentCorrect.includes(_optValue) : false}"
$src = $src -replace "if \(optValue && !arr\.includes\(optValue\)\) arr\.push\(optValue\);", "if (_optValue && !arr.includes(_optValue)) arr.push(_optValue);"
$src = $src -replace "const idx = arr\.indexOf\(optValue\);", "const idx = arr.indexOf(_optValue);"
$src = $src -replace "a === optValue \? newOpt : a", "a === _optValue ? newOpt : a"

# D) Insert share panel (replace the current kids grid). Use less strict match (trimmed)
$kidsFrom = @'
                                    {watch('settings.child_mode_enabled') && (
                                        <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2">
'@

$kidsTo = @'
                                    {watch('settings.child_mode_enabled') && (
                                        <div className="mt-4 space-y-4">
'@

$src = Replace-Once $src $kidsFrom $kidsTo 'Change Kids settings container to space-y + enable share panel'

# Insert share panel right after the closing </div> of the grid that contains attempt/visibility.
$marker = "</div>\n                                    )}"
if ($src -like "*Kids open the kids page and enter the code.*") {
  Write-Host "[SKIP] Share panel already exists" -ForegroundColor Yellow
} elseif ($src.IndexOf($marker, [System.StringComparison]::Ordinal) -ge 0) {
  $share = @'

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
'@

  $src = $src.Replace($marker, $share + "\n" + $marker)
  Write-Host "[OK]   Insert share panel" -ForegroundColor Green
} else {
  Write-Host "[SKIP] Insert share panel (marker not found)" -ForegroundColor Yellow
}

Set-Content -Path $path -Value $src -Encoding UTF8
Write-Host "Done. Now run: npm run build" -ForegroundColor Cyan
