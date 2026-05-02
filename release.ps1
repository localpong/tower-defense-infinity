$gitStatus = git status --porcelain

if (-not $gitStatus) {
    Write-Host "[!] No changes detected. Skipping commit and push." -ForegroundColor Yellow
    exit 0
}

# ตรวจสอบว่ามีการแก้ไขไฟล์ในโฟลเดอร์ app (Android) หรือไม่
$androidChanged = ($gitStatus | Select-String -Pattern "(^|\s)app/").Length -gt 0

# Read version from version.json
$jsonPath = "version.json"
$json = Get-Content -Raw -Path $jsonPath | ConvertFrom-Json
$currentVersion = $json.version

if (-not $currentVersion) {
    Write-Host "[X] Cannot read version from version.json" -ForegroundColor Red
    exit 1
}

# Auto-increment Patch Version (e.g., 1.2.4 -> 1.2.5)
$versionParts = $currentVersion.Split('.')
if ($versionParts.Length -eq 3) {
    $versionParts[2] = ([int]$versionParts[2] + 1).ToString()
    $version = $versionParts -join '.'
    $json.version = $version
    $json | ConvertTo-Json | Set-Content -Path $jsonPath
    Write-Host "[*] Auto-incremented version: $currentVersion -> $version" -ForegroundColor Green
} else {
    $version = $currentVersion
}

Write-Host "[*] Preparing to push code for version: $version" -ForegroundColor Cyan

# Add files to Git
git add .
git commit -m "Release version $version"

# Push code
Write-Host "[*] Pushing code..."
git push

if ($androidChanged) {
    # Create and push tag
    Write-Host "[*] Creating Tag: $version..."
    git tag -a "$version" -m "Release version $version"
    git push origin "$version"
    
    Write-Host "[V] Successfully pushed code and tag $version!" -ForegroundColor Green
} else {
    Write-Host "[*] No changes in Android (app/). Skipping tag creation." -ForegroundColor Yellow
    Write-Host "[V] Successfully pushed code!" -ForegroundColor Green
}