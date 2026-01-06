import { LedMatrix, Font } from 'rpi-led-matrix';
import { getMatrixConfig } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';

export type DisplayMode = 'clock' | 'text' | 'weather' | 'scroll' | 'rainbow' | 'plasma' | 'squares' | 'life' | 'pulse' | 'image' | 'maze' | 'spectrum' | 'fire' | 'pacman' | 'off';

export interface DisplayState {
  mode: DisplayMode;
  text?: string;
  brightness?: number;
  imagePath?: string;
  // Mode-specific options
  mazeSpeed?: 'slow' | 'medium' | 'fast';
  mazeThickness?: 'small' | 'medium' | 'large';
  clockFormat?: '12hour' | '24hour';
  clockColor?: 'solid' | 'rainbow';
  plasmaPattern?: 'classic' | 'waves' | 'cellular' | 'psychedelic';
  spectrumStyle?: 'bars' | 'waveform' | 'heartbeat';
  spectrumColor?: 'rainbow' | 'gradient' | 'solid';
  fireColorScheme?: 'traditional' | 'blue' | 'green' | 'purple';
  fireIntensity?: 'calm' | 'normal' | 'intense';
  fireSpeed?: 'slow' | 'normal' | 'fast';
  pacmanSpeed?: 'slow' | 'normal' | 'fast';
  pacmanDifficulty?: 'easy' | 'normal' | 'hard';
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
  private fireHeatMap: number[][] = [];  // 2D heat map (0-1 values)
  private pacmanMaze: number[][] = [];  // 0=empty, 1=wall, 2=dot, 3=power pellet
  private pacmanPos: {x: number, y: number} = {x: 0, y: 0};
  private pacmanDir: {x: number, y: number} = {x: 1, y: 0};
  private ghosts: Array<{x: number, y: number, color: number, mode: 'chase' | 'scatter' | 'frightened', dir: {x: number, y: number}}> = [];
  private pacmanScore: number = 0;
  private pacmanPowerMode: boolean = false;
  private pacmanPowerTimer: number = 0;
  private pacmanMoveTimer: number = 0;
  private pacmanDotsRemaining: number = 0;

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
      // Default mode options
      mazeSpeed: 'medium',
      mazeThickness: 'medium',
      clockFormat: '12hour',
      clockColor: 'rainbow',
      plasmaPattern: 'classic',
      spectrumStyle: 'bars',
      spectrumColor: 'rainbow',
      fireColorScheme: 'traditional',
      fireIntensity: 'normal',
      fireSpeed: 'normal',
      pacmanSpeed: 'normal',
      pacmanDifficulty: 'normal',
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
      case 'spectrum':
        this.drawSpectrum();
        break;
      case 'fire':
        this.drawFire();
        break;
      case 'pacman':
        this.drawPacman();
        break;
      case 'off':
        // Keep clear
        break;
    }

    this.matrix.sync();
  }

  private drawClock(): void {
    const now = new Date();
    const hour12 = this.state.clockFormat === '12hour';
    const time = now.toLocaleTimeString('en-US', {
      hour12: hour12,
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

    // Determine color based on mode
    let color: number;
    if (this.state.clockColor === 'rainbow') {
      // Rainbow fade based on time
      const hue = (this.animationFrame * 0.01) % 1;
      color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
    } else {
      // Solid gold color
      color = 0xFFD700;
    }

    this.matrix
      .fgColor(color)
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
    const pattern = this.state.plasmaPattern || 'classic';

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let value: number;

        switch (pattern) {
          case 'classic':
            // Classic plasma with sine waves
            value = Math.sin(x * 0.1 + time) +
                   Math.sin(y * 0.1 + time) +
                   Math.sin((x + y) * 0.1 + time) +
                   Math.sin(Math.sqrt(x * x + y * y) * 0.1 + time);
            break;

          case 'waves':
            // Horizontal and vertical waves
            value = Math.sin(x * 0.15 + time) * Math.cos(y * 0.15 - time) +
                   Math.sin(y * 0.2 + time * 0.5);
            break;

          case 'cellular':
            // Cellular/bubble pattern
            const dist1 = Math.sqrt((x - width/3) ** 2 + (y - height/2) ** 2);
            const dist2 = Math.sqrt((x - 2*width/3) ** 2 + (y - height/2) ** 2);
            value = Math.sin(dist1 * 0.2 - time) + Math.sin(dist2 * 0.2 + time);
            break;

          case 'psychedelic':
            // Complex interference pattern
            value = Math.sin(x * 0.05 + time) * Math.sin(y * 0.05 - time) +
                   Math.cos((x + y) * 0.08 + time * 1.5) +
                   Math.sin(Math.sqrt((x - width/2) ** 2 + (y - height/2) ** 2) * 0.15 - time * 2);
            break;

          default:
            value = 0;
        }

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

    // Determine cell size based on thickness setting
    const thicknessMap = { small: 1, medium: 2, large: 3 };
    const cellSize = thicknessMap[this.state.mazeThickness || 'medium'];

    const cols = Math.floor(width / cellSize);
    const rows = Math.floor(height / cellSize);

    // Initialize maze if needed or if cell size changed
    if (this.mazeGrid.length === 0 || this.mazeState === 'generating' || this.mazeCellSize !== cellSize) {
      this.mazeCellSize = cellSize;
      this.initializeMaze();
    }

    // Handle solving state
    if (this.mazeState === 'solving') {
      // Determine update frequency based on speed setting
      const speedMap = { slow: 4, medium: 2, fast: 1 };
      const updateInterval = speedMap[this.state.mazeSpeed || 'medium'];

      if (this.animationFrame % updateInterval === 0) {
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

  // Spectrum mode visualization methods
  private generateSimulatedFrequencyData(): number[] {
    const bands = 20;
    const data: number[] = [];

    for (let i = 0; i < bands; i++) {
      // Mix of sine waves with different frequencies for realistic spectrum
      const bass = Math.sin(this.animationFrame * 0.05 + i * 0.3) * 0.8;
      const mid = Math.sin(this.animationFrame * 0.1 + i * 0.5) * 0.5;
      const high = Math.sin(this.animationFrame * 0.15 + i * 0.7) * 0.3;

      // Combine and normalize to 0-1 range
      const value = Math.max(0, (bass + mid + high + 1.5) / 3);
      data.push(value);
    }

    return data;
  }

  private generateSimulatedWaveform(): number[] {
    const samples = 192; // Match matrix width
    const data: number[] = [];

    for (let i = 0; i < samples; i++) {
      // Multiple frequency components for realistic waveform
      const wave = Math.sin((i + this.animationFrame) * 0.1) * 0.5 +
                   Math.sin((i + this.animationFrame) * 0.05) * 0.3 +
                   Math.sin((i + this.animationFrame) * 0.2) * 0.2;

      // Normalize to 0-1 range
      data.push((wave + 1) / 2);
    }

    return data;
  }

  private drawSpectrum(): void {
    const style = this.state.spectrumStyle || 'bars';

    switch (style) {
      case 'bars':
        this.drawSpectrumBars();
        break;
      case 'waveform':
        this.drawSpectrumWaveform();
        break;
      case 'heartbeat':
        this.drawSpectrumHeartbeat();
        break;
    }
  }

  private drawSpectrumBars(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const frequencyData = this.generateSimulatedFrequencyData();
    const bands = frequencyData.length;
    const barWidth = Math.floor(width / bands);
    const colorMode = this.state.spectrumColor || 'rainbow';

    for (let i = 0; i < bands; i++) {
      const barHeight = Math.floor(frequencyData[i] * height);
      const x = i * barWidth;

      // Determine color based on color mode
      let color: number;
      if (colorMode === 'rainbow') {
        const hue = i / bands;
        color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
      } else if (colorMode === 'gradient') {
        const hue = 0.6 - (frequencyData[i] * 0.4); // Blue to red gradient
        color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
      } else {
        color = 0x00FF00; // Solid green
      }

      // Draw vertical bar from bottom
      for (let y = height - barHeight; y < height; y++) {
        for (let bx = 0; bx < barWidth - 1; bx++) {
          if (x + bx < width) {
            this.matrix.fgColor(color).setPixel(x + bx, y);
          }
        }
      }
    }
  }

  private drawSpectrumWaveform(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const waveformData = this.generateSimulatedWaveform();
    const centerY = height / 2;
    const colorMode = this.state.spectrumColor || 'rainbow';

    for (let x = 0; x < width && x < waveformData.length; x++) {
      // Map 0-1 waveform data to pixel Y position
      const y = Math.floor((1 - waveformData[x]) * height);

      // Determine color
      let color: number;
      if (colorMode === 'rainbow') {
        const hue = (x + this.animationFrame * 2) % width / width;
        color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
      } else if (colorMode === 'gradient') {
        const hue = 0.5 + (waveformData[x] - 0.5) * 0.3;
        color = this.hsvToRgb(hue, 1, this.state.brightness! / 100);
      } else {
        color = 0x00FFFF; // Solid cyan
      }

      // Draw waveform line with thickness
      for (let dy = -1; dy <= 1; dy++) {
        const py = y + dy;
        if (py >= 0 && py < height) {
          this.matrix.fgColor(color).setPixel(x, py);
        }
      }
    }

    // Draw center line (zero reference)
    const centerLineColor = 0x404040;
    for (let x = 0; x < width; x += 4) {
      this.matrix.fgColor(centerLineColor).setPixel(x, Math.floor(centerY));
    }
  }

  private drawSpectrumHeartbeat(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const centerX = width / 2;
    const centerY = height / 2;

    // Create heartbeat pulse pattern (lub-dub)
    const beatCycle = (this.animationFrame * 0.15) % (Math.PI * 4);
    let pulse: number;

    if (beatCycle < Math.PI * 0.5) {
      // First beat (lub)
      pulse = Math.sin(beatCycle * 4) * 0.8;
    } else if (beatCycle < Math.PI * 1.2) {
      // Second beat (dub) - smaller
      pulse = Math.sin((beatCycle - Math.PI * 0.6) * 5) * 0.5;
    } else {
      // Rest period
      pulse = 0;
    }

    pulse = Math.max(0, pulse);
    const radius = 10 + pulse * 15; // Pulsing radius

    // Draw expanding circle/heart shape
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Multiple concentric circles for heartbeat effect
        if (distance < radius && distance > radius - 3) {
          const colorMode = this.state.spectrumColor || 'rainbow';
          let color: number;

          if (colorMode === 'rainbow') {
            const hue = (distance / radius + this.animationFrame * 0.01) % 1;
            color = this.hsvToRgb(hue, 1, pulse);
          } else if (colorMode === 'gradient') {
            const hue = 0; // Red for heartbeat
            color = this.hsvToRgb(hue, 1, pulse);
          } else {
            color = 0xFF0000; // Solid red
          }

          this.matrix.fgColor(color).setPixel(x, y);
        }
      }
    }
  }

  // Fire mode methods
  private initializeFireHeatMap(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    this.fireHeatMap = Array(height).fill(0).map(() => Array(width).fill(0));
  }

  private drawFire(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    // Initialize heat map if needed
    if (this.fireHeatMap.length === 0) {
      this.initializeFireHeatMap();
    }

    // Get settings
    const speed = this.state.fireSpeed || 'normal';
    const intensity = this.state.fireIntensity || 'normal';
    const colorScheme = this.state.fireColorScheme || 'traditional';

    // Speed control - update every N frames
    const speedMap = { slow: 3, normal: 2, fast: 1 };
    const updateInterval = speedMap[speed];

    if (this.animationFrame % updateInterval !== 0) {
      // Just render without updating
      this.renderFire(colorScheme);
      return;
    }

    // Intensity affects heat generation
    const intensityMap = { calm: 0.6, normal: 0.8, intense: 1.0 };
    const heatMultiplier = intensityMap[intensity];

    // Update heat map - process from bottom to top
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        if (y === height - 1) {
          // Bottom row: generate varied heat with hot spots
          let baseHeat = Math.random() * heatMultiplier * 0.5;

          // Create moving hot spots (stronger flames)
          const hotSpotFreq = 0.05; // 5% chance of hot spot
          const hotSpotPhase = (this.animationFrame * 0.1 + x * 0.3) % (Math.PI * 2);
          const hotSpotStrength = Math.sin(hotSpotPhase) * 0.5 + 0.5; // 0 to 1

          if (Math.random() < hotSpotFreq || hotSpotStrength > 0.8) {
            // Strong hot spot - creates taller flames
            baseHeat += heatMultiplier * (0.8 + Math.random() * 0.4);
          }

          this.fireHeatMap[y][x] = Math.min(1.5, baseHeat);
        } else {
          // Average heat from below with cooling
          let heatSum = 0;
          let count = 0;

          // Sample 3 pixels below: left-below, directly below, right-below
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < width) {
              heatSum += this.fireHeatMap[y + 1][nx];
              count++;
            }
          }

          // Average and cool
          const avgHeat = count > 0 ? heatSum / count : 0;
          const coolingFactor = 0.92; // Heat dissipates as it rises
          this.fireHeatMap[y][x] = avgHeat * coolingFactor;
        }
      }
    }

    this.renderFire(colorScheme);
  }

  private renderFire(colorScheme: string): void {
    const width = this.matrix.width();
    const height = this.matrix.height();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const heat = this.fireHeatMap[y][x];
        const color = this.getFireColor(heat, colorScheme);
        this.matrix.fgColor(color).setPixel(x, y);
      }
    }
  }

  private getFireColor(heat: number, colorScheme: string): number {
    // Clamp heat to 0-1 range
    heat = Math.max(0, Math.min(1, heat));

    // Apply brightness
    const brightness = this.state.brightness! / 100;
    heat = heat * brightness;

    let r, g, b;

    switch (colorScheme) {
      case 'traditional':
        // Black -> Red -> Orange -> Yellow -> White
        if (heat < 0.25) {
          // Black to dark red
          r = heat * 4 * 128;
          g = 0;
          b = 0;
        } else if (heat < 0.5) {
          // Dark red to bright red
          r = 128 + (heat - 0.25) * 4 * 127;
          g = 0;
          b = 0;
        } else if (heat < 0.75) {
          // Red to orange
          r = 255;
          g = (heat - 0.5) * 4 * 200;
          b = 0;
        } else {
          // Orange to yellow/white
          r = 255;
          g = 200 + (heat - 0.75) * 4 * 55;
          b = (heat - 0.75) * 4 * 100;
        }
        break;

      case 'blue':
        // Black -> Dark Blue -> Cyan -> White
        if (heat < 0.33) {
          r = 0;
          g = 0;
          b = heat * 3 * 255;
        } else if (heat < 0.66) {
          r = 0;
          g = (heat - 0.33) * 3 * 255;
          b = 255;
        } else {
          r = (heat - 0.66) * 3 * 255;
          g = 255;
          b = 255;
        }
        break;

      case 'green':
        // Black -> Dark Green -> Bright Green -> Yellow
        if (heat < 0.33) {
          r = 0;
          g = heat * 3 * 255;
          b = 0;
        } else if (heat < 0.66) {
          r = (heat - 0.33) * 3 * 200;
          g = 255;
          b = 0;
        } else {
          r = 200 + (heat - 0.66) * 3 * 55;
          g = 255;
          b = (heat - 0.66) * 3 * 100;
        }
        break;

      case 'purple':
        // Black -> Dark Purple -> Magenta -> Pink
        if (heat < 0.33) {
          r = heat * 3 * 128;
          g = 0;
          b = heat * 3 * 255;
        } else if (heat < 0.66) {
          r = 128 + (heat - 0.33) * 3 * 127;
          g = (heat - 0.33) * 3 * 100;
          b = 255;
        } else {
          r = 255;
          g = 100 + (heat - 0.66) * 3 * 155;
          b = 255;
        }
        break;

      default:
        r = g = b = heat * 255;
    }

    return ((Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b));
  }

  // Pac-Man mode methods
  private initializePacmanMaze(): void {
    const width = this.matrix.width();  // 192
    const height = this.matrix.height();  // 64

    // Create simplified Pac-Man maze scaled to fit
    // Using 4x4 pixel cells = 48x16 grid
    const gridWidth = 48;
    const gridHeight = 16;

    this.pacmanMaze = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));

    // Draw classic Pac-Man maze pattern (simplified)
    // Outer walls
    for (let x = 0; x < gridWidth; x++) {
      this.pacmanMaze[0][x] = 1;
      this.pacmanMaze[gridHeight - 1][x] = 1;
    }
    for (let y = 0; y < gridHeight; y++) {
      this.pacmanMaze[y][0] = 1;
      this.pacmanMaze[y][gridWidth - 1] = 1;
    }

    // Simple open maze - minimal walls, no closed spaces, mirrored
    const halfWidth = Math.floor(gridWidth / 2);

    // Very sparse pattern - just a few obstacle walls
    // Top horizontal barriers (short segments, well-spaced)
    for (let x = 3; x <= 5; x++) this.pacmanMaze[3][x] = 1;
    for (let x = 10; x <= 12; x++) this.pacmanMaze[3][x] = 1;
    for (let x = 17; x <= 19; x++) this.pacmanMaze[3][x] = 1;

    // Bottom horizontal barriers (mirrored pattern)
    for (let x = 3; x <= 5; x++) this.pacmanMaze[12][x] = 1;
    for (let x = 10; x <= 12; x++) this.pacmanMaze[12][x] = 1;
    for (let x = 17; x <= 19; x++) this.pacmanMaze[12][x] = 1;

    // Middle horizontal barriers
    for (let x = 1; x <= 4; x++) this.pacmanMaze[8][x] = 1;
    for (let x = 7; x <= 10; x++) this.pacmanMaze[8][x] = 1;
    for (let x = 13; x <= 16; x++) this.pacmanMaze[8][x] = 1;

    // Vertical barriers (short, non-connecting)
    // Left side
    for (let y = 5; y <= 7; y++) this.pacmanMaze[y][6] = 1;
    for (let y = 9; y <= 11; y++) this.pacmanMaze[y][6] = 1;

    // Center-left
    for (let y = 1; y <= 2; y++) this.pacmanMaze[y][13] = 1;
    for (let y = 5; y <= 6; y++) this.pacmanMaze[y][13] = 1;
    for (let y = 10; y <= 11; y++) this.pacmanMaze[y][13] = 1;
    for (let y = 13; y <= 14; y++) this.pacmanMaze[y][13] = 1;

    // Near center
    for (let y = 1; y <= 2; y++) this.pacmanMaze[y][18] = 1;
    for (let y = 13; y <= 14; y++) this.pacmanMaze[y][18] = 1;

    // Mirror the left half to create right half
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 1; x < halfWidth; x++) {
        const mirrorX = gridWidth - 1 - x;
        this.pacmanMaze[y][mirrorX] = this.pacmanMaze[y][x];
      }
    }

    // Ghost house in center (outline with door at top)
    for (let x = 21; x <= 26; x++) {
      this.pacmanMaze[7][x] = 1;  // Top wall
      this.pacmanMaze[9][x] = 1;  // Bottom wall
    }
    for (let y = 7; y <= 9; y++) {
      this.pacmanMaze[y][21] = 1; // Left wall
      this.pacmanMaze[y][26] = 1; // Right wall
    }
    // Door opening at top center
    this.pacmanMaze[7][23] = 0;
    this.pacmanMaze[7][24] = 0;

    // Now fill empty corridors with dots (2) and power pellets (3)
    let dotCount = 0;
    for (let y = 1; y < gridHeight - 1; y++) {
      for (let x = 1; x < gridWidth - 1; x++) {
        if (this.pacmanMaze[y][x] === 0) {
          // Power pellets in four corners of the play area
          if ((x === 1 && y === 1) || (x === gridWidth - 2 && y === 1) ||
              (x === 1 && y === gridHeight - 2) || (x === gridWidth - 2 && y === gridHeight - 2)) {
            this.pacmanMaze[y][x] = 3;
            dotCount++;
          } else {
            // Regular dot
            this.pacmanMaze[y][x] = 2;
            dotCount++;
          }
        }
      }
    }

    this.pacmanDotsRemaining = dotCount;

    // Initialize Pac-Man position (left side corridor)
    this.pacmanPos = {x: 7, y: 8};
    this.pacmanDir = {x: 1, y: 0};
    this.pacmanMaze[this.pacmanPos.y][this.pacmanPos.x] = 0; // Clear starting position

    // Initialize ghosts (4 ghosts: red, pink, cyan, orange) - start just outside/inside ghost house
    this.ghosts = [
      {x: 23, y: 6, color: 0xFF0000, mode: 'chase', dir: {x: 1, y: 0}},  // Blinky (red) - just outside entrance
      {x: 24, y: 6, color: 0xFFB8FF, mode: 'chase', dir: {x: -1, y: 0}}, // Pinky (pink) - just outside entrance
      {x: 22, y: 8, color: 0x00FFFF, mode: 'scatter', dir: {x: 1, y: 0}}, // Inky (cyan) - inside house
      {x: 25, y: 8, color: 0xFFB852, mode: 'scatter', dir: {x: -1, y: 0}},  // Clyde (orange) - inside house
    ];

    this.pacmanScore = 0;
    this.pacmanPowerMode = false;
    this.pacmanPowerTimer = 0;
  }

  private drawPacman(): void {
    const width = this.matrix.width();
    const height = this.matrix.height();
    const cellSize = 4; // 4x4 pixels per grid cell

    // Initialize if needed
    if (this.pacmanMaze.length === 0) {
      this.initializePacmanMaze();
    }

    // Get speed setting
    const speed = this.state.pacmanSpeed || 'normal';
    const speedMap = { slow: 4, normal: 2, fast: 1 };
    const moveInterval = speedMap[speed];

    // Update game logic
    if (this.animationFrame % moveInterval === 0) {
      this.updatePacmanGame();
    }

    // Render maze
    this.renderPacmanMaze(cellSize);

    // Render Pac-Man
    this.renderPacmanCharacter(cellSize);

    // Render ghosts
    this.renderPacmanGhosts(cellSize);
  }

  private updatePacmanGame(): void {
    const gridWidth = this.pacmanMaze[0].length;
    const gridHeight = this.pacmanMaze.length;

    // Update power mode timer
    if (this.pacmanPowerMode) {
      this.pacmanPowerTimer--;
      if (this.pacmanPowerTimer <= 0) {
        this.pacmanPowerMode = false;
        // Return ghosts to chase mode
        this.ghosts.forEach(ghost => {
          if (ghost.mode === 'frightened') {
            ghost.mode = 'chase';
          }
        });
      }
    }

    // Move Pac-Man with improved AI
    // Find nearest dot
    let nearestDotDist = Infinity;
    let nearestDotX = this.pacmanPos.x;
    let nearestDotY = this.pacmanPos.y;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        if (this.pacmanMaze[y][x] === 2 || this.pacmanMaze[y][x] === 3) {
          const dist = Math.abs(x - this.pacmanPos.x) + Math.abs(y - this.pacmanPos.y);
          if (dist < nearestDotDist) {
            nearestDotDist = dist;
            nearestDotX = x;
            nearestDotY = y;
          }
        }
      }
    }

    // Try to move toward nearest dot, but avoid reversing direction
    const directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
    const reverseDir = {x: -this.pacmanDir.x, y: -this.pacmanDir.y};

    let bestDir = this.pacmanDir;
    let bestDist = Infinity;
    let foundValidMove = false;

    // First try current direction
    const continuePos = {
      x: this.pacmanPos.x + this.pacmanDir.x,
      y: this.pacmanPos.y + this.pacmanDir.y
    };
    if (continuePos.x >= 0 && continuePos.x < gridWidth &&
        continuePos.y >= 0 && continuePos.y < gridHeight &&
        this.pacmanMaze[continuePos.y][continuePos.x] !== 1) {
      this.pacmanPos = continuePos;
      foundValidMove = true;
    } else {
      // Current direction blocked, find best alternative (avoid reverse unless necessary)
      for (const dir of directions) {
        // Skip reverse direction on first pass
        if (dir.x === reverseDir.x && dir.y === reverseDir.y) continue;

        const testPos = {x: this.pacmanPos.x + dir.x, y: this.pacmanPos.y + dir.y};
        if (testPos.x >= 0 && testPos.x < gridWidth &&
            testPos.y >= 0 && testPos.y < gridHeight &&
            this.pacmanMaze[testPos.y][testPos.x] !== 1) {
          const dist = Math.abs(testPos.x - nearestDotX) + Math.abs(testPos.y - nearestDotY);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = dir;
            foundValidMove = true;
          }
        }
      }

      // If still no valid move, allow reverse direction
      if (!foundValidMove) {
        const testPos = {x: this.pacmanPos.x + reverseDir.x, y: this.pacmanPos.y + reverseDir.y};
        if (testPos.x >= 0 && testPos.x < gridWidth &&
            testPos.y >= 0 && testPos.y < gridHeight &&
            this.pacmanMaze[testPos.y][testPos.x] !== 1) {
          bestDir = reverseDir;
          foundValidMove = true;
        }
      }

      if (foundValidMove) {
        this.pacmanDir = bestDir;
        this.pacmanPos = {
          x: this.pacmanPos.x + bestDir.x,
          y: this.pacmanPos.y + bestDir.y
        };
      }
    }

    // Check for dot/pellet collision
    const cell = this.pacmanMaze[this.pacmanPos.y][this.pacmanPos.x];
    if (cell === 2) {
      // Ate dot
      this.pacmanScore += 10;
      this.pacmanDotsRemaining--;
      this.pacmanMaze[this.pacmanPos.y][this.pacmanPos.x] = 0;
    } else if (cell === 3) {
      // Ate power pellet
      this.pacmanScore += 50;
      this.pacmanDotsRemaining--;
      this.pacmanMaze[this.pacmanPos.y][this.pacmanPos.x] = 0;
      this.pacmanPowerMode = true;
      this.pacmanPowerTimer = 60; // ~6 seconds at 10fps
      this.ghosts.forEach(ghost => ghost.mode = 'frightened');
    }

    // Check for level completion
    if (this.pacmanDotsRemaining === 0) {
      this.initializePacmanMaze(); // Reset level
    }

    // Move ghosts
    this.updatePacmanGhosts(gridWidth, gridHeight);

    // Check ghost collisions
    this.ghosts.forEach(ghost => {
      if (Math.abs(ghost.x - this.pacmanPos.x) < 1 &&
          Math.abs(ghost.y - this.pacmanPos.y) < 1) {
        if (this.pacmanPowerMode && ghost.mode === 'frightened') {
          // Pac-Man eats ghost
          this.pacmanScore += 200;
          ghost.x = 23; // Return to ghost house center
          ghost.y = 8;  // Inside the ghost house
          ghost.mode = 'scatter';
        } else if (ghost.mode !== 'frightened') {
          // Ghost catches Pac-Man - reset to starting position
          this.pacmanPos = {x: 7, y: 8};
          this.pacmanDir = {x: 1, y: 0};
        }
      }
    });
  }

  private updatePacmanGhosts(gridWidth: number, gridHeight: number): void {
    const difficulty = this.state.pacmanDifficulty || 'normal';

    this.ghosts.forEach(ghost => {
      // Simple ghost AI
      let targetX, targetY;

      if (ghost.mode === 'frightened') {
        // Run away from Pac-Man
        targetX = ghost.x - (this.pacmanPos.x - ghost.x);
        targetY = ghost.y - (this.pacmanPos.y - ghost.y);
      } else if (ghost.mode === 'chase') {
        // Chase Pac-Man (with difficulty modifier)
        if (difficulty === 'easy') {
          // Random movement
          targetX = Math.floor(Math.random() * gridWidth);
          targetY = Math.floor(Math.random() * gridHeight);
        } else {
          targetX = this.pacmanPos.x;
          targetY = this.pacmanPos.y;
        }
      } else {
        // Scatter to corners
        targetX = ghost.color === 0xFF0000 ? gridWidth - 2 : 2;
        targetY = ghost.color === 0xFF0000 ? 2 : gridHeight - 2;
      }

      // Move ghost toward target (avoid reversing unless necessary)
      const directions = [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}];
      const reverseDir = {x: -ghost.dir.x, y: -ghost.dir.y};
      let bestDir = ghost.dir;
      let bestDist = Infinity;
      let foundMove = false;

      // Try all directions except reverse first
      for (const dir of directions) {
        if (dir.x === reverseDir.x && dir.y === reverseDir.y) continue;

        const testPos = {x: ghost.x + dir.x, y: ghost.y + dir.y};
        if (testPos.x >= 0 && testPos.x < gridWidth &&
            testPos.y >= 0 && testPos.y < gridHeight &&
            this.pacmanMaze[testPos.y][testPos.x] !== 1) {
          const dist = Math.abs(testPos.x - targetX) + Math.abs(testPos.y - targetY);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = dir;
            foundMove = true;
          }
        }
      }

      // If no valid move found, allow reverse direction
      if (!foundMove) {
        const testPos = {x: ghost.x + reverseDir.x, y: ghost.y + reverseDir.y};
        if (testPos.x >= 0 && testPos.x < gridWidth &&
            testPos.y >= 0 && testPos.y < gridHeight &&
            this.pacmanMaze[testPos.y][testPos.x] !== 1) {
          bestDir = reverseDir;
          foundMove = true;
        }
      }

      if (foundMove) {
        ghost.dir = bestDir;
        ghost.x += ghost.dir.x;
        ghost.y += ghost.dir.y;
      }

      // Wrap around edges (tunnel effect)
      if (ghost.x < 0) ghost.x = gridWidth - 1;
      if (ghost.x >= gridWidth) ghost.x = 0;
    });
  }

  private renderPacmanMaze(cellSize: number): void {
    for (let y = 0; y < this.pacmanMaze.length; y++) {
      for (let x = 0; x < this.pacmanMaze[0].length; x++) {
        const cell = this.pacmanMaze[y][x];
        const px = x * cellSize;
        const py = y * cellSize;

        if (cell === 1) {
          // Wall - blue
          for (let dy = 0; dy < cellSize; dy++) {
            for (let dx = 0; dx < cellSize; dx++) {
              this.matrix.fgColor(0x2121FF).setPixel(px + dx, py + dy);
            }
          }
        } else if (cell === 2) {
          // Dot - white pixel in center
          this.matrix.fgColor(0xFFFFFF).setPixel(px + Math.floor(cellSize/2), py + Math.floor(cellSize/2));
        } else if (cell === 3) {
          // Power pellet - larger white circle
          for (let dy = 1; dy < cellSize - 1; dy++) {
            for (let dx = 1; dx < cellSize - 1; dx++) {
              this.matrix.fgColor(0xFFFFFF).setPixel(px + dx, py + dy);
            }
          }
        }
      }
    }
  }

  private renderPacmanCharacter(cellSize: number): void {
    const px = this.pacmanPos.x * cellSize;
    const py = this.pacmanPos.y * cellSize;

    // Draw Pac-Man as yellow circle (4x4)
    const color = 0xFFFF00; // Yellow
    for (let dy = 0; dy < cellSize; dy++) {
      for (let dx = 0; dx < cellSize; dx++) {
        // Simple circle
        const centerDist = Math.sqrt((dx - cellSize/2) ** 2 + (dy - cellSize/2) ** 2);
        if (centerDist < cellSize/2) {
          this.matrix.fgColor(color).setPixel(px + dx, py + dy);
        }
      }
    }
  }

  private renderPacmanGhosts(cellSize: number): void {
    this.ghosts.forEach(ghost => {
      const px = ghost.x * cellSize;
      const py = ghost.y * cellSize;

      // Ghost color
      let color = ghost.mode === 'frightened' ? 0x2121FF : ghost.color;

      // Draw ghost as colored circle/square
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const centerDist = Math.sqrt((dx - cellSize/2) ** 2 + (dy - cellSize/2) ** 2);
          if (centerDist < cellSize/2) {
            this.matrix.fgColor(color).setPixel(px + dx, py + dy);
          }
        }
      }
    });
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

  setModeOptions(options: Partial<DisplayState>): void {
    this.state = { ...this.state, ...options };
    console.log('Mode options updated:', options);
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
