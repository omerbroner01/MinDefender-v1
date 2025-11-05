<parameter name="content"># EmotionGuard HTTPS Setup Script for Windows
# This script automates the creation of trusted HTTPS certificates for mobile development

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  EmotionGuard - Mobile HTTPS Certificate Setup" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator (required for mkcert -install)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "The first-time CA installation requires admin rights." -ForegroundColor Yellow
    Write-Host "If mkcert is not yet installed, please run this script as Administrator." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Check if mkcert is installed
Write-Host "Step 1: Checking for mkcert..." -ForegroundColor Green
$mkcertPath = Get-Command mkcert -ErrorAction SilentlyContinue

if (-not $mkcertPath) {
    Write-Host "❌ mkcert is not installed" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install mkcert first:" -ForegroundColor Yellow
    Write-Host "  Option 1 - Chocolatey (recommended):" -ForegroundColor White
    Write-Host "    choco install mkcert" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Option 2 - Manual download:" -ForegroundColor White
    Write-Host "    1. Download from: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Cyan
    Write-Host "    2. Add to your PATH" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ mkcert found: $($mkcertPath.Source)" -ForegroundColor Green
Write-Host ""

# Step 2: Install local CA (if not already done)
Write-Host "Step 2: Installing local Certificate Authority..." -ForegroundColor Green

try {
    $output = & mkcert -install 2>&1
    Write-Host "✅ Local CA is installed" -ForegroundColor Green
    
    # Show CA location
    $caRoot = & mkcert -CAROOT
    Write-Host "📁 CA Root location: $caRoot" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "❌ Failed to install CA: $_" -ForegroundColor Red
    Write-Host "Try running this script as Administrator" -ForegroundColor Yellow
    exit 1
}

# Step 3: Get local IP address
Write-Host "Step 3: Detecting local IP address..." -ForegroundColor Green

$localIP = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $localIP) {
    Write-Host "Could not detect local IP address" -ForegroundColor Red
    Write-Host "Please run 'ipconfig' manually to find your local IP" -ForegroundColor Yellow
    exit 1
}

Write-Host "Local IP detected: $localIP" -ForegroundColor Green
Write-Host ""

# Step 4: Create certificates
Write-Host "Step 4: Generating HTTPS certificates..." -ForegroundColor Green

$certDir = Join-Path $PSScriptRoot "server\dev-https"

# Create directory if it doesn't exist
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir -Force | Out-Null
    Write-Host "📁 Created directory: $certDir" -ForegroundColor Cyan
}

# Change to cert directory
Push-Location $certDir

try {
    # Generate certificate for localhost and local IP
    Write-Host "🔐 Generating certificate for: localhost, 127.0.0.1, ::1, $localIP" -ForegroundColor Cyan
    
    & mkcert localhost 127.0.0.1 ::1 $localIP
    
    if ($LASTEXITCODE -ne 0) {
        throw "mkcert command failed with exit code $LASTEXITCODE"
    }
    
    # Find generated files (they have timestamp in name)
    $certFile = Get-ChildItem -Filter "localhost+*.pem" | Select-Object -First 1
    $keyFile = Get-ChildItem -Filter "localhost+*-key.pem" | Select-Object -First 1
    
    if (-not $certFile -or -not $keyFile) {
        throw "Generated certificate files not found"
    }
    
    # Rename to expected names
    if (Test-Path "cert.pem") { Remove-Item "cert.pem" -Force }
    if (Test-Path "key.pem") { Remove-Item "key.pem" -Force }
    
    Rename-Item $certFile.Name "cert.pem"
    Rename-Item $keyFile.Name "key.pem"
    
    Write-Host "✅ Certificates generated successfully!" -ForegroundColor Green
    Write-Host "   📄 cert.pem" -ForegroundColor Cyan
    Write-Host "   🔑 key.pem" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Failed to generate certificates: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

# Step 5: Instructions for mobile setup
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  ✅ HTTPS Certificates Ready!" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Start your dev server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "   You should see: 🔐 Using HTTPS (dev) with certs..." -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Trust the certificate on your phone:" -ForegroundColor White
Write-Host ""
Write-Host "   📱 iOS (iPhone/iPad):" -ForegroundColor Cyan
Write-Host "      a) Transfer the CA certificate to your phone" -ForegroundColor White
Write-Host "         Location: $caRoot\rootCA.pem" -ForegroundColor Gray
Write-Host "         Methods: AirDrop, Email, or iCloud Drive" -ForegroundColor Gray
Write-Host ""
Write-Host "      b) Install the profile:" -ForegroundColor White
Write-Host "         - Open rootCA.pem on your iPhone" -ForegroundColor Gray
Write-Host "         - Settings → Profile Downloaded → Install" -ForegroundColor Gray
Write-Host ""
Write-Host "      c) Enable full trust:" -ForegroundColor White
Write-Host "         - Settings → General → About → Certificate Trust Settings" -ForegroundColor Gray
Write-Host "         - Toggle ON for 'mkcert'" -ForegroundColor Gray
Write-Host ""

Write-Host "   📱 Android:" -ForegroundColor Cyan
Write-Host "      a) Transfer rootCA.pem to your phone" -ForegroundColor White
Write-Host "         Location: $caRoot\rootCA.pem" -ForegroundColor Gray
Write-Host ""
Write-Host "      b) Install:" -ForegroundColor White
Write-Host "         - Settings → Security → Install from storage" -ForegroundColor Gray
Write-Host "         - Select 'CA certificate'" -ForegroundColor Gray
Write-Host "         - Browse and select rootCA.pem" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Access from your phone:" -ForegroundColor White
Write-Host "   https://$localIP:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ⚠️  Make sure your phone is on the same WiFi network!" -ForegroundColor Yellow
Write-Host ""

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "  Alternative: Use a Tunnel (No phone setup needed)" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you don't want to install CA on your phone, use LocalTunnel:" -ForegroundColor White
Write-Host "   npm run tunnel:local" -ForegroundColor Cyan
Write-Host ""
Write-Host "This gives you a trusted HTTPS URL instantly!" -ForegroundColor Green
Write-Host ""

Write-Host "For detailed instructions, see: MOBILE_HTTPS_SETUP_GUIDE.md" -ForegroundColor Gray
Write-Host ""
