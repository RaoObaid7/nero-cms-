# auto-sync.ps1
# Watches the entire repo every 30 seconds.
# Auto-commits any changes and pushes to the pakistan-team branch on GitHub.
# Start using Start-AutoSync.bat - do not run this file directly.

$REPO_DIR = $PSScriptRoot
$BRANCH   = "pakistan-team"
$INTERVAL = 30
$LOG_FILE = "$REPO_DIR\auto-sync.log"

function Log($msg) {
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[auto-sync] $ts $msg"
    Write-Host $line
    Add-Content -Path $LOG_FILE -Value $line -Encoding UTF8
}

Set-Location $REPO_DIR

git fetch origin 2>&1 | Out-Null
git checkout $BRANCH 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    git checkout -b $BRANCH --track origin/$BRANCH 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Log "ERROR: could not switch to branch $BRANCH. Run: git fetch origin then git checkout $BRANCH"
        exit 1
    }
}

Log "Started. Watching: $REPO_DIR"
Log "Branch: $BRANCH | Interval: ${INTERVAL}s"

while ($true) {
    Start-Sleep -Seconds $INTERVAL

    $changes = git status --porcelain 2>&1

    if ($changes) {
        $author    = git config user.name
        if (!$author) { $author = "unknown" }
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $count     = ($changes | Measure-Object -Line).Lines

        Log "Detected $count change(s) by $author - syncing..."

        git pull --rebase origin $BRANCH 2>&1 | Out-Null
        git add -A 2>&1 | Out-Null

        git commit -m "auto-save: $count file(s) by $author at $timestamp" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Log "Nothing new to commit - skipped"
            continue
        }

        git push origin $BRANCH 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Log "Pushed OK -> origin/$BRANCH"
        } else {
            Log "Push failed - retrying in 15s..."
            Start-Sleep -Seconds 15
            git push origin $BRANCH 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Log "Retry push OK"
            } else {
                Log "ERROR: push failed twice. Check GitHub credentials."
            }
        }
    }
}
