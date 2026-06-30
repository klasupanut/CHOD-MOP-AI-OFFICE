param(
  [string]$OutputPath = "docs\chod-mop-office-production-infographic.png"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-Brush([string]$hex, [int]$alpha = 255) {
  $hex = $hex.TrimStart("#")
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
}

function New-Pen([string]$hex, [float]$width = 1, [int]$alpha = 255) {
  $hex = $hex.TrimStart("#")
  $r = [Convert]::ToInt32($hex.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($hex.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($hex.Substring(4, 2), 16)
  return [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb($alpha, $r, $g, $b), $width)
}

function Draw-Text($g, [string]$text, [float]$x, [float]$y, [float]$w, [float]$h, $font, $brush, [string]$align = "Near") {
  $sf = [System.Drawing.StringFormat]::new()
  $sf.Alignment = [System.Drawing.StringAlignment]::$align
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Near
  $sf.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $g.DrawString($text, $font, $brush, [System.Drawing.RectangleF]::new($x, $y, $w, $h), $sf)
  $sf.Dispose()
}

function Draw-RoundRect($g, [float]$x, [float]$y, [float]$w, [float]$h, [float]$r, $fill, $stroke = $null) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  if ($fill) { $g.FillPath($fill, $path) }
  if ($stroke) { $g.DrawPath($stroke, $path) }
  $path.Dispose()
}

function Draw-Card($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$title, [string[]]$lines, [string]$accent = "#00D4FF") {
  Draw-RoundRect $g $x $y $w $h 22 (New-Brush "#071A2C" 230) (New-Pen "#145177" 1.5 220)
  $g.FillRectangle((New-Brush $accent 210), $x, $y, 7, $h)
  Draw-Text $g $title ($x + 24) ($y + 20) ($w - 42) 34 $script:fontCardTitle $script:brushWhite
  $yy = $y + 64
  foreach ($line in $lines) {
    $g.FillEllipse((New-Brush $accent 200), $x + 27, $yy + 9, 8, 8)
    Draw-Text $g $line ($x + 46) $yy ($w - 66) 32 $script:fontBody $script:brushMuted
    $yy += 33
  }
}

function Draw-Pill($g, [float]$x, [float]$y, [float]$w, [float]$h, [string]$text, [string]$accent = "#00D4FF") {
  Draw-RoundRect $g $x $y $w $h 18 (New-Brush "#06233A" 235) (New-Pen $accent 1.2 230)
  Draw-Text $g $text ($x + 14) ($y + 9) ($w - 28) ($h - 12) $script:fontSmall $script:brushWhite "Center"
}

function Draw-Arrow($g, [float]$x1, [float]$y1, [float]$x2, [float]$y2, [string]$color = "#20D7FF") {
  $pen = New-Pen $color 4 220
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $g.DrawLine($pen, $x1, $y1, $x2, $y2)
  $pen.Dispose()
}

$root = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$output = Join-Path $root.Path $OutputPath
$outputDir = Split-Path -Parent $output
if (-not (Test-Path -LiteralPath $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

$width = 1920
$height = 1080
$bmp = [System.Drawing.Bitmap]::new($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.Clear([System.Drawing.Color]::FromArgb(3, 12, 24))

$bgRect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
$bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bgRect, [System.Drawing.Color]::FromArgb(4, 14, 29), [System.Drawing.Color]::FromArgb(5, 33, 55), 35)
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()

for ($i = 0; $i -lt 90; $i++) {
  $x = (Get-Random -Minimum 0 -Maximum $width)
  $y = (Get-Random -Minimum 0 -Maximum $height)
  $a = (Get-Random -Minimum 35 -Maximum 120)
  $g.FillEllipse((New-Brush "#00D4FF" $a), $x, $y, 2, 2)
}

$script:fontHero = [System.Drawing.Font]::new("Segoe UI", 48, [System.Drawing.FontStyle]::Bold)
$script:fontSub = [System.Drawing.Font]::new("Segoe UI", 20, [System.Drawing.FontStyle]::Regular)
$script:fontSection = [System.Drawing.Font]::new("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
$script:fontCardTitle = [System.Drawing.Font]::new("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$script:fontBody = [System.Drawing.Font]::new("Segoe UI", 15, [System.Drawing.FontStyle]::Regular)
$script:fontSmall = [System.Drawing.Font]::new("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$script:fontTiny = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)
$script:brushWhite = New-Brush "#FFFFFF"
$script:brushCyan = New-Brush "#00D4FF"
$script:brushMuted = New-Brush "#A7BED1"
$script:brushGreen = New-Brush "#61F2A5"
$script:brushWarn = New-Brush "#FFBA3A"

$logoPath = Join-Path $root.Path "public\brand\logo.png"
if (Test-Path -LiteralPath $logoPath) {
  $logo = [System.Drawing.Image]::FromFile($logoPath)
  $targetH = 54
  $targetW = [int]($logo.Width * ($targetH / $logo.Height))
  $g.DrawImage($logo, 64, 56, $targetW, $targetH)
  $logo.Dispose()
  Draw-Text $g "MOP OFFICE" (86 + $targetW) 48 560 68 $script:fontHero $script:brushWhite
} else {
  Draw-Text $g "CHOD MOP OFFICE" 64 48 720 68 $script:fontHero $script:brushWhite
}

Draw-Text $g "Production Architecture + Live Sync + Current Cost Snapshot" 66 126 900 36 $script:fontSub $script:brushMuted
Draw-Text $g "As of current deployment: Vercel production + Google Sheets / Apps Script live data. Supabase and AI remain prepared but not active." 66 160 1220 30 $script:fontTiny $script:brushMuted

Draw-Pill $g 1372 62 438 42 "LIVE: https://chod-mop-ai-office.vercel.app" "#61F2A5"
Draw-Pill $g 1320 114 490 42 'COST NOW: $0 / FREE-TIER ARCHITECTURE' "#00D4FF"

# Main flow
Draw-RoundRect $g 70 220 1780 210 28 (New-Brush "#061729" 210) (New-Pen "#1C6B91" 1.5 220)
Draw-Text $g "HOW PRODUCTION WORKS" 100 246 500 34 $script:fontSection $script:brushWhite

Draw-Card $g 110 302 300 92 "Users" @("Open browser", "Sign in with Google") "#00D4FF"
Draw-Card $g 480 302 300 92 "Vercel App" @("Next.js production", "Auth.js / route handlers") "#7EE3FF"
Draw-Card $g 850 302 300 92 "Google Backend" @("Sheets live data", "Apps Script + Drive flow") "#61F2A5"
Draw-Card $g 1220 302 300 92 "CHOD Modules" @("Office / Dashboard", "Tasks / Projects / Quotes") "#00D4FF"
Draw-Card $g 1590 302 220 92 "Output" @("Approval", "Sign link / PDF") "#FFBA3A"
Draw-Arrow $g 415 348 475 348
Draw-Arrow $g 785 348 845 348
Draw-Arrow $g 1155 348 1215 348
Draw-Arrow $g 1525 348 1585 348 "#FFBA3A"

# Modules
Draw-Text $g "WHAT THE WEBAPP CAN DO NOW" 84 470 680 34 $script:fontSection $script:brushWhite
Draw-Card $g 70 520 420 170 "Live Modules" @(
  "Office uses live summary",
  "Dashboard uses live KPIs",
  "Tasks + Projects write to Sheet",
  "Reads FIT-OUT / RESTORATION"
) "#00D4FF"

Draw-Card $g 520 520 420 170 "Quotation + Approval" @(
  "Quotation syncs with Sheet",
  "Internal approval is separate",
  "Apps Script handles PDF / Drive",
  "OTP + sign-link tested"
) "#61F2A5"

Draw-Card $g 970 520 420 170 "Access + Control" @(
  "Google Sign-In is primary login",
  "Approved user list controls access",
  "Character mapping in Settings",
  "Notifications link to related menus"
) "#7EE3FF"

Draw-Card $g 1420 520 430 170 "Prepared, Not Active" @(
  "Supabase disabled in production",
  "AI HQ hidden/mock: no OpenAI spend",
  "Microsoft login prepared but not used",
  "Future connectors are kept ready"
) "#8797FF"

# Data sources
Draw-Text $g "DATA SOURCES" 84 728 300 34 $script:fontSection $script:brushWhite
Draw-RoundRect $g 70 778 850 160 24 (New-Brush "#071A2C" 230) (New-Pen "#145177" 1.5 220)
Draw-Pill $g 100 812 230 40 "Users Sheet" "#00D4FF"
Draw-Pill $g 350 812 250 40 "Tasks + Projects Sheet" "#00D4FF"
Draw-Pill $g 620 812 260 40 "Quotations Sheet" "#00D4FF"
Draw-Pill $g 100 870 230 40 "FIT-OUT Sheet" "#61F2A5"
Draw-Pill $g 350 870 250 40 "RESTORATION Sheet" "#61F2A5"
Draw-Pill $g 620 870 260 40 "Apps Script + Drive" "#FFBA3A"

# Cost
Draw-Text $g "CURRENT COST STATUS" 970 728 520 34 $script:fontSection $script:brushWhite
Draw-RoundRect $g 960 778 890 160 24 (New-Brush "#071A2C" 230) (New-Pen "#145177" 1.5 220)
$costItems = @(
  @("Vercel hosting", '$0 now', "Free-tier architecture; monitor traffic limits."),
  @("Sheets / OAuth / Apps Script", '$0 now', "No billing needed for current MVP usage."),
  @("Supabase", '$0 now', "Disabled in production, so no active Supabase cost."),
  @("OpenAI / AI HQ", '$0 now', "AI mode is mock/hidden, so no API token spend.")
)
$cx = 994
$cy = 810
foreach ($item in $costItems) {
  Draw-Text $g $item[0] $cx $cy 260 24 $script:fontSmall $script:brushWhite
  Draw-Text $g $item[1] ($cx + 280) $cy 110 24 $script:fontSmall $script:brushGreen
  Draw-Text $g $item[2] ($cx + 400) $cy 430 24 $script:fontTiny $script:brushMuted
  $cy += 30
}

Draw-RoundRect $g 70 972 1780 54 18 (New-Brush "#04101E" 230) (New-Pen "#145177" 1.2 180)
Draw-Text $g "Cost guardrail: if a future feature requires paid usage, billing, custom SMS, higher Vercel/Supabase tier, or paid AI API, report and ask approval before enabling." 96 988 1680 26 $script:fontBody $script:brushWarn

$bmp.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $output
