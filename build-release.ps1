param(
    [Parameter(Mandatory = $true)]
    [string]$JavaHome
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$buildConfig = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $projectRoot "build-config.json") | ConvertFrom-Json
$bundleSource = [IO.Path]::GetFullPath((Join-Path $projectRoot $buildConfig.bundle_directory))
$bundleDestination = Join-Path $projectRoot "android\app\src\main\assets\offline_bundle"
$androidDirectory = Join-Path $projectRoot "android"
$java = Join-Path $JavaHome "bin\java.exe"
$wrapper = Join-Path $androidDirectory "gradle\wrapper\gradle-wrapper.jar"
$dist = Join-Path $projectRoot "dist"
$separator = [IO.Path]::DirectorySeparatorChar

if (-not (Test-Path -LiteralPath $java)) {
    throw "Java executable not found: $java"
}
if (-not (Test-Path -LiteralPath (Join-Path $bundleSource "manifest.json"))) {
    throw "Search bundle is missing. Place a complete prepared bundle in the configured bundle directory."
}
$sourceManifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $bundleSource "manifest.json") | ConvertFrom-Json
if (-not $sourceManifest.notes_file) {
    throw "Complete notes are missing from the supplied search bundle."
}
if ($sourceManifest.global_vector_count -ne ($sourceManifest.note_count * $sourceManifest.languages.Count) -or
    ($sourceManifest.local_vector_count + $sourceManifest.global_vector_count) -ne $sourceManifest.count) {
    throw "Local/global embeddings are incomplete. Rebuild the search bundle."
}
foreach ($asset in $sourceManifest.files) {
    $assetPath = Join-Path $bundleSource $asset.path
    if (-not (Test-Path -LiteralPath $assetPath) -or
        (Get-FileHash -Algorithm SHA256 -LiteralPath $assetPath).Hash -ne $asset.sha256) {
        throw "Bundle asset is missing or changed: $($asset.path)"
    }
}
& node (Join-Path $projectRoot "tests\source-catalog.test.cjs")
if ($LASTEXITCODE -ne 0) {
    throw "Source catalog validation failed."
}
& node (Join-Path $projectRoot "tests\section-search.test.cjs")
if ($LASTEXITCODE -ne 0) {
    throw "Local/global search validation failed."
}
$resolvedDestination = [IO.Path]::GetFullPath($bundleDestination)
$resolvedAssets = [IO.Path]::GetFullPath((Join-Path $projectRoot "android\app\src\main\assets"))
if (-not $resolvedDestination.StartsWith(
    $resolvedAssets + $separator,
    [System.StringComparison]::OrdinalIgnoreCase
)) {
    throw "Bundle destination is outside Android assets."
}
if ((Test-Path -LiteralPath $resolvedDestination) -and
    ((Get-Item -LiteralPath $resolvedDestination -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Bundle destination is a reparse point."
}

if (Test-Path -LiteralPath $resolvedDestination) {
    Remove-Item -LiteralPath $resolvedDestination -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedDestination | Out-Null
Copy-Item -LiteralPath (Join-Path $bundleSource "manifest.json") -Destination $resolvedDestination
foreach ($asset in $sourceManifest.files) {
    $target = Join-Path $resolvedDestination $asset.path
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $bundleSource $asset.path) -Destination $target
}

$manifest = Get-Content -Raw -Encoding UTF8 -LiteralPath (Join-Path $resolvedDestination "manifest.json") |
    ConvertFrom-Json
Write-Host "Bundle: $($manifest.note_count) full notes, $($manifest.count) search records, $($manifest.dim)D, $($manifest.model_id)"

$env:JAVA_HOME = $JavaHome
$env:EXPO_NO_DOTENV = "1"
$env:NODE_ENV = "production"
Push-Location $androidDirectory
try {
    & $java -classpath $wrapper org.gradle.wrapper.GradleWrapperMain clean :app:assembleRelease :app:bundleRelease --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle release build failed."
    }
} finally {
    Pop-Location
}

$apk = Get-ChildItem -LiteralPath (Join-Path $androidDirectory "app\build\outputs\apk\release") -File -Filter "*.apk" -Recurse
$aab = Get-ChildItem -LiteralPath (Join-Path $androidDirectory "app\build\outputs\bundle\release") -File -Filter "*.aab" -Recurse
if ($apk.Count -ne 1 -or $aab.Count -ne 1) {
    throw "Expected exactly one release APK and one release AAB."
}

New-Item -ItemType Directory -Path $dist -Force | Out-Null
Copy-Item -LiteralPath $apk.FullName -Destination (Join-Path $dist "civil-defense-app-release-unsigned.apk") -Force
Copy-Item -LiteralPath $aab.FullName -Destination (Join-Path $dist "civil-defense-app-release-unsigned.aab") -Force
Get-ChildItem -LiteralPath $dist -File | ForEach-Object {
    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash
    Write-Host "$($_.FullName)  SHA-256=$hash"
}
