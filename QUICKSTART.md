# Quick Start Guide

Get your LED Matrix Controller running in minutes!

## Prerequisites Checklist

- ✅ Raspberry Pi 4 with Raspberry Pi OS installed
- ✅ Adafruit Triple RGB Matrix Bonnet installed on Pi
- ✅ 3× 64×64 LED panels connected (daisy-chained)
- ✅ 5V 15A power supply for panels
- ✅ 27W USB-C power supply for Pi
- ✅ Pi connected to your network (WiFi or Ethernet)

## Step 1: Initial Pi Setup (One-Time)

SSH into your Raspberry Pi:

```bash
ssh nam037@raspberrypi.local
# or
ssh nam037@192.168.4.137
```

Run the setup script:

```bash
cd ~
# Download the setup script
curl -o setup-pi.sh https://raw.githubusercontent.com/nam37/ledmatrix/main/scripts/setup-pi.sh
chmod +x setup-pi.sh
./setup-pi.sh
```

This installs:
- rpi-rgb-led-matrix C++ library
- Node.js 20.x
- Build tools

## Step 2: Clone and Install

```bash
cd ~
git clone https://github.com/nam37/ledmatrix.git
cd ledmatrix
npm install
```

## Step 3: Configure

```bash
cp .env.example .env
```

Default settings work for 3× 64×64 panels chained horizontally.

If you need to customize:

```bash
nano .env
```

## Step 4: Build

```bash
npm run build
```

## Step 5: Run

**IMPORTANT:** Must run with `sudo` for GPIO access!

```bash
sudo npm run start:sudo
```

You should see:

```
🚀 LED Matrix Controller starting on port 3000...
📱 Open http://localhost:3000 in your browser
Matrix initialized: { size: '64x192', mapping: 'regular' }
Matrix display loop started
```

## Step 6: Access Dashboard

From any device on your network, open a browser and go to:

```
http://raspberrypi.local:3000
```

Or use the Pi's IP address:

```
http://192.168.4.137:3000
```

## You Should See

The LED panels displaying a clock, and a web dashboard with:

- ✅ Current status
- ✅ Mode buttons (Clock, Text, Weather, Off)
- ✅ Custom text input
- ✅ Brightness slider

## Test the Dashboard

1. **Change to Text mode** - Click the "💬 Text" button
2. **Enter custom text** - Type something in the text field and click "Update Text"
3. **Adjust brightness** - Use the slider and click "Set Brightness"
4. **Return to clock** - Click "🕐 Clock"

## Optional: Auto-Start on Boot

To make the LED controller start automatically when the Pi boots:

```bash
cd ~/ledmatrix
sudo cp led-matrix.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable led-matrix
sudo systemctl start led-matrix
```

Check status:

```bash
sudo systemctl status led-matrix
```

Stop the service:

```bash
sudo systemctl stop led-matrix
```

View logs:

```bash
sudo journalctl -u led-matrix -f
```

## Common Issues

### "Cannot find module 'rpi-led-matrix'"

You're not on a Raspberry Pi, or the native module didn't compile.

**Solution:** This project must run on a Raspberry Pi with the rpi-rgb-led-matrix library installed.

### "Permission denied" or "GPIO access failed"

Not running with sudo.

**Solution:**

```bash
sudo npm run start:sudo
```

### Panels don't light up

**Check:**
1. Panel power supply is plugged in and switched on
2. HUB75 cables are firmly connected
3. Software is running (check terminal output)

**Try different GPIO slowdown:**

Edit `.env`:

```env
MATRIX_GPIO_SLOWDOWN=6
```

Restart the app.

### Flickering display

**Solution:** Increase slowdown or reduce brightness

```env
MATRIX_GPIO_SLOWDOWN=6
MATRIX_BRIGHTNESS=60
```

### Only first panel works

**Check `.env` has:**

```env
MATRIX_CHAIN=3
```

**Verify** ribbon cables connect OUTPUT → INPUT between panels.

### Can't access dashboard from browser

**Check:**
1. Pi is on the network: `ping raspberrypi.local`
2. App is running: Look for "starting on port 3000" in terminal
3. Firewall not blocking: `sudo ufw status`

**Try Pi's IP directly:**

```bash
# On Pi, get IP address:
hostname -I

# On your computer, browse to:
http://192.168.4.137:3000
```

## Development Mode

For active development with auto-reload:

```bash
npm run dev
```

This watches for TypeScript changes and restarts automatically.

**Note:** Still requires `sudo` for actual LED control, but you can test the web interface without hardware.

## Updating

When you make changes and push to GitHub:

```bash
cd ~/ledmatrix
./scripts/deploy.sh
```

This:
1. Pulls latest code
2. Installs dependencies if needed
3. Rebuilds TypeScript
4. Restarts the service

## Next Steps

- Add weather API integration
- Create custom display modes
- Add animations
- Build mobile-responsive dashboard
- Add scheduling (show clock during day, turn off at night)

## Support

- **Hardware Issues:** See [HARDWARE.md](./HARDWARE.md)
- **GitHub Issues:** https://github.com/nam37/ledmatrix/issues
- **Reference Docs:** See [README.md](./README.md)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development mode with auto-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `sudo npm run start:sudo` | Run the app with GPIO access |
| `./scripts/deploy.sh` | Update from git and restart |
| `sudo systemctl status led-matrix` | Check service status |
| `sudo journalctl -u led-matrix -f` | View live logs |

---

**🎉 Congratulations!** Your LED matrix controller is running!
