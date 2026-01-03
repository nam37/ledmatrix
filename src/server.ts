import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApiRoutes } from './routes/api.js';
import { createPageRoutes } from './routes/pages.js';
import { createImageRoutes } from './routes/images.js';
import * as dotenv from 'dotenv';
import * as os from 'os';

dotenv.config();

const app = new Hono();

// Use mock controller for development on non-Pi systems
const isRaspberryPi = os.platform() === 'linux' && os.arch() === 'arm64';
const isDevelopment = process.env.NODE_ENV === 'development' || !isRaspberryPi;

let MatrixController: any;
if (isDevelopment) {
  console.log('🔧 Development Mode: Using Mock Matrix Controller');
  const MockModule = await import('./matrix/MockMatrixController.js');
  MatrixController = MockModule.MatrixController;
} else {
  console.log('🎨 Production Mode: Using Real Matrix Controller');
  const RealModule = await import('./matrix/MatrixController.js');
  MatrixController = RealModule.MatrixController;
}

// Initialize LED Matrix Controller
const matrixController: any = new MatrixController();
matrixController.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  matrixController.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  matrixController.shutdown();
  process.exit(0);
});

// Static files
app.use('/styles.css', serveStatic({ path: './public/styles.css' }));
app.use('/assets/*', serveStatic({ root: './public' }));
app.use('/uploads/*', serveStatic({ root: './public' }));

// Routes
app.route('/', createPageRoutes(matrixController));
app.route('/api', createApiRoutes(matrixController));
app.route('/images', createImageRoutes(matrixController));

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 LED Matrix Controller starting on port ${port}...`);
console.log(`📱 Open http://localhost:${port} in your browser`);

serve({
  fetch: app.fetch,
  port,
});
