# Read version from version.json
$json = Get-Content -Raw -Path version.json | ConvertFrom-Json
$version = $json.version

if (-not $version) {
    Write-Host "[X] Cannot read version from version.json" -ForegroundColor Red
    exit 1
}

Write-Host "[*] Preparing to push and create tag for version: $version" -ForegroundColor Cyan

# Add files to Git
git add .
git commit -m "Release version $version"

# Push code
Write-Host "[*] Pushing code..."
git push

# Create and push tag
Write-Host "[*] Creating Tag: $version..."
git tag -a "$version" -m "Release version $version"
git push origin "$version"

Write-Host "[V] Successfully pushed code and tag $version!" -ForegroundColor Green