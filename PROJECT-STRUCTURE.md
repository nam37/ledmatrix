# Project Structure

Complete file tree and description of the LED Matrix Controller project.

## File Tree

```
ledmatrix/
│
├── src/                          # TypeScript source code
│   ├── server.ts                 # Main Hono server entry point
│   │
│   ├── matrix/                   # LED matrix control layer
│   │   ├── MatrixController.ts   # Core display logic & modes
│   │   └── config.ts             # Hardware configuration loader
│   │
│   ├── routes/                   # HTTP route handlers
│   │   ├── api.ts                # REST API endpoints
│   │   └── pages.ts              # HTML page routes
│   │
│   └── views/                    # HTML templates (using hono/html)
│       ├── layout.ts             # Base page layout
│       └── dashboard.ts          # Main dashboard UI
│
├── public/                       # Static assets
│   └── styles.css                # CSS stylesheet
│
├── scripts/                      # Utility scripts
│   ├── deploy.sh                 # Deployment automation
│   └── setup-pi.sh               # Pi initial setup
│
├── dist/                         # Compiled JavaScript (gitignored)
│   └── *.js                      # TypeScript build output
│
├── node_modules/                 # Dependencies (gitignored)
│
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore rules
│
├── package.json                  # Node.js dependencies & scripts
├── package-lock.json             # Dependency lock file
├── tsconfig.json                 # TypeScript compiler config
│
├── led-matrix.service            # systemd service definition
│
├── README.md                     # Main documentation
├── HARDWARE.md                   # Hardware setup guide
├── QUICKSTART.md                 # Quick start instructions
└── PROJECT-STRUCTURE.md          # This file
```

## File Descriptions

### Core Application Files

#### `src/server.ts`
- Main application entry point
- Initializes Hono web server
- Creates MatrixController instance
- Sets up routes and static file serving
- Handles graceful shutdown

#### `src/matrix/MatrixController.ts`
- Encapsulates all LED matrix operations
- Manages display state (mode, text, brightness)
- Implements display modes:
  - Clock mode (real-time clock display)
  - Text mode (custom message)
  - Weather mode (placeholder)
  - Off mode (blank display)
- Runs continuous update loop (10 Hz)

#### `src/matrix/config.ts`
- Loads configuration from environment variables
- Provides typed configuration objects
- Sets hardware parameters:
  - Matrix dimensions (rows, cols)
  - Chain/parallel configuration
  - GPIO mapping
  - Timing parameters

### Route Handlers

#### `src/routes/api.ts`
- REST API endpoints:
  - `GET /api/status` - Current display state
  - `POST /api/mode` - Change display mode
  - `POST /api/text` - Update display text
  - `POST /api/brightness` - Set brightness
- Returns HTML fragments for HTMX

#### `src/routes/pages.ts`
- HTML page routes:
  - `GET /` - Main dashboard page
- Renders complete HTML pages using templates

### View Templates

#### `src/views/layout.ts`
- Base HTML structure
- Includes HTMX script
- Links to stylesheet
- Provides consistent header/footer

#### `src/views/dashboard.ts`
- Main control panel UI
- Status display (auto-refreshing)
- Mode selection buttons
- Text input form
- Brightness slider

### Static Assets

#### `public/styles.css`
- Modern, clean design
- Responsive grid layout
- Card-based UI components
- Button styles and interactions
- Form styling
- Mobile-responsive (< 768px breakpoints)

### Scripts

#### `scripts/setup-pi.sh`
- One-time Raspberry Pi setup
- Installs system dependencies
- Installs Node.js 20.x
- Clones and builds rpi-rgb-led-matrix library
- Interactive prompts

#### `scripts/deploy.sh`
- Pull latest code from git
- Install new dependencies if needed
- Build TypeScript
- Restart systemd service
- Show deployment status

### Configuration Files

#### `package.json`
- Project metadata
- Dependencies:
  - `hono` - Web framework
  - `rpi-led-matrix` - LED driver bindings
  - `dotenv` - Environment variable loader
- Dev dependencies:
  - `typescript` - TypeScript compiler
  - `tsx` - TypeScript execution
  - `@types/node` - Node.js types
- Scripts:
  - `dev` - Development mode with watch
  - `build` - Compile TypeScript
  - `start` - Run compiled JS
  - `start:sudo` - Run with sudo (for GPIO)

#### `tsconfig.json`
- TypeScript compiler options
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Output directory: `./dist`

#### `.env.example`
- Environment variable template
- Documents all configuration options
- Safe to commit (no secrets)

#### `.gitignore`
- Excludes build artifacts
- Excludes dependencies
- Excludes environment files
- Excludes logs and editor files

#### `led-matrix.service`
- systemd service definition
- Runs as root (for GPIO access)
- Auto-restart on failure
- Logs to systemd journal

### Documentation

#### `README.md`
- Project overview
- Features list
- Technology stack
- Installation instructions
- API documentation
- Troubleshooting guide

#### `HARDWARE.md`
- Complete hardware setup guide
- Bill of materials
- Wiring diagrams
- Power architecture
- Safety warnings
- Panel specifications
- Mounting suggestions

