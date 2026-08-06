[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function U([int[]]$Codes) { return -join ($Codes | ForEach-Object { [char]$_ }) }
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$UpdateDirName = U 0x9810,0x8a2d,0x984c,0x5eab,0x66f4,0x65b0
$DoneDirName = U 0x5df2,0x5b8c,0x6210
$UpdateDir = Join-Path $RepoRoot $UpdateDirName
$DoneDir = Join-Path $UpdateDir $DoneDirName
$BackupDir = Join-Path $RepoRoot 'question-bank-backups'
$TargetPath = Join-Path $RepoRoot 'public\JLS_094_115_v5.0.zip'
$DefaultQuestionBankInfoPath = Join-Path $RepoRoot 'src\config\defaultQuestionBankInfo.ts'
$ValidateScript = Join-Path $PSScriptRoot 'validate-question-bank.ps1'
$PackageScript = Join-Path $PSScriptRoot 'package-question-bank.ps1'
$CommitMessage = 'chore(question-bank): update default question bank'
$TempPaths = @()
$BackupPath = $null
$BackupHash = $null
$CommitCreated = $false
$CommitHash = $null
$PreUpdateTestSnapshot = $null
$PostUpdateTestSnapshot = $null
$TestBaselineStatus = $null
$TargetWasReplaced = $false
$HadOriginalTarget = Test-Path -LiteralPath $TargetPath -PathType Leaf
$OriginalDefaultQuestionBankInfo = if (Test-Path -LiteralPath $DefaultQuestionBankInfoPath -PathType Leaf) { Get-Content -Raw -LiteralPath $DefaultQuestionBankInfoPath } else { $null }
$DefaultQuestionBankInfoWasUpdated = $false
function Write-Section([string]$Message) { Write-Host ''; Write-Host '========================================'; Write-Host $Message; Write-Host '========================================' }
function Invoke-Git([string[]]$Arguments) { $output = & git @Arguments 2>&1; if ($LASTEXITCODE -ne 0) { throw "git $($Arguments -join ' ') failed:`n$output" }; return $output }
function Get-FileSha256([string]$Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Test-AllowedStatusPath([string]$Path) { $n = $Path -replace '\\','/'; return ($n -like "$UpdateDirName/*" -or $n -like 'question-bank-backups/*') }
function Assert-CleanWorktreeExceptAllowedInputs { $lines = @(& git status --porcelain=v1); if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }; $blocked = @(); foreach ($line in $lines) { if ([string]::IsNullOrWhiteSpace($line)) { continue }; $status = $line.Substring(0,2); $path = $line.Substring(3).Trim().Trim('"'); if (-not (Test-AllowedStatusPath $path)) { $blocked += $line; continue }; if ($status[0] -ne '?' -and $status[0] -ne ' ') { $blocked += $line } }; if (@($blocked).Count -gt 0) { Write-Host 'Uncommitted changes outside update/backups folders were found:'; $blocked | ForEach-Object { Write-Host $_ }; throw 'Please handle those changes first.' } }
function Get-QuestionBankSourceCandidate { if (-not (Test-Path -LiteralPath $UpdateDir)) { New-Item -ItemType Directory -Force -Path $UpdateDir | Out-Null }; $files = @(Get-ChildItem -LiteralPath $UpdateDir -File -Force | Where-Object { -not $_.Attributes.HasFlag([System.IO.FileAttributes]::Hidden) -and $_.Name -ne '.gitkeep' -and -not $_.Name.StartsWith('~') -and ($_.Extension -ieq '.zip' -or $_.Extension -ieq '.csv') }); $fileCount = @($files).Count; if ($fileCount -eq 0) { throw 'No update source found. Put exactly one ZIP or CSV file in the update folder.' }; if ($fileCount -gt 1) { Write-Host 'More than one candidate file found. Remove extra ZIP/CSV files and run again.'; @($files) | ForEach-Object { Write-Host "- $($_.FullName)" }; throw 'Multiple source files found.' }; return @($files)[0] }
function Invoke-QuestionBankValidation([string]$Path, [string]$Kind, [switch]$RejectCsvImageReferences) { $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',$ValidateScript,'-Path',$Path,'-Kind',$Kind,'-OutputJson'); if ($RejectCsvImageReferences) { $args += '-RejectCsvImageReferences' }; $json = & powershell @args; if ($LASTEXITCODE -ne 0) { throw "Question bank validation failed:`n$json" }; return ($json | ConvertFrom-Json) }
function Restore-OriginalQuestionBankIfNeeded { if (-not $TargetWasReplaced -or $CommitCreated) { return }; if ($HadOriginalTarget) { if ($null -eq $BackupPath -or -not (Test-Path -LiteralPath $BackupPath)) { Write-Host 'Warning: backup not found, cannot restore.'; return }; Copy-Item -LiteralPath $BackupPath -Destination $TargetPath -Force; $h = Get-FileSha256 $TargetPath; if ($h -eq $BackupHash) { Write-Host "Restored target: $TargetPath" } else { Write-Host 'Warning: restored hash does not match backup.' } } else { if (Test-Path -LiteralPath $TargetPath) { Remove-Item -LiteralPath $TargetPath -Force }; Write-Host 'Removed newly-created target because no old target existed.' } }
function Restore-DefaultQuestionBankInfoIfNeeded {
  if (-not $DefaultQuestionBankInfoWasUpdated -or $CommitCreated) { return }
  if ($null -eq $OriginalDefaultQuestionBankInfo) {
    if (Test-Path -LiteralPath $DefaultQuestionBankInfoPath) { [System.IO.File]::Delete($DefaultQuestionBankInfoPath) }
    return
  }
  [System.IO.File]::WriteAllText($DefaultQuestionBankInfoPath, $OriginalDefaultQuestionBankInfo, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Restored default question bank version file: $DefaultQuestionBankInfoPath"
}
function Set-DefaultQuestionBankVersion([string]$Version) {
  if (-not (Test-Path -LiteralPath $DefaultQuestionBankInfoPath -PathType Leaf)) { throw "Default question bank info file not found: $DefaultQuestionBankInfoPath" }
  $content = Get-Content -Raw -LiteralPath $DefaultQuestionBankInfoPath
  $nextContent = [regex]::Replace($content, "export const DEFAULT_QUESTION_BANK_VERSION = '[^']+';", "export const DEFAULT_QUESTION_BANK_VERSION = '$Version';", 1)
  if ($nextContent -eq $content) { throw 'DEFAULT_QUESTION_BANK_VERSION declaration was not found.' }
  [System.IO.File]::WriteAllText($DefaultQuestionBankInfoPath, $nextContent, [System.Text.UTF8Encoding]::new($false))
  $script:DefaultQuestionBankInfoWasUpdated = $true
  Write-Host "Default question bank version: $Version"
}
function New-DefaultQuestionBankVersion { return (Get-Date -Format 'yyyy.MM.dd.HHmmss') }
function UnstageTargetIfNeeded {
  $staged = @(& git diff --cached --name-only)
  if ($LASTEXITCODE -ne 0) { return }
  $stagedNormalized = @($staged | ForEach-Object { $_ -replace '\\','/' })
  if ($stagedNormalized -contains 'public/JLS_094_115_v5.0.zip') { & git restore --staged -- 'public/JLS_094_115_v5.0.zip' | Out-Null }
  if ($stagedNormalized -contains 'src/config/defaultQuestionBankInfo.ts') { & git restore --staged -- 'src/config/defaultQuestionBankInfo.ts' | Out-Null }
}
function Cleanup-TempPaths { foreach ($p in $TempPaths) { if ($p -and (Test-Path -LiteralPath $p)) { Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue } } }
function Get-FailedVitestTests([object]$Json) {
  $failed = @()
  if ($null -eq $Json.testResults) { throw 'Vitest JSON did not contain testResults.' }
  foreach ($result in @($Json.testResults)) {
    $fileName = [string]$result.name
    foreach ($assertion in @($result.assertionResults)) {
      if ([string]$assertion.status -eq 'failed') {
        $name = if (-not [string]::IsNullOrWhiteSpace([string]$assertion.fullName)) { [string]$assertion.fullName } else { [string]$assertion.title }
        $failed += [pscustomobject]@{ File = $fileName; Name = $name; Key = "$fileName :: $name" }
      }
    }
  }
  return @($failed)
}
function Invoke-VitestSnapshot([string]$Label) {
  $stamp = [System.Guid]::NewGuid().ToString('N')
  $jsonPath = Join-Path ([System.IO.Path]::GetTempPath()) "jls-vitest-$stamp.json"
  $logPath = Join-Path ([System.IO.Path]::GetTempPath()) "jls-vitest-$stamp.log"
  $script:TempPaths += $jsonPath
  $script:TempPaths += $logPath
  Write-Host "Running full Vitest snapshot: $Label"
  $output = & $env:PNPM_CMD exec vitest run --configLoader runner --reporter=json --outputFile $jsonPath 2>&1
  $exitCode = $LASTEXITCODE
  [System.IO.File]::WriteAllText($logPath, ($output -join [Environment]::NewLine), [System.Text.UTF8Encoding]::new($false))
  if (-not (Test-Path -LiteralPath $jsonPath)) {
    Write-Host "Vitest output log: $logPath"
    throw "Vitest did not produce a JSON result for $Label. Exit code: $exitCode"
  }
  try { $json = Get-Content -Raw -LiteralPath $jsonPath | ConvertFrom-Json } catch { Write-Host "Vitest output log: $logPath"; throw "Vitest JSON could not be parsed for $Label. $($_.Exception.Message)" }
  if ($null -eq $json.numTotalTests -or $null -eq $json.testResults) {
    Write-Host "Vitest output log: $logPath"
    throw "Vitest JSON result is missing required fields for $Label."
  }
  $failedTests = @(Get-FailedVitestTests $json)
  $failedFiles = @($failedTests | ForEach-Object { $_.File } | Sort-Object -Unique)
  $snapshot = [pscustomobject]@{
    Label = $Label
    ExitCode = $exitCode
    TotalTests = [int]$json.numTotalTests
    FailedFileCount = [int]@($failedFiles).Count
    FailedTestCount = [int]@($failedTests).Count
    FailedTests = @($failedTests)
    LogPath = $logPath
    JsonPath = $jsonPath
  }
  Write-Host "$Label failed test files: $($snapshot.FailedFileCount)"
  Write-Host "$Label failed tests: $($snapshot.FailedTestCount)"
  return $snapshot
}
function Compare-VitestSnapshots([object]$Before, [object]$After) {
  if ($null -eq $Before -or $null -eq $After) { throw 'Cannot compare missing Vitest snapshots.' }
  $beforeKeys = @($Before.FailedTests | ForEach-Object { [string]$_.Key })
  $beforeSet = @{}
  foreach ($key in $beforeKeys) { $beforeSet[$key] = $true }
  $newFailures = @()
  foreach ($failure in @($After.FailedTests)) {
    if (-not $beforeSet.ContainsKey([string]$failure.Key)) { $newFailures += $failure }
  }
  if ($After.FailedFileCount -gt $Before.FailedFileCount) { throw "Vitest failed file count increased from $($Before.FailedFileCount) to $($After.FailedFileCount)." }
  if ($After.FailedTestCount -gt $Before.FailedTestCount) { throw "Vitest failed test count increased from $($Before.FailedTestCount) to $($After.FailedTestCount)." }
  if (@($newFailures).Count -gt 0) {
    Write-Host 'New Vitest failures:'
    $newFailures | ForEach-Object { Write-Host "- $($_.File) :: $($_.Name)" }
    throw 'New Vitest failures were introduced by the question bank update.'
  }
  if ($After.FailedTestCount -eq 0) { return 'all-passed' }
  return 'baseline-preserved'
}

try {
Set-Location -LiteralPath $RepoRoot
Write-Section 'Checking environment'
Write-Host "Repository: $RepoRoot"
Invoke-Git @('rev-parse','--is-inside-work-tree') | Out-Null
$branch = (Invoke-Git @('branch','--show-current') | Select-Object -First 1).Trim()
Write-Host "Branch: $branch"
if ($branch -ne 'main') { throw "Current branch is not main: $branch" }
foreach ($c in @('git','node')) { $found = Get-Command $c -ErrorAction SilentlyContinue; if ($null -eq $found) { throw "Missing command: $c" }; Write-Host "$($c): $(& $c --version)" }
if ([string]::IsNullOrWhiteSpace($env:PNPM_CMD)) { throw 'PNPM_CMD is not set by scripts\init-env.bat.' }
Write-Host "pnpm: $(& $env:PNPM_CMD --version)"
Write-Host 'git fetch origin'
Invoke-Git @('fetch','origin') | Out-Null
Invoke-Git @('rev-parse','--verify','origin/main') | Out-Null
$head = (Invoke-Git @('rev-parse','HEAD') | Select-Object -First 1).Trim()
$origin = (Invoke-Git @('rev-parse','origin/main') | Select-Object -First 1).Trim()
if ($head -ne $origin) { $counts = (Invoke-Git @('rev-list','--left-right','--count','origin/main...HEAD') | Select-Object -First 1).Trim(); throw "main and origin/main are not synchronized: $counts" }
Assert-CleanWorktreeExceptAllowedInputs
Write-Section 'Searching question bank file'
$source = Get-QuestionBankSourceCandidate
Write-Host "Source file: $($source.Name)"
Write-Host "Source path: $($source.FullName)"
if ($source.Length -le 0) { throw 'Source file is 0 bytes.' }
$sourceHash = Get-FileSha256 $source.FullName
Write-Host "Source SHA-256: $sourceHash"
$sourceKind = if ($source.Extension -ieq '.zip') { 'ZIP' } else { 'CSV' }
Write-Host "Source format: $sourceKind"
$candidatePath = $source.FullName
Write-Section 'Validating question bank'
if ($sourceKind -eq 'ZIP') { [void](Invoke-QuestionBankValidation -Path $source.FullName -Kind 'Zip') } else { [void](Invoke-QuestionBankValidation -Path $source.FullName -Kind 'Csv' -RejectCsvImageReferences); $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("jls-default-question-bank-" + [System.Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Force -Path $tempDir | Out-Null; $TempPaths += $tempDir; $candidatePath = Join-Path $tempDir 'JLS_094_115_v5.0.zip'; & powershell -NoProfile -ExecutionPolicy Bypass -File $PackageScript -CsvPath $source.FullName -OutputZipPath $candidatePath; if ($LASTEXITCODE -ne 0) { throw 'CSV packaging failed.' } }
$candidateValidation = Invoke-QuestionBankValidation -Path $candidatePath -Kind 'Zip'
$candidateHash = Get-FileSha256 $candidatePath
Write-Host "Question count: $($candidateValidation.questionCount)"
Write-Host "Image references: $($candidateValidation.hasImageReferences)"
Write-Host "Image resources: $($candidateValidation.hasImageResources)"
Write-Host "Candidate SHA-256: $candidateHash"
if ($HadOriginalTarget) { $currentHash = Get-FileSha256 $TargetPath; if ($currentHash -eq $candidateHash) { Write-Section 'No changes'; Write-Host 'New question bank is identical to current default question bank.'; Cleanup-TempPaths; exit 0 } }
Write-Section 'Recording pre-update test baseline'
$PreUpdateTestSnapshot = Invoke-VitestSnapshot 'before update'
Write-Section 'Backing up current question bank'
if (-not (Test-Path -LiteralPath $BackupDir)) { New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null }
if ($HadOriginalTarget) { $ts = Get-Date -Format 'yyyyMMdd_HHmmss'; $BackupPath = Join-Path $BackupDir "JLS_094_115_v5.0_$ts.zip"; Copy-Item -LiteralPath $TargetPath -Destination $BackupPath -Force; $orig = Get-FileSha256 $TargetPath; $BackupHash = Get-FileSha256 $BackupPath; Write-Host "Backup: $BackupPath"; if ($orig -ne $BackupHash) { throw 'Backup hash does not match original.' } } else { Write-Host 'No old default question bank to back up.' }
Write-Section 'Updating default question bank'
Copy-Item -LiteralPath $candidatePath -Destination $TargetPath -Force
$TargetWasReplaced = $true
$targetHash = Get-FileSha256 $TargetPath
if ($targetHash -ne $candidateHash) { throw 'Target hash does not match candidate.' }
$finalValidation = Invoke-QuestionBankValidation -Path $TargetPath -Kind 'Zip'
$NewDefaultQuestionBankVersion = New-DefaultQuestionBankVersion
Set-DefaultQuestionBankVersion $NewDefaultQuestionBankVersion
Write-Section 'Running post-update tests'
$PostUpdateTestSnapshot = Invoke-VitestSnapshot 'after update'
$TestBaselineStatus = Compare-VitestSnapshots $PreUpdateTestSnapshot $PostUpdateTestSnapshot
Write-Section 'Running build'
& $env:PNPM_CMD build
if ($LASTEXITCODE -ne 0) { throw "pnpm build failed: $LASTEXITCODE" }
Write-Section 'Creating Git commit'
Invoke-Git @('add','--','public\JLS_094_115_v5.0.zip','src\config\defaultQuestionBankInfo.ts') | Out-Null
$staged = @(Invoke-Git @('diff','--cached','--name-only') | ForEach-Object { $_ -replace '\\','/' })
$expectedStaged = @('public/JLS_094_115_v5.0.zip', 'src/config/defaultQuestionBankInfo.ts')
$unexpectedStaged = @($staged | Where-Object { $_ -notin $expectedStaged })
$missingStaged = @($expectedStaged | Where-Object { $_ -notin $staged })
if (@($unexpectedStaged).Count -gt 0 -or @($missingStaged).Count -gt 0) {
  $staged | ForEach-Object { Write-Host "- $_" }
  throw 'Staged content check failed.'
}
Invoke-Git @('commit','-m',$CommitMessage) | Out-Null
$CommitCreated = $true
$CommitHash = (Invoke-Git @('rev-parse','--short','HEAD') | Select-Object -First 1).Trim()
Write-Host "Commit: $CommitHash"
Write-Section 'Pushing to origin/main'
$push = & git push origin main 2>&1
if ($LASTEXITCODE -ne 0) { Write-Host 'Commit created locally, but push failed.'; Write-Host "Commit hash: $CommitHash"; Write-Host 'Run manually later: git push origin main'; Write-Host $push; Cleanup-TempPaths; exit 2 }
$moved = 'Moved to completed folder.'
try { if (-not (Test-Path -LiteralPath $DoneDir)) { New-Item -ItemType Directory -Force -Path $DoneDir | Out-Null }; $dest = Join-Path $DoneDir $source.Name; if (Test-Path -LiteralPath $dest) { $ts = Get-Date -Format 'yyyyMMdd_HHmmss'; $base = [System.IO.Path]::GetFileNameWithoutExtension($source.Name); $ext = $source.Extension; $dest = Join-Path $DoneDir ("${base}_${ts}${ext}") }; Move-Item -LiteralPath $source.FullName -Destination $dest; $moved = "Moved to: $dest" } catch { $moved = "Warning: failed to move source file. $($_.Exception.Message)" }
Cleanup-TempPaths
Write-Section 'Default question bank update succeeded'
Write-Host "Source file: $($source.Name)"
Write-Host "Source format: $sourceKind"
Write-Host 'Default question bank: public\JLS_094_115_v5.0.zip'
Write-Host "Question count: $($finalValidation.questionCount)"
Write-Host "Image resources: $($finalValidation.hasImageResources)"
Write-Host "Backup: $(if ($BackupPath) { $BackupPath } else { 'none' })"
Write-Host "Default SHA-256: $targetHash"
Write-Host "Default question bank version: $NewDefaultQuestionBankVersion"
Write-Host 'Test baseline:'
Write-Host "Before failed test files: $($PreUpdateTestSnapshot.FailedFileCount)"
Write-Host "Before failed tests: $($PreUpdateTestSnapshot.FailedTestCount)"
Write-Host 'Post-update tests:'
Write-Host "After failed test files: $($PostUpdateTestSnapshot.FailedFileCount)"
Write-Host "After failed tests: $($PostUpdateTestSnapshot.FailedTestCount)"
if ($TestBaselineStatus -eq 'all-passed') { Write-Host 'Post-update full test suite passed.' } else { Write-Host 'No new test failures were introduced; existing test baseline issues remain.' }
Write-Host "Git Commit: $CommitHash"
Write-Host 'Git Push: pushed to origin/main'
Write-Host "Source file: $moved"
Write-Host 'Publish status: GitHub Pages publish was not executed.'
Write-Host 'Please run publish-github-pages.bat yourself after confirmation.'
exit 0
} catch {
Write-Section 'Default question bank update failed'
Write-Host $_.Exception.Message
if (-not $CommitCreated) { try { UnstageTargetIfNeeded } catch {}; try { Restore-DefaultQuestionBankInfoIfNeeded } catch { Write-Host "Version restore failed: $($_.Exception.Message)" }; try { Restore-OriginalQuestionBankIfNeeded } catch { Write-Host "Restore failed: $($_.Exception.Message)" } }
Cleanup-TempPaths
exit 1
}

