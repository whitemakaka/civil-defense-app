# build-release.ps1
# Builds release APK with fresh offline bundle

$ErrorActionPreference = "Stop"

# Paths
$projectRoot = $PSScriptRoot
$bundleSource = "$projectRoot\public\assets\offline_bundle"
$bundleDest = "$projectRoot\android\app\src\main\assets\offline_bundle"
$androidDir = "$projectRoot\android"
$apkOutput = "$androidDir\app\build\outputs\apk\release\civil-defense-app-release.apk"

# JAVA_HOME (Android Studio JBR)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path

Write-Host "=== Civil Defense App - Release Build ===" -ForegroundColor Cyan

# Step 1: Copy bundle
Write-Host "`n[1/4] Copying offline bundle..." -ForegroundColor Yellow
if (Test-Path $bundleSource) {
    if (Test-Path $bundleDest) {
        Remove-Item -Recurse -Force "$bundleDest\*"
    } else {
        New-Item -ItemType Directory -Path $bundleDest -Force | Out-Null
    }
    Copy-Item -Recurse -Force "$bundleSource\*" $bundleDest
    Write-Host "      Bundle copied from: $bundleSource" -ForegroundColor Green
} else {
    Write-Host "      ERROR: Bundle source not found: $bundleSource" -ForegroundColor Red
    exit 1
}

# Step 2: Verify bundle
Write-Host "`n[2/4] Verifying bundle..." -ForegroundColor Yellow
$manifest = "$bundleDest\manifest.json"
if (Test-Path $manifest) {
    $json = Get-Content $manifest | ConvertFrom-Json
    Write-Host "      Schema: $($json.schema_version), Records: $($json.count), Dim: $($json.dim)" -ForegroundColor Green
} else {
    Write-Host "      ERROR: manifest.json not found" -ForegroundColor Red
    exit 1
}

# Step 3: Clean and build
Write-Host "`n[3/4] Building release APK (clean + assembleRelease)..." -ForegroundColor Yellow
Set-Location $androidDir
& .\gradlew clean :app:assembleRelease --rerun-tasks -q

if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Build failed" -ForegroundColor Red
    exit 1
}

# Step 4: Done
Write-Host "`n[4/4] Build complete!" -ForegroundColor Yellow
if (Test-Path $apkOutput) {
    $size = [math]::Round((Get-Item $apkOutput).Length / 1MB, 1)
    Write-Host "      APK: $apkOutput" -ForegroundColor Green
    Write-Host "      Size: ${size} MB" -ForegroundColor Green
} else {
    Write-Host "      ERROR: APK not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
