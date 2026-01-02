#!/bin/bash
# Deployment script for LED Matrix Controller to Raspberry Pi

set -e  # Exit on error

PI_USER="nam037"
PI_HOST="192.168.4.138"
PI_DIR="/home/nam037/ledmatrix"
REPO_URL="https://github.com/nam37/ledmatrix.git"

echo "🚀 Deploying LED Matrix Controller to Raspberry Pi..."
echo "   Target: $PI_USER@$PI_HOST"
echo ""

# SSH into Pi and run deployment commands
ssh $PI_USER@$PI_HOST << 'ENDSSH'
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
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
EOF

echo ""
echo "🔧 Step 6: Setting up systemd service..."
sudo tee /etc/systemd/system/ledmatrix.service > /dev/null << 'EOF'
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
EOF

echo ""
echo "🔄 Step 7: Enabling and starting service..."
sudo systemctl daemon-reload
sudo systemctl enable ledmatrix
sudo systemctl restart ledmatrix

echo ""
echo "📊 Step 8: Checking service status..."
sleep 2
sudo systemctl status ledmatrix --no-pager

echo ""
echo "✅ Deployment complete!"
echo "🌐 Access the dashboard at: http://192.168.4.138:3000"
echo ""
echo "Useful commands:"
echo "  View logs:    sudo journalctl -u ledmatrix -f"
echo "  Restart:      sudo systemctl restart ledmatrix"
echo "  Stop:         sudo systemctl stop ledmatrix"
echo "  Status:       sudo systemctl status ledmatrix"

ENDSSH

echo ""
echo "🎉 Done! Your LED Matrix Controller is now running on the Pi."
echo "🌐 Open http://192.168.4.138:3000 in your browser"
