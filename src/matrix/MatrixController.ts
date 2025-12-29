import { LedMatrix } from 'rpi-led-matrix';
import { getMatrixConfig } from './config.js';

export type DisplayMode = 'clock' | 'text' | 'weather' | 'off';

export interface DisplayState {
  mode: DisplayMode;
  text?: string;
  brightness?: number;
}

export class MatrixController {
  private matrix: LedMatrix;
  private state: DisplayState;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    const config = getMatrixConfig();
    this.matrix = new LedMatrix(config.matrixOptions, config.runtimeOptions);

    this.state = {
      mode: 'clock',
      brightness: 80,
    };

    console.log('Matrix initialized:', {
      size: `${config.matrixOptions.rows}x${config.matrixOptions.cols * (config.matrixOptions.chainLength || 1)}`,
      mapping: config.matrixOptions.hardwareMapping,
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
      case 'off':
        // Keep clear
        break;
    }

    this.matrix.sync();
  }

  private drawClock(): void {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    this.matrix
      .fgColor(0xFFD700) // Gold color
      .brightness(this.state.brightness || 80)
      .drawText(time, 20, 36);
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
