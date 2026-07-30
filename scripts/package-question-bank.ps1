[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$CsvPath, [Parameter(Mandatory = $true)][string]$OutputZipPath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null
if (-not (Test-Path -LiteralPath $CsvPath -PathType Leaf)) { throw "CSV file not found: $CsvPath" }
$item = Get-Item -LiteralPath $CsvPath
if ($item.Length -le 0) { throw "CSV file is 0 bytes: $CsvPath" }
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("jls-question-bank-package-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
try {
  Copy-Item -LiteralPath $item.FullName -Destination (Join-Path $tempRoot 'questions.csv') -Force
  $parent = Split-Path -Parent $OutputZipPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  if (Test-Path -LiteralPath $OutputZipPath) { Remove-Item -LiteralPath $OutputZipPath -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $OutputZipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
  Write-Host "CSV packaged as ZIP: $OutputZipPath"
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