#### `QUICKSTART.md`
- Condensed setup instructions
- Step-by-step getting started
- Common issues and solutions
- Quick reference commands

## Build Output

When you run `npm run build`, TypeScript compiles to:

```
dist/
├── server.js
├── matrix/
│   ├── MatrixController.js
│   └── config.js
├── routes/
│   ├── api.js
│   └── pages.js
└── views/
    ├── layout.js
    └── dashboard.js
```

## Runtime Files (Not in Git)

```
.env                    # Your local environment config
node_modules/           # Installed dependencies
dist/                   # Compiled JavaScript
*.log                   # Application logs
```

## Development Workflow

1. **Edit TypeScript** in `src/`
2. **Run dev mode**: `npm run dev` (auto-reloads)
3. **Test in browser**: `http://localhost:3000`
4. **Commit changes**: `git add . && git commit -m "..."`
5. **Push to GitHub**: `git push`
6. **Deploy on Pi**: `./scripts/deploy.sh`

## Extending the Project

### Adding a New Display Mode

1. Add mode type to `MatrixController.ts`:
   ```typescript
   export type DisplayMode = 'clock' | 'text' | 'weather' | 'mynewmode' | 'off';
   ```

2. Implement drawing method in `MatrixController.ts`:
   ```typescript
   private drawMyNewMode(): void {
     this.matrix.fgColor(0xFF00FF).drawText('NEW MODE', 10, 36);
   }
   ```

3. Add case to `update()` method:
   ```typescript
   case 'mynewmode':
     this.drawMyNewMode();
     break;
   ```

4. Add API route in `routes/api.ts` (if needed)

5. Add button in `views/dashboard.ts`:
   ```html
   <button hx-post="/api/mode" hx-vals='{"mode": "mynewmode"}'>
     🆕 My New Mode
   </button>
   ```

### Adding a New API Endpoint

1. Add route handler in `src/routes/api.ts`:
   ```typescript
   api.post('/mynewapi', async (c) => {
     // Handle request
     return c.json({ success: true });
   });
   ```

2. Call from UI using HTMX:
   ```html
   <button hx-post="/api/mynewapi">Click Me</button>
   ```

### Adding New Pages

1. Create view template in `src/views/`
2. Add route in `src/routes/pages.ts`:
   ```typescript
   pages.get('/newpage', (c) => {
     return c.html(layout('New Page', myNewView()));
   });
   ```

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| hono | ^3.12.0 | Web framework |
| rpi-led-matrix | ^1.15.0 | LED matrix driver |
| dotenv | ^16.3.1 | Environment config |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.0 | TypeScript compiler |
| tsx | ^4.7.0 | TS execution & watch |
| @types/node | ^20.10.0 | Node.js type definitions |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│  ┌─────────────────────────────────────────┐       │
│  │          Dashboard (HTMX)                │       │
│  │  - Status Display (auto-refresh)         │       │
│  │  - Control Buttons                       │       │
│  │  - Forms                                 │       │
│  └─────────────────────────────────────────┘       │
└───────────────────┬─────────────────────────────────┘
                    │ HTTP/HTMX
┌───────────────────▼─────────────────────────────────┐
│              Hono Server (Node.js)                  │
│  ┌──────────────┐         ┌──────────────┐         │
│  │ Page Routes  │         │  API Routes  │         │
│  │  /           │         │  /api/*      │         │
│  └──────────────┘         └──────┬───────┘         │
│                                   │                  │
│  ┌────────────────────────────────▼────────────┐   │
│  │        MatrixController                     │   │
│  │  - Display State Management                 │   │
│  │  - Mode Switching Logic                     │   │
│  │  - Update Loop (10 Hz)                      │   │
│  └────────────────────────┬────────────────────┘   │
└───────────────────────────┼─────────────────────────┘
                            │ Native Bindings
┌───────────────────────────▼─────────────────────────┐
│         rpi-led-matrix (C++ Library)                │
│  - GPIO Control                                     │
│  - Hardware Timing                                  │
│  - PWM Generation                                   │
└───────────────────────────┬─────────────────────────┘
                            │ GPIO
┌───────────────────────────▼─────────────────────────┐
│           Hardware (3× 64×64 LED Panels)            │
│  Panel 1  →  Panel 2  →  Panel 3                   │
│   64×64       64×64       64×64                     │
└─────────────────────────────────────────────────────┘
```

## Code Style

- **TypeScript** with strict mode
- **ES2022** features
- **ESM** modules (import/export)
- **Async/await** for asynchronous code
- **Template literals** for HTML (hono/html)
- **Functional** where possible
- **Typed** interfaces and parameters

## Testing Locations

### Desktop Development
- Can run `npm run dev` without hardware
- Web interface works on any machine
- LED control requires actual Pi hardware

### On Raspberry Pi
- Full functionality with hardware connected
- Must run with `sudo` for GPIO access
- Access dashboard from any device on network

---

**Version:** 1.0
**Last Updated:** 2025-12-29
**Maintained by:** nam37
