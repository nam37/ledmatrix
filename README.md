# LED Matrix Controller

A web-based controller for HUB75 RGB LED matrices using Raspberry Pi 4, built with HTMX, Hono, and Node.js.

## Hardware

- **Raspberry Pi 4** (4GB/8GB/16GB)
- **Adafruit Triple RGB Matrix Bonnet** for Raspberry Pi
- **3× 64×64 RGB LED Matrix panels** (2.5mm pitch, 1/32 scan)
- **5V 15A power supply** for LED panels
- **27W USB-C power supply** for Raspberry Pi

**Total Display Size:** 64 pixels tall × 192 pixels wide

## Features

- 🕐 **Clock Mode** - Display current time
- 💬 **Text Mode** - Show custom text messages
- 🌤️ **Weather Mode** - Weather display (coming soon)
- 🎨 **Brightness Control** - Adjust LED brightness
- 📱 **Web Dashboard** - Control via any browser on your network
- ⚡ **HTMX-Powered** - Reactive UI without heavy JavaScript

## Technology Stack

- **Backend:** [Hono](https://hono.dev/) - Ultrafast web framework
- **Frontend:** [HTMX](https://htmx.org/) - Dynamic HTML without complex JavaScript
- **LED Driver:** [rpi-led-matrix](https://github.com/alexeden/rpi-led-matrix) - Node.js bindings for HUB75 matrices
- **Language:** TypeScript

## Prerequisites

### On Raspberry Pi

1. **Install the rpi-rgb-led-matrix C++ library:**

```bash
cd ~
git clone https://github.com/hzeller/rpi-rgb-led-matrix
cd rpi-rgb-led-matrix
make -j4
```

2. **Install Node.js 18+ (if not already installed):**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Installation

### Clone the Repository

```bash
cd ~
git clone https://github.com/nam37/ledmatrix.git
cd ledmatrix
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if you need to change default settings:

```bash
nano .env
```

Default configuration (works for 3× 64×64 panels chained horizontally):
```env
MATRIX_ROWS=64
MATRIX_COLS=64
MATRIX_CHAIN=3
MATRIX_GPIO_MAPPING=regular
MATRIX_GPIO_SLOWDOWN=5
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build TypeScript
npm run build

# Run with sudo (required for GPIO access)
sudo npm run start:sudo
```

### Access the Dashboard

Open your browser and navigate to:
```
http://raspberrypi.local:3000
```

Or use the Pi's IP address:
```
http://192.168.4.137:3000
```

## Hardware Setup

See [HARDWARE.md](./HARDWARE.md) for detailed wiring instructions.

**Quick Setup:**

1. **Power OFF** both Pi and LED panels
2. Install the Adafruit Triple RGB Matrix Bonnet on the Pi
3. Connect HUB75 ribbon cables (daisy-chain):
   - Bonnet Port 1 → Panel 1 INPUT
   - Panel 1 OUTPUT → Panel 2 INPUT
   - Panel 2 OUTPUT → Panel 3 INPUT
4. Connect power:
   - LED panels → 5V 15A supply via power distribution bus
   - Raspberry Pi → 27W USB-C supply
5. Power ON panels first, then Pi

## Project Structure

```
ledmatrix/
├── src/
│   ├── server.ts              # Main Hono server
│   ├── matrix/
│   │   ├── MatrixController.ts  # LED control logic
│   │   └── config.ts            # Hardware configuration
│   ├── routes/
│   │   ├── api.ts              # API endpoints
│   │   └── pages.ts            # HTML pages
│   └── views/
│       ├── layout.ts           # Base layout
│       └── dashboard.ts        # Dashboard UI
├── public/
│   └── styles.css              # Stylesheets
├── .env.example                # Environment template
└── package.json
```

## API Endpoints

### GET `/`
Main dashboard page

### GET `/api/status`
Get current display status (JSON)

### POST `/api/mode`
Change display mode
```json
{ "mode": "clock" | "text" | "weather" | "off" }
```

### POST `/api/text`
Update display text
```
text=Hello World
```

### POST `/api/brightness`
Set brightness (0-100)
```
brightness=80
```

## Troubleshooting

### Panel doesn't light up
- Verify GPIO mapping: `--led-gpio-mapping=regular`
- Try different slowdown values: 4, 5, or 6
- Check power connections

### Flickering display
- Increase `MATRIX_GPIO_SLOWDOWN` in `.env`
- Reduce brightness

### Permission errors
- Always run with `sudo` for GPIO access
- Check that user is in `gpio` group

### Only first panel works
- Verify `MATRIX_CHAIN=3` in `.env`
- Check HUB75 ribbon cable connections

## Development

### Add New Display Mode

1. Create mode in `src/matrix/MatrixController.ts`
2. Add route handler in `src/routes/api.ts`
3. Add UI button in `src/views/dashboard.ts`

### Watch Mode

```bash
npm run dev
```

Changes to TypeScript files will auto-reload.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT

## Acknowledgments

- [hzeller/rpi-rgb-led-matrix](https://github.com/hzeller/rpi-rgb-led-matrix) - Excellent C++ library
- [alexeden/rpi-led-matrix](https://github.com/alexeden/rpi-led-matrix) - Node.js bindings
- [Hono](https://hono.dev/) - Fast web framework
- [HTMX](https://htmx.org/) - HTML-driven interactivity
