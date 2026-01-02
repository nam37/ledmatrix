import { LedMatrix, Font } from 'rpi-led-matrix';
import { getMatrixConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export type DisplayMode = 'clock' | 'text' | 'weather' | 'scroll' | 'rainbow' | 'plasma' | 'squares' | 'life' | 'pulse' | 'off';

export interface DisplayState {
  mode: DisplayMode;
  text?: string;
  brightness?: number;
}

export class MatrixController {
  private matrix: LedMatrix;
  private font: any;  // Keep font instance alive
  private state: DisplayState;
  private updateInterval: NodeJS.Timeout | null = null;
  private animationFrame: number = 0;
  private scrollOffset: number = 0;
  private lifeGrid: boolean[][] = [];
  private lifeAge: number[][] = [];  // Track age of each cell
  private pulseValue: number = 0;

  constructor() {
    const config = getMatrixConfig();
    this.matrix = new LedMatrix(config.matrixOptions, config.runtimeOptions);

    // Load default font - keep as class member to prevent premature destruction
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fontPath = join(__dirname, '../../node_modules/rpi-led-matrix/vendor/fonts/7x13.bdf');
    this.font = new Font('7x13', fontPath);
    this.matrix.font(this.font);

    this.state = {
      mode: 'clock',
      brightness: 80,
    };

    console.log('Matrix initialized:', {
      size: `${config.matrixOptions.rows}x${config.matrixOptions.cols * (config.matrixOptions.chainLength || 1)}`,
      mapping: config.matrixOptions.hardwareMapping,
      font: this.font.name(),
    });
  }

  start(): void {
    this.stop(); // Clear any existing interval

    this.updateInterval = setInterval(() => {
      this.update();
    }, 100); // Update 10 times per second

    console.log('Matrix display loop started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private update(): void {
    this.matrix.clear();
    this.animationFrame++;

    switch (this.state.mode) {
      case 'clock':
        this.drawClock();
        break;
      case 'text':
        this.drawText(this.state.text || 'HELLO');
        break;
      case 'weather':
        this.drawWeather();
        break;
      case 'scroll':
        this.drawScrollingText();
        break;
      case 'rainbow':
        this.drawRainbow();
        break;
      case 'plasma':
        this.drawPlasma();
        break;
      case 'squares':
        this.drawRotatingSquares();
        break;
      case 'life':
        this.drawGameOfLife();
        break;
      case 'pulse':
        this.drawPulsingColor();
        break;
      case 'off':
        // Keep clear
        break;
    }

    this.matrix.sync();
  }

  private drawClock(): void {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour12: false,  // Use 24-hour format to fit on 64-pixel display
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.matrix
      .fgColor(0xFFD700) // Gold color
      .brightness(this.state.brightness || 80)
      .drawText(time, 4, 36);  // Adjusted x position to fit better
  }

  private drawText(text: string): void {
    this.matrix
      .fgColor(0x00FF00) // Green color
      .brightness(this.state.brightness || 80)
      .drawText(text, 10, 36);
  }

  private drawWeather(): void {
    // Placeholder for weather display
    this.matrix
      .fgColor(0x00AAFF) // Blue color
      .brightness(this.state.brightness || 80)
      .drawText('WEATHER', 30, 36);
  }

  private drawScrollingText(): void {
    const text = this.state.text || 'LED MATRIX CONTROLLER';
    const textWidth = text.length * 6; // Approximate character width
    const matrixWidth = this.matrix.width();

    // Update scroll position
    this.scrollOffset = (this.scrollOffset + 2) % (textWidth + matrixWidth);
    const x = matrixWidth - this.scrollOffset;

    this.matrix
      .fgColor(0xFF00FF) // Magenta color
      .brightness(this.state.brightness || 80)
      .drawText(text, x, 36);
  }

  private drawRainbow(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Create rainbow effect using HSV to RGB conversion
        const hue = ((x + this.animationFrame) % width) / width;
        const color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
        this.matrix.fgColor(color).setPixel(x, y);
      }
    }
  }

  private drawPlasma(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const time = this.animationFrame * 0.1;

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Plasma effect using sine waves
        const value = Math.sin(x * 0.1 + time) +
                     Math.sin(y * 0.1 + time) +
                     Math.sin((x + y) * 0.1 + time) +
                     Math.sin(Math.sqrt(x * x + y * y) * 0.1 + time);

        const hue = (value + 4) / 8; // Normalize to 0-1
        const color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
        this.matrix.fgColor(color).setPixel(x, y);
      }
    }
  }

  private drawRotatingSquares(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const centerX = width / 2;
    const centerY = height / 2;
    const angle = (this.animationFrame * 0.05) % (Math.PI * 2);

    // Draw multiple rotating squares
    for (let size = 10; size < Math.min(width, height); size += 15) {
      const halfSize = size / 2;
      const hue = (size / 100 + this.animationFrame * 0.01) % 1;
      const color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);

      // Draw square corners
      const corners = [
        [-halfSize, -halfSize], [halfSize, -halfSize],
        [halfSize, halfSize], [-halfSize, halfSize]
      ];

      for (let i = 0; i < 4; i++) {
        const [x1, y1] = corners[i];
        const [x2, y2] = corners[(i + 1) % 4];

        // Rotate and draw line
        const rx1 = x1 * Math.cos(angle) - y1 * Math.sin(angle) + centerX;
        const ry1 = x1 * Math.sin(angle) + y1 * Math.cos(angle) + centerY;
        const rx2 = x2 * Math.cos(angle) - y2 * Math.sin(angle) + centerX;
        const ry2 = x2 * Math.sin(angle) + y2 * Math.cos(angle) + centerY;

        this.drawLine(Math.floor(rx1), Math.floor(ry1), Math.floor(rx2), Math.floor(ry2), color);
      }
    }
  }

  private drawGameOfLife(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    // Initialize grid on first run or reset
    if (this.lifeGrid.length === 0) {
      this.initializeLifeGrid(width, height);
    }

    // Update every 5 frames
    if (this.animationFrame % 5 === 0) {
      const newGrid = Array(height).fill(0).map(() => Array(width).fill(false));
      const newAge = Array(height).fill(0).map(() => Array(width).fill(0));

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const neighbors = this.countNeighbors(x, y);
          const alive = this.lifeGrid[y][x];

          // Conway's rules
          if (alive && (neighbors === 2 || neighbors === 3)) {
            newGrid[y][x] = true;
            newAge[y][x] = this.lifeAge[y][x] + 1; // Increment age
          } else if (!alive && neighbors === 3) {
            newGrid[y][x] = true;
            newAge[y][x] = 0; // New cell
          }
        }
      }

      this.lifeGrid = newGrid;
      this.lifeAge = newAge;

      // Check if population is too low or too high, reset if needed
      const population = this.lifeGrid.flat().filter(c => c).length;
      if (population < 10 || population > width * height * 0.9) {
        this.initializeLifeGrid(width, height);
      }
    }

    // Draw grid with age-based colors
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.lifeGrid[y][x]) {
          // Color based on age: young = blue/cyan, old = red/yellow
          const age = this.lifeAge[y][x];
          const hue = (0.6 - Math.min(age * 0.02, 0.5)) % 1; // Blue to red
          const color = this.hsvToRgb(hue, 0.9, this.state.brightness! / 100);
          this.matrix.fgColor(color).setPixel(x, y);
        }
      }
    }
  }

  private initializeLifeGrid(width: number, height: number): void {
    this.lifeGrid = Array(height).fill(0).map(() => Array(width).fill(false));
    this.lifeAge = Array(height).fill(0).map(() => Array(width).fill(0));

    // Randomly choose between different initialization strategies
    const strategy = Math.floor(Math.random() * 3);

    if (strategy === 0) {
      // Random with higher density
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          this.lifeGrid[y][x] = Math.random() > 0.6; // 40% density
        }
      }
    } else if (strategy === 1) {
      // Add some gliders
      for (let i = 0; i < 5; i++) {
        const x = Math.floor(Math.random() * (width - 5));
        const y = Math.floor(Math.random() * (height - 5));
        this.addGlider(x, y);
      }
    } else {
      // Add some pulsars and random noise
      const cx = Math.floor(width / 2);
      const cy = Math.floor(height / 2);
      this.addPulsar(cx, cy);
      // Add random noise
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (Math.random() > 0.85) this.lifeGrid[y][x] = true;
        }
      }
    }
  }

  private addGlider(x: number, y: number): void {
    const pattern = [
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 1]
    ];
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        if (pattern[dy][dx] && y + dy < this.lifeGrid.length && x + dx < this.lifeGrid[0].length) {
          this.lifeGrid[y + dy][x + dx] = true;
        }
      }
    }
  }

  private addPulsar(cx: number, cy: number): void {
    const pattern = [
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0]
    ];
    const startY = cy - 6;
    const startX = cx - 6;
    for (let dy = 0; dy < 13; dy++) {
      for (let dx = 0; dx < 13; dx++) {
        const y = startY + dy;
        const x = startX + dx;
        if (y >= 0 && y < this.lifeGrid.length && x >= 0 && x < this.lifeGrid[0].length) {
          this.lifeGrid[y][x] = pattern[dy][dx] === 1;
        }
      }
    }
  }

  private countNeighbors(x: number, y: number): number {
    const width = this.matrix.width();
    const height = this.matrix.height();
    let count = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = (x + dx + width) % width;
        const ny = (y + dy + height) % height;
        if (this.lifeGrid[ny]?.[nx]) count++;
      }
    }

    return count;
  }

  private drawPulsingColor(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    // Pulse between 0 and 1
    this.pulseValue = (Math.sin(this.animationFrame * 0.1) + 1) / 2;
    const hue = (this.animationFrame * 0.005) % 1;
    const color = this.hsvToRgb(hue, 1, this.pulseValue * (this.state.brightness! / 100));

    // Fill entire display
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.matrix.fgColor(color).setPixel(x, y);
      }
    }
  }

  private drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void {
    // Bresenham's line algorithm
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 >= 0 && x0 < this.matrix.width() && y0 >= 0 && y0 < this.matrix.height()) {
        this.matrix.fgColor(color).setPixel(x0, y0);
      }

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  private hsvToRgb(h: number, s: number, v: number): number {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
      default: r = g = b = 0;
    }

    return ((Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255));
  }

  // Public API
  setMode(mode: DisplayMode): void {
    this.state.mode = mode;
    console.log('Display mode changed to:', mode);
  }

  setText(text: string): void {
    this.state.text = text;
    this.state.mode = 'text';
  }

  setBrightness(brightness: number): void {
    this.state.brightness = Math.max(0, Math.min(100, brightness));
  }

  getState(): DisplayState {
    return { ...this.state };
  }

  shutdown(): void {
    this.stop();
    this.matrix.clear().sync();
    console.log('Matrix controller shutdown');
  }
}
