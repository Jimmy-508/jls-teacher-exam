[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [Parameter(Mandatory = $true)][ValidateSet('Zip','Csv')][string]$Kind,
  [switch]$RejectCsvImageReferences,
  [switch]$OutputJson
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function U([int[]]$Codes) { return -join ($Codes | ForEach-Object { [char]$_ }) }
$RequiredHeaders = @(
  'ID',(U 0x5e74,0x5ea6),(U 0x985e,0x79d1),(U 0x79d1,0x76ee),(U 0x984c,0x865f),(U 0x984c,0x578b),(U 0x5206,0x6578),(U 0x985e,0x5225),(U 0x6838,0x5fc3,0x6982,0x5ff5),(U 0x984c,0x5e79),
  'A','B','C','D',(U 0x6a19,0x6e96,0x7b54,0x6848),(U 0x984c,0x5e79,0x5206,0x6790),('A'+(U 0x89e3,0x6790)),('B'+(U 0x89e3,0x6790)),('C'+(U 0x89e3,0x6790)),('D'+(U 0x89e3,0x6790)),
  (U 0x975e,0x9078,0x53c3,0x8003,0x7b54,0x6848),(U 0x89e3,0x984c,0x6280,0x5de7),(U 0x6613,0x6df7,0x6dc6,0x6982,0x5ff5),(U 0x6377,0x5f91,0x95dc,0x9375,0x5b57),(U 0x6838,0x5fc3,0x6982,0x5ff5,0x540c,0x7fa9,0x8a5e),(U 0x52a0,0x5206,0x6982,0x5ff5),
  (U 0x984c,0x76ee,0x5716,0x7247),('A'+(U 0x5716,0x7247)),('B'+(U 0x5716,0x7247)),('C'+(U 0x5716,0x7247)),('D'+(U 0x5716,0x7247)),(U 0x5716,0x7247,0x5099,0x8a3b)
)
$ImageHeaders = @((U 0x984c,0x76ee,0x5716,0x7247),('A'+(U 0x5716,0x7247)),('B'+(U 0x5716,0x7247)),('C'+(U 0x5716,0x7247)),('D'+(U 0x5716,0x7247)))
$StemHeader = U 0x984c,0x5e79
$NumberHeader = U 0x984c,0x865f
function Add-ZipAssembly { Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null }
function Read-StreamBytes([System.IO.Stream]$Stream) { $m = [System.IO.MemoryStream]::new(); try { $Stream.CopyTo($m); return $m.ToArray() } finally { $m.Dispose() } }
function Convert-Utf8([byte[]]$Bytes) { try { return ([System.Text.UTF8Encoding]::new($false, $true)).GetString($Bytes) } catch { throw 'CSV is not valid UTF-8.' } }
function Decode-HashU([string]$Value) { return [regex]::Replace($Value, '#U([0-9A-Fa-f]{4})', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) }) }
function Normalize-PathText([string]$Value) { if ($null -eq $Value) { $t = '' } else { $t = $Value.Trim() }; if ($t.Length -eq 0) { return '' }; $t = Decode-HashU $t; $t = $t -replace '\\','/'; while ($t.StartsWith('./')) { $t = $t.Substring(2) }; if ($t.StartsWith('/') -or $t -match '^[A-Za-z]:') { return '' }; $segments = @($t.Split('/') | Where-Object { $_.Length -gt 0 }); if (($segments | Where-Object { $_ -eq '..' })) { return '' }; return ($segments -join '/') }
function Get-ZipEntryDirectory([string]$EntryPath) { $n = Normalize-PathText $EntryPath; if ($n.Length -eq 0 -or -not $n.Contains('/')) { return '' }; return $n.Substring(0, $n.LastIndexOf('/')) }
function Is-SupportedImagePath([string]$Value) { return (Normalize-PathText $Value) -match '(?i)\.(png|jpe?g|webp)$' }
function Is-ExternalImage([string]$Value) { if ($null -eq $Value) { return $false }; return $Value.Trim() -match '^(?i)(https?://|data:|jls-question-image:)' }
function Get-ZipCsvEntry([string]$ZipPath) {
  Add-ZipAssembly
  $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $csvEntries = @($archive.Entries | Where-Object { -not [string]::IsNullOrEmpty($_.Name) -and $_.FullName -match '(?i)\.csv$' })
    $csvCount = @($csvEntries).Count
    if ($csvCount -eq 0) { throw 'ZIP question bank does not contain a CSV file.' }
    if ($csvCount -gt 1) {
      Write-Host 'CSV entries found in ZIP:'
      @($csvEntries) | ForEach-Object { Write-Host "- $($_.FullName)" }
      throw 'ZIP question bank contains multiple CSV files.'
    }
    $entry = @($csvEntries)[0]
    if ($entry.Length -le 0) { throw "CSV in ZIP is empty: $($entry.FullName)" }
    $stream = $entry.Open()
    try {
      return [pscustomobject]@{
        FullName = (Normalize-PathText $entry.FullName)
        Directory = (Get-ZipEntryDirectory $entry.FullName)
        Bytes = (Read-StreamBytes $stream)
      }
    } finally { $stream.Dispose() }
  } finally { $archive.Dispose() }
}
function Get-ZipImages([string]$ZipPath) {
  Add-ZipAssembly
  $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
  try {
    $items = @()
    foreach ($entry in $archive.Entries) {
      $name = Normalize-PathText $entry.FullName
      if ($entry.Length -gt 0 -and $name.Length -gt 0 -and (Is-SupportedImagePath $name)) { $items += $name }
    }
    return @($items)
  } finally { $archive.Dispose() }
}
function Get-ImageCandidates([string]$Reference, [string]$CsvDirectory) {
  $normalized = Normalize-PathText $Reference
  if ($normalized.Length -eq 0) { return @() }
  $items = New-Object System.Collections.Generic.List[string]
  $items.Add($normalized)
  if (-not [string]::IsNullOrWhiteSpace($CsvDirectory) -and -not $normalized.Contains('/')) {
    $items.Add((Normalize-PathText ("$CsvDirectory/$normalized")))
  }
  return @($items | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique)
}
function Read-CsvRows([string]$Text) { $clean = $Text.TrimStart([char]0xFEFF); if ([string]::IsNullOrWhiteSpace($clean)) { throw 'CSV is empty.' }; try { $rows = $clean | ConvertFrom-Csv } catch { throw "CSV parse failed: $($_.Exception.Message)" }; if ($null -eq $rows) { $rows = @() }; if ($rows -isnot [array]) { $rows = @($rows) }; return $rows }
function Has-AnyValue([object[]]$Rows, [string]$ColumnName) { foreach ($row in $Rows) { $v = [string]$row.$ColumnName; if (-not [string]::IsNullOrWhiteSpace($v)) { return $true } }; return $false }
function Get-ImageReferences([object[]]$Rows) { $refs = New-Object System.Collections.Generic.List[string]; foreach ($row in $Rows) { foreach ($h in $ImageHeaders) { if ($row.PSObject.Properties.Name -contains $h) { $v = ([string]$row.$h).Trim(); if ($v.Length -gt 0) { $refs.Add($v) } } } }; return @($refs) }
if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "File not found: $Path" }
$item = Get-Item -LiteralPath $Path
if ($item.Length -le 0) { throw "File is 0 bytes: $Path" }
$imageEntries = @()
$csvEntryPath = if ($Kind -eq 'Csv') { (Split-Path -Leaf $item.FullName) } else { '' }
$csvEntryDirectory = ''
if ($Kind -eq 'Zip') { $csvEntry = Get-ZipCsvEntry $Path; $bytes = $csvEntry.Bytes; $csvEntryPath = $csvEntry.FullName; $csvEntryDirectory = $csvEntry.Directory; $imageEntries = @(Get-ZipImages $Path) } else { $bytes = [System.IO.File]::ReadAllBytes($item.FullName) }
$rows = @(Read-CsvRows (Convert-Utf8 $bytes))
if (@($rows).Count -le 0) { throw 'CSV must contain at least one data row.' }
$headers = @($rows[0].PSObject.Properties.Name)
foreach ($required in $RequiredHeaders) { if ($headers -notcontains $required) { throw "CSV missing required header: $required" } }
if (-not (Has-AnyValue -Rows $rows -ColumnName 'ID')) { throw 'ID column cannot be all blank.' }
if (-not (Has-AnyValue -Rows $rows -ColumnName $StemHeader)) { throw 'Stem column cannot be all blank.' }
if (-not (Has-AnyValue -Rows $rows -ColumnName $NumberHeader)) { throw 'Question number column cannot be all blank.' }
$imageReferences = @(Get-ImageReferences $rows)
$hasImageReferences = @($imageReferences).Count -gt 0
$hasImageResources = @($imageEntries).Count -gt 0
if ($Kind -eq 'Csv' -and $RejectCsvImageReferences -and $hasImageReferences) { throw 'This CSV contains image references. Please use a ZIP with the CSV and image files.' }
$missing = @()
if ($Kind -eq 'Zip' -and $hasImageReferences) {
  $pathSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase)
  $basenameMap = @{}
  foreach ($entry in $imageEntries) {
    $pathValue = Normalize-PathText $entry
    if ($pathValue.Length -eq 0) { continue }
    [void]$pathSet.Add($pathValue)
    $baseKey = (Split-Path -Leaf $pathValue).Normalize('FormC').ToLowerInvariant()
    if (-not $basenameMap.ContainsKey($baseKey)) { $basenameMap[$baseKey] = New-Object System.Collections.Generic.List[string] }
    $basenameMap[$baseKey].Add($pathValue)
  }
  foreach ($ref in ($imageReferences | Select-Object -Unique)) {
    if (Is-ExternalImage $ref) { continue }
    $matched = $false
    foreach ($candidate in (Get-ImageCandidates $ref $csvEntryDirectory)) { if ($pathSet.Contains($candidate)) { $matched = $true; break } }
    if (-not $matched) {
      $baseName = Split-Path -Leaf (Normalize-PathText $ref)
      if (-not [string]::IsNullOrWhiteSpace($baseName)) {
        $baseKey = $baseName.Normalize('FormC').ToLowerInvariant()
        if ($basenameMap.ContainsKey($baseKey) -and @($basenameMap[$baseKey]).Count -eq 1) { $matched = $true }
      }
    }
    if (-not $matched) { $missing += $ref }
  }
  if (@($missing).Count -gt 0) { throw ('ZIP missing image references:' + [Environment]::NewLine + (($missing | Select-Object -First 20) -join [Environment]::NewLine)) }
}
$result = [ordered]@{ path = $item.FullName; kind = $Kind; csvEntryPath = $csvEntryPath; csvEntryDirectory = $csvEntryDirectory; questionCount = @($rows).Count; headerCount = @($headers).Count; headers = $headers; hasImageReferences = $hasImageReferences; hasImageResources = $hasImageResources; imageReferenceCount = @($imageReferences).Count; imageResourceCount = @($imageEntries).Count }
if ($OutputJson) { $result | ConvertTo-Json -Depth 5 } else { Write-Host 'Question bank validation passed.'; Write-Host "CSV entry: $csvEntryPath"; Write-Host "CSV directory: $csvEntryDirectory"; Write-Host "Question count: $(@($rows).Count)"; Write-Host "Image references: $hasImageReferences"; Write-Host "Image resources: $hasImageResources" }
