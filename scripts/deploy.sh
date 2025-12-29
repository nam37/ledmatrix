#!/bin/bash
# Deployment script for LED Matrix Controller
# Run on Raspberry Pi to update and restart the application

set -e

echo "🚀 LED Matrix Controller - Deployment Script"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Pull latest changes
echo ""
echo "📦 Pulling latest changes from git..."
git pull

# Install dependencies if package.json changed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo ""
    echo "📥 package.json changed, installing dependencies..."
    npm install
else
    echo ""
    echo "✓ No dependency changes detected"
fi

# Build TypeScript
echo ""
echo "🔨 Building TypeScript..."
npm run build

# Check if systemd service exists
if systemctl list-unit-files | grep -q "led-matrix.service"; then
    echo ""
    echo "🔄 Restarting systemd service..."
    sudo systemctl restart led-matrix
    echo "✓ Service restarted"

    echo ""
    echo "📊 Service status:"
    sudo systemctl status led-matrix --no-pager -l
else
    echo ""
    echo "⚠️  Systemd service not found"
    echo "Run manually with: sudo npm run start:sudo"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Access dashboard at: http://$(hostname -I | awk '{print $1}'):3000"
