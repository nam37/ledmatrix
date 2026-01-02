# PowerShell deployment script for LED Matrix Controller to Raspberry Pi
# Run this from Windows

$PI_USER = "nam037"
$PI_HOST = "192.168.4.138"
$PI_PASSWORD = "trinsic1"

Write-Host "🚀 Deploying LED Matrix Controller to Raspberry Pi..." -ForegroundColor Green
Write-Host "   Target: $PI_USER@$PI_HOST" -ForegroundColor Cyan
Write-Host ""

# Create deployment script content
$deployScript = @'
set -e

echo "📦 Step 1: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "   ✓ Node.js already installed: $(node --version)"
fi

echo ""
echo "🔧 Step 2: Installing build dependencies..."
sudo apt-get update
sudo apt-get install -y build-essential python3-dev git

echo ""
echo "📥 Step 3: Cloning/updating repository..."
if [ -d "/home/nam037/ledmatrix" ]; then
    echo "   Repository exists, pulling latest changes..."
    cd /home/nam037/ledmatrix
    git pull origin main
else
    echo "   Cloning repository..."
    cd /home/nam037
    git clone https://github.com/nam37/ledmatrix.git
    cd ledmatrix
fi

echo ""
echo "📦 Step 4: Installing dependencies..."
npm install

echo ""
echo "⚙️  Step 5: Creating .env file..."
cat > .env << 'ENVEOF'
PORT=3000
NODE_ENV=production
ENVEOF

echo ""
echo "🔧 Step 6: Setting up systemd service..."
sudo tee /etc/systemd/system/ledmatrix.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=LED Matrix Controller
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/nam037/ledmatrix
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICEEOF

echo ""
echo "🔄 Step 7: Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable ledmatrix
sudo systemctl restart ledmatrix

echo ""
echo "📊 Step 8: Checking service status..."
sleep 2
sudo systemctl status ledmatrix --no-pager || true

echo ""
echo "✅ Deployment complete!"
echo "🌐 Access the dashboard at: http://192.168.4.138:3000"
echo ""
echo "Useful commands:"
echo "  View logs:    sudo journalctl -u ledmatrix -f"
echo "  Restart:      sudo systemctl restart ledmatrix"
echo "  Stop:         sudo systemctl stop ledmatrix"
echo "  Status:       sudo systemctl status ledmatrix"
'@

# Save script to temp file
$tempScript = [System.IO.Path]::GetTempFileName()
$deployScript | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "📤 Connecting to Raspberry Pi and deploying..." -ForegroundColor Yellow
Write-Host ""

# Use plink if available, otherwise show manual instructions
if (Get-Command plink -ErrorAction SilentlyContinue) {
    # Using PuTTY's plink
    Get-Content $tempScript | plink -pw $PI_PASSWORD $PI_USER@$PI_HOST
} else {
    Write-Host "⚠️  PuTTY (plink) not found. You have two options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Run the bash script using Git Bash or WSL" -ForegroundColor Cyan
    Write-Host "  bash deploy-to-pi.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Manually SSH and run these commands:" -ForegroundColor Cyan
    Write-Host "  ssh nam037@192.168.4.138" -ForegroundColor White
    Write-Host "  Password: trinsic1" -ForegroundColor White
    Write-Host ""
    Write-Host "Then copy and paste the deployment commands." -ForegroundColor Cyan
}

# Cleanup
Remove-Item $tempScript

Write-Host ""
Write-Host "🎉 Once deployment completes, visit:" -ForegroundColor Green
Write-Host "   http://192.168.4.138:3000" -ForegroundColor Cyan
