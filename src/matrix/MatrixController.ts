import { LedMatrix, Font } from 'rpi-led-matrix';
import { getMatrixConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';

export type DisplayMode = 'clock' | 'text' | 'weather' | 'scroll' | 'rainbow' | 'plasma' | 'squares' | 'life' | 'pulse' | 'image' | 'maze' | 'off';

export interface DisplayState {
  mode: DisplayMode;
  text?: string;
  brightness?: number;
  imagePath?: string;
}

export class MatrixController {
  private matrix: any;
  private font: any;  // Keep font instance alive
  private state: DisplayState;
  private updateInterval: NodeJS.Timeout | null = null;
  private animationFrame: number = 0;
  private scrollOffset: number = 0;
  private lifeGrid: boolean[][] = [];
  private lifeAge: number[][] = [];  // Track age of each cell
  private pulseValue: number = 0;
  private imageBuffer: Buffer | null = null;
  private clockX: number = 20;  // Clock position
  private clockY: number = 36;
  private clockDx: number = 1;  // Clock velocity
  private clockDy: number = 1;
  private mazeGrid: number[][] = [];  // 0=wall, 1=path
  private mazePath: Array<{x: number, y: number}> = [];  // Current solver path
  private mazeState: 'generating' | 'solving' | 'solved' | 'paused' = 'generating';
  private mazeTimer: number = 0;  // Frame counter for state transitions
  private mazeCellSize: number = 2;  // Pixels per maze cell
  private mazeStack: Array<{x: number, y: number}> = [];  // DFS stack for solving
  private mazeVisited: boolean[][] = [];  // Track visited cells during solving
  private weatherData: {
    current?: {
      temp: number;
      condition: string;
      icon: string;
      humidity: number;
      location: string;
    };
    forecast?: Array<{
      date: string;
      high: number;
      low: number;
      condition: string;
      icon: string;
    }>;
    lastFetch?: number;
  } = {};
  private weatherConfig: {
    zipcode?: string;
  } = {};
  private weatherCycleIndex: number = 0;
  private weatherCycleTimer: number = 0;

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

    // Debug font metrics
    console.log('Font metrics:', {
      name: this.font.name(),
      height: this.font.height(),
      baseline: this.font.baseline(),
    });

    console.log('Matrix initialized:', {
      size: `${config.matrixOptions.rows}x${config.matrixOptions.cols * (config.matrixOptions.chainLength || 1)}`,
      mapping: config.matrixOptions.hardwareMapping,
      font: this.font.name(),
    });

    // Load default image
    const defaultImagePath = join(__dirname, '../../public/default-image-cropped.png');
    this.setImage(defaultImagePath).catch(err => {
      console.error('Failed to load default image:', err);
    });

    // Load weather config
    const weatherConfigPath = join(__dirname, '../../config/weather.json');
    readFile(weatherConfigPath, 'utf-8')
      .then(data => {
        this.weatherConfig = JSON.parse(data);
        if (this.weatherConfig.zipcode) {
          console.log('Weather config loaded:', this.weatherConfig.zipcode);
        }
      })
      .catch(() => {
        console.log('No weather config found, using defaults');
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
      case 'image':
        this.drawImage();
        break;
      case 'maze':
        this.drawMaze();
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

    const width = this.matrix.width();
    const height = this.matrix.height();
    const textWidth = this.font.stringWidth(time);

    // Update position every frame for smooth movement
    this.clockX += this.clockDx;
    this.clockY += this.clockDy;

    // Bounce off edges
    // Y coordinate is the TOP of the text (with 2px adjustment for font padding)
    const fontHeight = this.font.height();
    const minY = -2;  // Top of text at top of display
    const maxY = height - fontHeight + 2;  // Bottom of text at bottom of display

    if (this.clockX <= 0 || this.clockX + textWidth >= width) {
      this.clockDx = -this.clockDx;
      this.clockX = Math.max(0, Math.min(this.clockX, width - textWidth));
    }
    if (this.clockY <= minY || this.clockY >= maxY) {
      this.clockDy = -this.clockDy;
      this.clockY = Math.max(minY, Math.min(this.clockY, maxY));
    }

    this.matrix
      .fgColor(0xFFD700) // Gold color
      .brightness(this.state.brightness || 80)
      .drawText(time, Math.floor(this.clockX), Math.floor(this.clockY));
  }

  private drawText(text: string): void {
    this.matrix
      .fgColor(0x00FF00) // Green color
      .brightness(this.state.brightness || 80)
      .drawText(text, 10, 36);
  }

  private async fetchWeatherData(): Promise<void> {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey || !this.weatherConfig.zipcode) {
      return;
    }

    try {
      // Fetch current weather
      const currentUrl = `https://api.openweathermap.org/data/2.5/weather?zip=${this.weatherConfig.zipcode},US&appid=${apiKey}&units=imperial`;
      const currentResponse = await fetch(currentUrl);

      if (!currentResponse.ok) {
        console.error('Weather API error:', currentResponse.status);
        return;
      }

      const currentData = await currentResponse.json() as any;

      // Fetch 5-day forecast
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?zip=${this.weatherConfig.zipcode},US&appid=${apiKey}&units=imperial`;
      const forecastResponse = await fetch(forecastUrl);

      if (!forecastResponse.ok) {
        console.error('Forecast API error:', forecastResponse.status);
        return;
      }

      const forecastData = await forecastResponse.json() as any;

      // Parse and store data
      this.weatherData.current = {
        temp: Math.round(currentData.main.temp),
        condition: currentData.weather[0].main,
        icon: this.mapWeatherIcon(currentData.weather[0].icon),
        humidity: currentData.main.humidity,
        location: currentData.name
      };

      // Process forecast data (group by day, take noon forecast)
      this.weatherData.forecast = this.processForecastData(forecastData.list);
      this.weatherData.lastFetch = Date.now();

      console.log('Weather data updated:', this.weatherData.current?.location);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
  }

  private processForecastData(list: any[]): Array<{date: string, high: number, low: number, condition: string, icon: string}> {
    const days: Map<string, any[]> = new Map();

    // Group forecasts by day
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dayKey = date.toLocaleDateString();

      if (!days.has(dayKey)) {
        days.set(dayKey, []);
      }
      days.get(dayKey)!.push(item);
    });

    // Get first 5 days and calculate high/low
    const forecast = [];
    let count = 0;

    for (const [dayKey, items] of days) {
      if (count >= 5) break;
      if (count === 0) { // Skip today
        count++;
        continue;
      }

      const temps = items.map(i => i.main.temp);
      const high = Math.round(Math.max(...temps));
      const low = Math.round(Math.min(...temps));

      // Use noon forecast for conditions
      const noonForecast = items.find(i => {
        const hour = new Date(i.dt * 1000).getHours();
        return hour >= 11 && hour <= 13;
      }) || items[0];

      const date = new Date(noonForecast.dt * 1000);
      const dayName = count === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });

      forecast.push({
        date: dayName,
        high,
        low,
        condition: noonForecast.weather[0].main,
        icon: this.mapWeatherIcon(noonForecast.weather[0].icon)
      });

      count++;
    }

    return forecast;
  }

  private mapWeatherIcon(iconCode: string): string {
    // Map OpenWeatherMap icon codes to our icon types
    const code = iconCode.substring(0, 2);

    switch (code) {
      case '01': return 'sunny';
      case '02': return 'partly-cloudy';
      case '03':
      case '04': return 'cloudy';
      case '09':
      case '10': return 'rainy';
      case '11': return 'thunderstorm';
      case '13': return 'snowy';
      default: return 'cloudy';
    }
  }

  private drawWeather(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    // Check if we need to fetch weather data
    const now = Date.now();
    const shouldFetch = !this.weatherData.lastFetch || (now - this.weatherData.lastFetch) > 600000; // 10 minutes

    if (shouldFetch) {
      this.fetchWeatherData(); // Async, will update next frame
    }

    // Show configuration message if not set up
    if (!process.env.OPENWEATHER_API_KEY) {
      this.matrix
        .fgColor(0xFFFFFF)
        .brightness(this.state.brightness || 80)
        .drawText('Set API Key', 10, 20)
        .drawText('in .env file', 10, 40);
      return;
    }

    if (!this.weatherConfig.zipcode) {
      this.matrix
        .fgColor(0xFFFFFF)
        .brightness(this.state.brightness || 80)
        .drawText('Configure', 15, 20)
        .drawText('Location', 20, 40);
      return;
    }

    if (!this.weatherData.current) {
      this.matrix
        .fgColor(0xFFFFFF)
        .brightness(this.state.brightness || 80)
        .drawText('Loading...', 20, 32);
      return;
    }

    // Update cycle timer
    this.weatherCycleTimer++;
    if (this.weatherCycleTimer >= 100) { // 10 seconds at 10fps
      this.weatherCycleTimer = 0;
      // Calculate total screens based on actual forecast data
      const totalScreens = 1 + (this.weatherData.forecast?.length || 0); // 1 for current + forecast days
      this.weatherCycleIndex = (this.weatherCycleIndex + 1) % totalScreens;
    }

    // Draw current screen
    if (this.weatherCycleIndex === 0) {
      this.drawCurrentWeather();
    } else if (this.weatherData.forecast && this.weatherData.forecast[this.weatherCycleIndex - 1]) {
      this.drawForecastDay(this.weatherData.forecast[this.weatherCycleIndex - 1]);
    }
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

      // Reset if population dies out completely or gets stuck
      const population = this.lifeGrid.flat().filter(c => c).length;
      if (population < 5) {
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

    // Pure random chaos - more interesting than patterns
    const density = 0.35 + Math.random() * 0.15; // 35-50% density
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.lifeGrid[y][x] = Math.random() > (1 - density);
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

  private initializeMaze(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const cols = Math.floor(width / this.mazeCellSize);
    const rows = Math.floor(height / this.mazeCellSize);

    // Initialize grid with all walls
    this.mazeGrid = Array(rows).fill(0).map(() => Array(cols).fill(0));

    // Generate maze using recursive backtracking
    const stack: Array<{x: number, y: number}> = [];
    const startX = 0;
    const startY = 0;

    this.mazeGrid[startY][startX] = 1; // Mark as path
    stack.push({x: startX, y: startY});

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current.x, current.y, cols, rows);

      if (neighbors.length > 0) {
        // Pick random neighbor
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Remove wall between current and next
        const wallX = current.x + Math.floor((next.x - current.x) / 2);
        const wallY = current.y + Math.floor((next.y - current.y) / 2);
        this.mazeGrid[wallY][wallX] = 1;
        this.mazeGrid[next.y][next.x] = 1;

        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Initialize solver state
    this.mazePath = [{x: 0, y: 0}];
    this.mazeStack = [{x: 0, y: 0}];
    this.mazeVisited = Array(rows).fill(0).map(() => Array(cols).fill(false));
    this.mazeVisited[0][0] = true;
    this.mazeState = 'solving';
    this.mazeTimer = 0;
  }

  private getUnvisitedNeighbors(x: number, y: number, cols: number, rows: number): Array<{x: number, y: number}> {
    const neighbors = [];
    const directions = [
      {dx: 0, dy: -2}, // Up
      {dx: 2, dy: 0},  // Right
      {dx: 0, dy: 2},  // Down
      {dx: -2, dy: 0}  // Left
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && this.mazeGrid[ny][nx] === 0) {
        neighbors.push({x: nx, y: ny});
      }
    }

    return neighbors;
  }

  private solveMazeStep(): boolean {
    if (this.mazeStack.length === 0) return true; // No solution (shouldn't happen)

    const width = this.matrix.width();
    const height = this.matrix.height();
    const cols = Math.floor(width / this.mazeCellSize);
    const rows = Math.floor(height / this.mazeCellSize);

    const current = this.mazeStack[this.mazeStack.length - 1];

    // Check if we reached the goal (bottom-right corner)
    if (current.x === cols - 1 && current.y === rows - 1) {
      return true; // Solved!
    }

    // Get valid neighbors (paths we can move to)
    const neighbors = [];
    const directions = [
      {dx: 0, dy: -1}, // Up
      {dx: 1, dy: 0},  // Right
      {dx: 0, dy: 1},  // Down
      {dx: -1, dy: 0}  // Left
    ];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows &&
          this.mazeGrid[ny][nx] === 1 && !this.mazeVisited[ny][nx]) {
        neighbors.push({x: nx, y: ny});
      }
    }

    if (neighbors.length > 0) {
      // Pick first unvisited neighbor (DFS)
      const next = neighbors[0];
      this.mazeVisited[next.y][next.x] = true;
      this.mazeStack.push(next);
      this.mazePath.push(next);
    } else {
      // Backtrack - no unvisited neighbors
      this.mazeStack.pop();
      this.mazePath.pop();
    }

    return false; // Not solved yet
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

  private drawMaze(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const cols = Math.floor(width / this.mazeCellSize);
    const rows = Math.floor(height / this.mazeCellSize);

    // Initialize maze if needed
    if (this.mazeGrid.length === 0 || this.mazeState === 'generating') {
      this.initializeMaze();
    }

    // Handle solving state
    if (this.mazeState === 'solving') {
      // Update every 2 frames for visible animation
      if (this.animationFrame % 2 === 0) {
        const solved = this.solveMazeStep();
        if (solved) {
          this.mazeState = 'solved';
          this.mazeTimer = 0;
        }
      }
    } else if (this.mazeState === 'solved') {
      // Display solved maze for 2 seconds
      this.mazeTimer++;
      if (this.mazeTimer > 20) { // ~2 seconds at 10fps
        this.mazeState = 'paused';
        this.mazeTimer = 0;
      }
    } else if (this.mazeState === 'paused') {
      // Brief pause before generating new maze
      this.mazeTimer++;
      if (this.mazeTimer > 5) { // ~0.5 seconds
        this.mazeState = 'generating';
      }
    }

    // Render maze
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cellX = col * this.mazeCellSize;
        const cellY = row * this.mazeCellSize;

        // Determine cell color
        let color;
        if (this.mazeGrid[row][col] === 0) {
          // Wall - dark gray
          color = 0x202020;
        } else {
          // Path - light gray
          color = 0x404040;
        }

        // Draw cell
        for (let py = 0; py < this.mazeCellSize; py++) {
          for (let px = 0; px < this.mazeCellSize; px++) {
            const screenX = cellX + px;
            const screenY = cellY + py;
            if (screenX < width && screenY < height) {
              this.matrix.fgColor(color).setPixel(screenX, screenY);
            }
          }
        }
      }
    }

    // Draw solving path with color based on path length
    for (let i = 0; i < this.mazePath.length; i++) {
      const cell = this.mazePath[i];
      const cellX = cell.x * this.mazeCellSize;
      const cellY = cell.y * this.mazeCellSize;

      // Color based on position in path
      const hue = (i * 0.05) % 1;
      const color = this.hsvToRgb(hue, 0.9, this.state.brightness! / 100);

      // Draw path cell
      for (let py = 0; py < this.mazeCellSize; py++) {
        for (let px = 0; px < this.mazeCellSize; px++) {
          const screenX = cellX + px;
          const screenY = cellY + py;
          if (screenX < width && screenY < height) {
            this.matrix.fgColor(color).setPixel(screenX, screenY);
          }
        }
      }
    }
  }

  private drawWeatherIcon(icon: string, x: number, y: number): void {
    // Draw 30x30 pixel weather icons
    switch (icon) {
      case 'sunny':
        // Yellow circle with rays
        this.matrix.fgColor(0xFFD700);
        for (let dy = 7; dy < 23; dy++) {
          for (let dx = 7; dx < 23; dx++) {
            const dist = Math.sqrt((dx - 15) * (dx - 15) + (dy - 15) * (dy - 15));
            if (dist < 8) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        // Rays
        for (let i = 0; i < 2; i++) {
          this.matrix.setPixel(x + 15, y + 1 + i);
          this.matrix.setPixel(x + 15, y + 27 + i);
          this.matrix.setPixel(x + 1 + i, y + 15);
          this.matrix.setPixel(x + 27 + i, y + 15);
        }
        break;

      case 'partly-cloudy':
        // Sun (yellow)
        this.matrix.fgColor(0xFFD700);
        for (let dy = 3; dy < 15; dy++) {
          for (let dx = 3; dx < 15; dx++) {
            const dist = Math.sqrt((dx - 9) * (dx - 9) + (dy - 9) * (dy - 9));
            if (dist < 6) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        // Cloud (white)
        this.matrix.fgColor(0xFFFFFF);
        for (let dy = 15; dy < 27; dy++) {
          for (let dx = 7; dx < 27; dx++) {
            if (dy < 21 || (dx > 10 && dx < 23)) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        break;

      case 'cloudy':
        // Gray cloud
        this.matrix.fgColor(0x808080);
        for (let dy = 7; dy < 23; dy++) {
          for (let dx = 3; dx < 27; dx++) {
            if (dy < 17 || (dx > 6 && dx < 23)) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        break;

      case 'rainy':
        // Cloud
        this.matrix.fgColor(0x808080);
        for (let dy = 3; dy < 15; dy++) {
          for (let dx = 3; dx < 27; dx++) {
            if (dy < 11 || (dx > 6 && dx < 23)) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        // Rain drops (blue)
        this.matrix.fgColor(0x4444FF);
        for (let i = 0; i < 2; i++) {
          this.matrix.setPixel(x + 7, y + 18 + i);
          this.matrix.setPixel(x + 7, y + 22 + i);
          this.matrix.setPixel(x + 15, y + 20 + i);
          this.matrix.setPixel(x + 15, y + 24 + i);
          this.matrix.setPixel(x + 21, y + 18 + i);
          this.matrix.setPixel(x + 21, y + 22 + i);
        }
        break;

      case 'snowy':
        // Snowflake (white)
        this.matrix.fgColor(0xFFFFFF);
        // Vertical line
        for (let dy = 3; dy < 27; dy++) {
          this.matrix.setPixel(x + 15, y + dy);
        }
        // Horizontal line
        for (let dx = 3; dx < 27; dx++) {
          this.matrix.setPixel(x + dx, y + 15);
        }
        // Diagonals
        for (let d = 5; d < 25; d++) {
          this.matrix.setPixel(x + d, y + d);
          this.matrix.setPixel(x + (29 - d), y + d);
        }
        break;

      case 'thunderstorm':
        // Cloud (dark gray)
        this.matrix.fgColor(0x404040);
        for (let dy = 3; dy < 15; dy++) {
          for (let dx = 3; dx < 27; dx++) {
            if (dy < 11 || (dx > 6 && dx < 23)) {
              this.matrix.setPixel(x + dx, y + dy);
            }
          }
        }
        // Lightning bolt (yellow)
        this.matrix.fgColor(0xFFFF00);
        this.matrix.setPixel(x + 15, y + 15);
        this.matrix.setPixel(x + 14, y + 17);
        this.matrix.setPixel(x + 15, y + 19);
        this.matrix.setPixel(x + 14, y + 21);
        this.matrix.setPixel(x + 13, y + 23);
        this.matrix.setPixel(x + 14, y + 25);
        break;
    }
  }

  private drawCurrentWeather(): void {
    if (!this.weatherData.current) return;

    const { temp, condition, icon, humidity, location } = this.weatherData.current;

    // Left side: Temperature and icon
    const tempText = `${temp}F`;
    this.matrix
      .fgColor(0xFFAA00)
      .brightness(this.state.brightness || 80)
      .drawText(tempText, 8, 9);

    // Weather icon below temp
    this.drawWeatherIcon(icon, 14, 23);

    // Right side: Location (truncate if needed)
    const shortLocation = location.length > 9 ? location.substring(0, 9) : location;
    this.matrix
      .fgColor(0xFFFFFF)
      .drawText(shortLocation, 68, 2);

    // Condition (truncate if needed)
    const shortCondition = condition.length > 8 ? condition.substring(0, 8) : condition;
    this.matrix
      .fgColor(0xCCCCCC)
      .drawText(shortCondition, 68, 20);

    // Humidity
    this.matrix
      .fgColor(0x88AAFF)
      .drawText(`${humidity}%`, 68, 38);
  }

  private drawForecastDay(day: {date: string, high: number, low: number, condition: string, icon: string}): void {
    const { date, high, low, condition, icon } = day;

    // Left side: Day name and icon
    this.matrix
      .fgColor(0xFFFFFF)
      .brightness(this.state.brightness || 80)
      .drawText(date, 4, 2);

    // Weather icon
    this.drawWeatherIcon(icon, 14, 23);

    // Right side: High/Low temps
    const tempText = `H:${high}F`;
    this.matrix
      .fgColor(0xFF6600)
      .drawText(tempText, 68, 8);

    const lowText = `L:${low}F`;
    this.matrix
      .fgColor(0x66AAFF)
      .drawText(lowText, 68, 26);

    // Condition (truncate if needed)
    const shortCondition = condition.length > 8 ? condition.substring(0, 8) : condition;
    this.matrix
      .fgColor(0xCCCCCC)
      .drawText(shortCondition, 68, 44);
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

  private drawImage(): void {
    if (!this.imageBuffer) return;

    const width = this.matrix.width();
    const height = this.matrix.height();
    this.matrix.brightness(this.state.brightness || 80);
    this.matrix.drawBuffer(this.imageBuffer, width, height);
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

  getCurrentImagePath(): string | undefined {
    return this.state.imagePath;
  }

  async setWeatherZipcode(zipcode: string): Promise<void> {
    this.weatherConfig.zipcode = zipcode;

    // Save to config file
    try {
      const configPath = join(dirname(fileURLToPath(import.meta.url)), '../../config/weather.json');
      await writeFile(configPath, JSON.stringify(this.weatherConfig, null, 2));
      console.log('Weather config saved:', zipcode);

      // Fetch weather data immediately
      await this.fetchWeatherData();
    } catch (error) {
      console.error('Failed to save weather config:', error);
    }
  }

  getWeatherZipcode(): string | undefined {
    return this.weatherConfig.zipcode;
  }

  async setImage(imagePath: string): Promise<void> {
    try {
      const width = this.matrix.width();
      const height = this.matrix.height();

      // Load and process image to fit matrix dimensions
      const imageData = await sharp(imagePath)
        .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
        .raw()
        .toBuffer();

      this.imageBuffer = imageData;
      this.state.imagePath = imagePath;
      console.log(`Image loaded: ${imagePath}`);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  }

  shutdown(): void {
    this.stop();
    this.matrix.clear().sync();
    console.log('Matrix controller shutdown');
  }
}
