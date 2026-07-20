import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, 'icon-source.png');
const iconsDir = path.join(rootDir, 'public', 'icons');

const iconTargets = [
  ['favicon.png', 64],
  ['apple-touch-icon.png', 180],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['pwa-maskable-192x192.png', 192],
  ['pwa-maskable-512x512.png', 512],
  ['jls-icon-192.png', 192],
  ['jls-icon-512.png', 512],
  ['jls-maskable-512.png', 512],
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`${filePath} is not a PNG file.`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

if (!fs.existsSync(sourcePath)) {
  fail(`Missing icon source: ${sourcePath}`);
}

fs.mkdirSync(iconsDir, { recursive: true });

const sourceInfo = readPngSize(sourcePath);
if (sourceInfo.width < 128 || sourceInfo.height < 128) {
  fail('icon-source.png is too small. Please use a larger PNG image.');
}

const psScript = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = [System.IO.Path]::Combine((Get-Location).Path, 'icon-source.png')
$iconsDir = [System.IO.Path]::Combine((Get-Location).Path, 'public', 'icons')

function Get-ContentBounds([System.Drawing.Bitmap]$bitmap) {
  $minX = $bitmap.Width
  $minY = $bitmap.Height
  $maxX = -1
  $maxY = -1
  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $isWhite = $pixel.R -ge 246 -and $pixel.G -ge 246 -and $pixel.B -ge 246
      $isTransparent = $pixel.A -lt 10
      if (-not ($isWhite -or $isTransparent)) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }
  if ($maxX -lt 0 -or $maxY -lt 0) {
    return New-Object System.Drawing.Rectangle(0, 0, $bitmap.Width, $bitmap.Height)
  }
  return New-Object System.Drawing.Rectangle($minX, $minY, ($maxX - $minX + 1), ($maxY - $minY + 1))
}

function Save-Icon([System.Drawing.Bitmap]$sourceBitmap, [System.Drawing.Rectangle]$bounds, [string]$name, [int]$size, [double]$scale) {
  $path = [System.IO.Path]::Combine($iconsDir, $name)
  $canvas = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(255, 238, 249, 255), [System.Drawing.Color]::FromArgb(255, 255, 249, 232), 45)
  $graphics.FillRectangle($brush, $rect)
  $brush.Dispose()

  $sourceRatio = [double]$bounds.Width / [double]$bounds.Height
  $targetMax = [Math]::Floor($size * $scale)
  if ($sourceRatio -ge 1) {
    $drawWidth = $targetMax
    $drawHeight = [Math]::Floor($drawWidth / $sourceRatio)
  } else {
    $drawHeight = $targetMax
    $drawWidth = [Math]::Floor($drawHeight * $sourceRatio)
  }

  $drawX = [Math]::Floor(($size - $drawWidth) / 2)
  $drawY = [Math]::Floor(($size - $drawHeight) / 2)
  $dest = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawWidth, $drawHeight)
  $graphics.DrawImage($sourceBitmap, $dest, $bounds, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.Dispose()
  $canvas.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Dispose()
}

$bitmap = [System.Drawing.Bitmap]::FromFile($source)
try {
  $bounds = Get-ContentBounds $bitmap
  Save-Icon $bitmap $bounds 'favicon.png' 64 0.88
  Save-Icon $bitmap $bounds 'apple-touch-icon.png' 180 0.88
  Save-Icon $bitmap $bounds 'pwa-192x192.png' 192 0.92
  Save-Icon $bitmap $bounds 'pwa-512x512.png' 512 0.92
  Save-Icon $bitmap $bounds 'pwa-maskable-192x192.png' 192 0.72
  Save-Icon $bitmap $bounds 'pwa-maskable-512x512.png' 512 0.72
  Copy-Item -LiteralPath ([System.IO.Path]::Combine($iconsDir, 'pwa-192x192.png')) -Destination ([System.IO.Path]::Combine($iconsDir, 'jls-icon-192.png')) -Force
  Copy-Item -LiteralPath ([System.IO.Path]::Combine($iconsDir, 'pwa-512x512.png')) -Destination ([System.IO.Path]::Combine($iconsDir, 'jls-icon-512.png')) -Force
  Copy-Item -LiteralPath ([System.IO.Path]::Combine($iconsDir, 'pwa-maskable-512x512.png')) -Destination ([System.IO.Path]::Combine($iconsDir, 'jls-maskable-512.png')) -Force
} finally {
  $bitmap.Dispose()
}
`;

const psPath = path.join(os.tmpdir(), `jls-generate-icons-${Date.now()}.ps1`);
fs.writeFileSync(psPath, psScript, 'utf8');

try {
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    fail(`Icon generation failed with exit code ${result.status ?? 'unknown'}.`);
  }
} finally {
  fs.rmSync(psPath, { force: true });
}

for (const [fileName, expectedSize] of iconTargets) {
  const iconPath = path.join(iconsDir, fileName);
  if (!fs.existsSync(iconPath)) {
    fail(`Missing generated icon: ${fileName}`);
  }

  const size = readPngSize(iconPath);
  if (size.width !== expectedSize || size.height !== expectedSize) {
    fail(`Invalid ${fileName}: expected ${expectedSize}x${expectedSize}, got ${size.width}x${size.height}.`);
  }
}

console.log('Generated JLS PWA icons successfully.');
for (const [fileName, expectedSize] of iconTargets) {
  console.log(`- ${fileName}: ${expectedSize}x${expectedSize}`);
}