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
function Convert-Utf8([byte[]]$Bytes) { try { return ([System.Text.UTF8Encoding]::new($false, $true)).GetString($Bytes) } catch { throw 'questions.csv is not valid UTF-8.' } }
function Get-ZipCsvBytes([string]$ZipPath) { Add-ZipAssembly; $a = [System.IO.Compression.ZipFile]::OpenRead($ZipPath); try { $e = $a.Entries | Where-Object { $_.FullName -eq 'questions.csv' } | Select-Object -First 1; if ($null -eq $e) { throw 'ZIP root must contain questions.csv.' }; if ($e.Length -le 0) { throw 'questions.csv in ZIP is empty.' }; $s = $e.Open(); try { return Read-StreamBytes $s } finally { $s.Dispose() } } finally { $a.Dispose() } }
function Get-ZipImages([string]$ZipPath) { Add-ZipAssembly; $a = [System.IO.Compression.ZipFile]::OpenRead($ZipPath); try { $r = @(); foreach ($e in $a.Entries) { $n = $e.FullName -replace '\\','/'; if ($e.Length -gt 0 -and $n.StartsWith('images/', [System.StringComparison]::OrdinalIgnoreCase)) { $r += $n } }; return $r } finally { $a.Dispose() } }
function Decode-HashU([string]$Value) { return [regex]::Replace($Value, '#U([0-9A-Fa-f]{4})', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) }) }
function Normalize-PathText([string]$Value) { if ($null -eq $Value) { $t = '' } else { $t = $Value.Trim() }; if ($t.Length -eq 0) { return '' }; $t = $t -replace '\\','/'; while ($t.StartsWith('./')) { $t = $t.Substring(2) }; return $t.TrimStart('/') }
function Is-ExternalImage([string]$Value) { if ($null -eq $Value) { return $false }; return $Value.Trim() -match '^(?i)(https?://|data:|jls-question-image:)' }
function Get-ImageCandidates([string]$Reference) { $n = Normalize-PathText $Reference; if ($n.Length -eq 0) { return @() }; $d = Decode-HashU $n; $items = New-Object System.Collections.Generic.List[string]; foreach ($i in @($n, $d)) { if ($i.Length -eq 0) { continue }; $items.Add($i); $items.Add((Split-Path -Leaf $i)); if (-not $i.StartsWith('images/', [System.StringComparison]::OrdinalIgnoreCase)) { $items.Add("images/$i"); $items.Add("images/$(Split-Path -Leaf $i)") } }; return $items | Where-Object { $_ -and $_.Trim().Length -gt 0 } | Select-Object -Unique }
function Read-CsvRows([string]$Text) { $clean = $Text.TrimStart([char]0xFEFF); if ([string]::IsNullOrWhiteSpace($clean)) { throw 'questions.csv is empty.' }; try { $rows = $clean | ConvertFrom-Csv } catch { throw "CSV parse failed: $($_.Exception.Message)" }; if ($null -eq $rows) { $rows = @() }; if ($rows -isnot [array]) { $rows = @($rows) }; return $rows }
function Has-AnyValue([object[]]$Rows, [string]$ColumnName) { foreach ($row in $Rows) { $v = [string]$row.$ColumnName; if (-not [string]::IsNullOrWhiteSpace($v)) { return $true } }; return $false }
function Get-ImageReferences([object[]]$Rows) { $refs = New-Object System.Collections.Generic.List[string]; foreach ($row in $Rows) { foreach ($h in $ImageHeaders) { if ($row.PSObject.Properties.Name -contains $h) { $v = ([string]$row.$h).Trim(); if ($v.Length -gt 0) { $refs.Add($v) } } } }; return @($refs) }
if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { throw "File not found: $Path" }
$item = Get-Item -LiteralPath $Path
if ($item.Length -le 0) { throw "File is 0 bytes: $Path" }
$imageEntries = @()
if ($Kind -eq 'Zip') { $bytes = Get-ZipCsvBytes $Path; $imageEntries = @(Get-ZipImages $Path) } else { $bytes = [System.IO.File]::ReadAllBytes($item.FullName) }
$rows = @(Read-CsvRows (Convert-Utf8 $bytes))
if ($rows.Count -le 0) { throw 'CSV must contain at least one data row.' }
$headers = @($rows[0].PSObject.Properties.Name)
foreach ($required in $RequiredHeaders) { if ($headers -notcontains $required) { throw "CSV missing required header: $required" } }
if (-not (Has-AnyValue -Rows $rows -ColumnName 'ID')) { throw 'ID column cannot be all blank.' }
if (-not (Has-AnyValue -Rows $rows -ColumnName $StemHeader)) { throw 'Stem column cannot be all blank.' }
if (-not (Has-AnyValue -Rows $rows -ColumnName $NumberHeader)) { throw 'Question number column cannot be all blank.' }
$imageReferences = @(Get-ImageReferences $rows)
$hasImageReferences = $imageReferences.Count -gt 0
$hasImageResources = $imageEntries.Count -gt 0
if ($Kind -eq 'Csv' -and $RejectCsvImageReferences -and $hasImageReferences) { throw 'This CSV contains image references. Please use a ZIP with questions.csv and images folder.' }
$missing = @()
if ($Kind -eq 'Zip' -and $hasImageReferences) { $assetSet = New-Object 'System.Collections.Generic.HashSet[string]' ([System.StringComparer]::OrdinalIgnoreCase); foreach ($entry in $imageEntries) { [void]$assetSet.Add((Normalize-PathText $entry)); [void]$assetSet.Add((Split-Path -Leaf $entry)); $decoded = Decode-HashU $entry; [void]$assetSet.Add((Normalize-PathText $decoded)); [void]$assetSet.Add((Split-Path -Leaf $decoded)) }; foreach ($ref in ($imageReferences | Select-Object -Unique)) { if (Is-ExternalImage $ref) { continue }; $matched = $false; foreach ($c in (Get-ImageCandidates $ref)) { if ($assetSet.Contains($c)) { $matched = $true; break } }; if (-not $matched) { $missing += $ref } }; if ($missing.Count -gt 0) { throw ('ZIP missing image references:' + [Environment]::NewLine + (($missing | Select-Object -First 20) -join [Environment]::NewLine)) } }
$result = [ordered]@{ path = $item.FullName; kind = $Kind; questionCount = $rows.Count; headerCount = $headers.Count; headers = $headers; hasImageReferences = $hasImageReferences; hasImageResources = $hasImageResources; imageReferenceCount = $imageReferences.Count; imageResourceCount = $imageEntries.Count }
if ($OutputJson) { $result | ConvertTo-Json -Depth 5 } else { Write-Host 'Question bank validation passed.'; Write-Host "Question count: $($rows.Count)"; Write-Host "Image references: $hasImageReferences"; Write-Host "Image resources: $hasImageResources" }
