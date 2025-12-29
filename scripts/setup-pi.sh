#!/bin/bash
# Initial setup script for Raspberry Pi
# Run this once on a fresh Pi to install all prerequisites

set -e

echo "🎨 LED Matrix Controller - Pi Setup Script"
echo "==========================================="
echo ""
echo "This script will install:"
echo "  - rpi-rgb-led-matrix C++ library"
echo "  - Node.js 20.x"
echo "  - Build tools and dependencies"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Update system
echo ""
echo "📦 Updating system packages..."
sudo apt update

# Install build tools
echo ""
echo "🔧 Installing build tools..."
sudo apt install -y git build-essential

# Install Node.js 20.x if not present
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    echo ""
    echo "📥 Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo ""
    echo "✓ Node.js already installed: $(node -v)"
fi

# Clone and build rpi-rgb-led-matrix if not present
if [ ! -d "$HOME/rpi-rgb-led-matrix" ]; then
    echo ""
    echo "📥 Cloning rpi-rgb-led-matrix library..."
    cd ~
    git clone https://github.com/hzeller/rpi-rgb-led-matrix
    cd rpi-rgb-led-matrix

    echo ""
    echo "🔨 Building rpi-rgb-led-matrix (this may take a few minutes)..."
    make -j4
else
    echo ""
    echo "✓ rpi-rgb-led-matrix already installed"
fi

# Return to home directory
cd ~

echo ""
echo "✅ Pi setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone your project: git clone https://github.com/nam37/ledmatrix.git"
echo "  2. cd ledmatrix"
echo "  3. npm install"
echo "  4. cp .env.example .env"
echo "  5. sudo npm run start:sudo"
echo ""
echo "Make sure your hardware is connected before starting!"
