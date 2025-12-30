// Mock Matrix Controller for local development without hardware
// This simulates the LED matrix behavior for UI development

export type DisplayMode = 'clock' | 'text' | 'weather' | 'scroll' | 'rainbow' | 'plasma' | 'squares' | 'life' | 'pulse' | 'off';

export interface DisplayState {
  mode: DisplayMode;
  text?: string;
  brightness?: number;
}

export class MatrixController {
  private state: DisplayState;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      mode: 'clock',
      brightness: 80,
      text: '',
    };

    console.log('🎨 Mock Matrix initialized (Development Mode)');
    console.log('   Size: 64x192 (simulated)');
    console.log('   No hardware required - UI development mode');
  }

  start(): void {
    this.stop();

    this.updateInterval = setInterval(() => {
      this.update();
    }, 100);

    console.log('✅ Mock display loop started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private update(): void {
    // Simulate what would be displayed
    const displayContent = this.getDisplayContent();

    // Log to console instead of actual matrix (only on mode changes to avoid spam)
    // You could uncomment this to see updates in real-time:
    // console.log(`[Mock Display] ${displayContent}`);
  }

  private getDisplayContent(): string {
    switch (this.state.mode) {
      case 'clock':
        return this.getClockText();
      case 'text':
        return this.state.text || 'HELLO';
      case 'weather':
        return 'WEATHER (Mock)';
      case 'scroll':
        return `SCROLLING: ${this.state.text || 'LED MATRIX CONTROLLER'}`;
      case 'rainbow':
        return 'RAINBOW EFFECT 🌈';
      case 'plasma':
        return 'PLASMA EFFECT ✨';
      case 'squares':
        return 'ROTATING SQUARES 🔄';
      case 'life':
        return 'GAME OF LIFE 🧬';
      case 'pulse':
        return 'PULSING COLOR 💓';
      case 'off':
        return '[BLANK]';
      default:
        return '';
    }
  }

  private getClockText(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Public API
  setMode(mode: DisplayMode): void {
    this.state.mode = mode;
    console.log(`🔄 Mode changed to: ${mode}`);
    console.log(`   Display: ${this.getDisplayContent()}`);
  }

  setText(text: string): void {
    this.state.text = text;
    this.state.mode = 'text';
    console.log(`💬 Text updated: "${text}"`);
  }

  setBrightness(brightness: number): void {
    this.state.brightness = Math.max(0, Math.min(100, brightness));
    console.log(`🔆 Brightness set to: ${this.state.brightness}%`);
  }

  getState(): DisplayState {
    return { ...this.state };
  }

  shutdown(): void {
    this.stop();
    console.log('🛑 Mock matrix controller shutdown');
  }
}
