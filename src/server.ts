import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { MatrixController } from './matrix/MatrixController.js';
import { createApiRoutes } from './routes/api.js';
import { createPageRoutes } from './routes/pages.js';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new Hono();

// Initialize LED Matrix Controller
const matrixController = new MatrixController();
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

// Routes
app.route('/', createPageRoutes(matrixController));
app.route('/api', createApiRoutes(matrixController));

// Start server
const port = parseInt(process.env.PORT || '3000');

console.log(`🚀 LED Matrix Controller starting on port ${port}...`);
console.log(`📱 Open http://localhost:${port} in your browser`);

serve({
  fetch: app.fetch,
  port,
});
