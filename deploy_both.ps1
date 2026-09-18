param (
    [switch]$NoLaunch = $false
)

$apkPath = "android/app/build/outputs/apk/debug/CouplesVibe.apk"

Write-Host "==> Building CouplesVibe.apk..." -ForegroundColor Cyan
Push-Location "android"
java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleDebug
$buildStatus = $LASTEXITCODE
Pop-Location

if ($buildStatus -ne 0) {
    Write-Host "Build failed with exit code $buildStatus" -ForegroundColor Red
    exit $buildStatus
}

# Parse connected devices
$rawLines = adb devices
$devices = @()
foreach ($line in $rawLines) {
    if ($line -match "^\s*(\S+)\s+device\b") {
        $devices += $matches[1]
    }
}

if ($devices.Count -eq 0) {
    Write-Host "No active ADB devices found." -ForegroundColor Yellow
    exit 1
}

Write-Host "Detected $($devices.Count) active device(s):" -ForegroundColor Green
foreach ($d in $devices) {
    Write-Host "   -> $d" -ForegroundColor Gray
}

# Deploy to all devices
foreach ($dev in $devices) {
    Write-Host ""
    Write-Host "Installing to $dev..." -ForegroundColor Cyan
    adb -s $dev install -r -d $apkPath
    
    if (-not $NoLaunch) {
        Write-Host "Starting app on $dev..." -ForegroundColor Cyan
        adb -s $dev shell am start -n com.couples.vibe/.MainActivity
    }
}

Write-Host ""
Write-Host "Done! Successfully deployed to all devices." -ForegroundColor Green
