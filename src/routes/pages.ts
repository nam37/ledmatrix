import { Hono } from 'hono';
import { MatrixController } from '../matrix/MatrixController.js';
import { layout } from '../views/layout.js';
import { dashboard } from '../views/dashboard.js';
import { ImageInfo } from '../views/imageGallery.js';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createPageRoutes(matrixController: MatrixController) {
  const pages = new Hono();

  // Main dashboard
  pages.get('/', async (c) => {
    const state = matrixController.getState();

    // Fetch images if in image mode
    let imageInfos: ImageInfo[] = [];
    let currentImagePath: string | undefined;

    if (state.mode === 'image') {
      const uploadsDir = join(__dirname, '../../public/uploads');
      const files = await readdir(uploadsDir);
      const imageFiles = files.filter(f => f.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/));
      currentImagePath = matrixController.getCurrentImagePath();
      imageInfos = imageFiles.map(f => ({
        filename: f,
        path: `/uploads/${f}`,
        isActive: currentImagePath?.includes(f) || false
      }));
    }

    return c.html(layout('LED Matrix Dashboard', dashboard(state, imageInfos, currentImagePath) as any));
  });

  return pages;
}
