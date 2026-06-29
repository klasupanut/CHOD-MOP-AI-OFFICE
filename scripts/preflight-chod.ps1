param(
  [int]$Port = 3010,
  [string]$ProjectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path,
  [switch]$Repair
)

$ErrorActionPreference = "Stop"

function Write-Check([string]$Name, [bool]$Ok, [string]$Message) {
  $status = if ($Ok) { "OK" } else { "WARN" }
  Write-Host "[$status] $Name - $Message"
}

function Test-CommandExists([string]$Command) {
  return [bool](Get-Command $Command -ErrorAction SilentlyContinue)
}

$project = (Resolve-Path -LiteralPath $ProjectPath).Path
Set-Location -LiteralPath $project

Write-Host "[chod-preflight] Project: $project"
Write-Host "[chod-preflight] Port: $Port"

$packagePath = Join-Path $project "package.json"
if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "package.json not found at $packagePath"
}

$package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
$scripts = $package.scripts

Write-Check "npm" (Test-CommandExists "npm") "npm command availability"
Write-Check "package-lock" (Test-Path -LiteralPath (Join-Path $project "package-lock.json")) "npm lockfile should be kept"
Write-Check "no-pnpm-lock" (-not (Test-Path -LiteralPath (Join-Path $project "pnpm-lock.yaml"))) "pnpm lockfile should not be used"
Write-Check "no-yarn-lock" (-not (Test-Path -LiteralPath (Join-Path $project "yarn.lock"))) "yarn lockfile should not be used"

foreach ($scriptName in @("dev:chod", "dev:repair", "typecheck", "build", "preflight", "cleanup:test")) {
  $exists = [bool]($scripts.PSObject.Properties.Name -contains $scriptName)
  Write-Check "script:$scriptName" $exists "$(if ($exists) { $scripts.$scriptName } else { "missing" })"
}

$envPath = Join-Path $project ".env.local"
Write-Check ".env.local" (Test-Path -LiteralPath $envPath) "local environment file"
if (Test-Path -LiteralPath $envPath) {
  $envText = Get-Content -LiteralPath $envPath -Raw
  $authUrlLine = ($envText -split "`r?`n") | Where-Object { $_ -match "^(AUTH_URL|NEXTAUTH_URL)=" } | Select-Object -First 1
  $authUrlOk = if ($authUrlLine) { $authUrlLine -match "localhost:$Port|127\.0\.0\.1:$Port" } else { $false }
  Write-Check "auth-url-port" $authUrlOk ($(if ($authUrlLine) { $authUrlLine } else { "AUTH_URL/NEXTAUTH_URL missing" }))
}

$healthUrl = "http://localhost:$Port/api/health"
$healthReady = $false
try {
  $health = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 8
  $healthReady = $health.StatusCode -eq 200
  Write-Check "health" $healthReady "$healthUrl returned HTTP $($health.StatusCode)"
  if ($healthReady) {
    $json = $health.Content | ConvertFrom-Json
    Write-Host "[chod-preflight] health status: $($json.status)"
    foreach ($check in $json.checks) {
      Write-Check "health:$($check.label)" ([bool]$check.ok) $check.message
    }
  }
} catch {
  Write-Check "health" $false "$healthUrl failed: $($_.Exception.Message)"
}

if (-not $healthReady -and $Repair) {
  $repairScript = "C:\Users\User\.codex\skills\chod-local-dev-server\scripts\repair-chod-dev-server.ps1"
  if (-not (Test-Path -LiteralPath $repairScript)) {
    throw "Repair script missing: $repairScript"
  }
  Write-Host "[chod-preflight] running repair script"
  powershell -ExecutionPolicy Bypass -File $repairScript -Port $Port -HealthPath "/api/health"
}

Write-Host "[chod-preflight] done"
