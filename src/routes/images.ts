import { Hono } from 'hono';
import { MatrixController } from '../matrix/MatrixController.js';
import { imageGalleryPage, ImageInfo } from '../views/imageGallery.js';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createImageRoutes(matrixController: MatrixController) {
  const images = new Hono();

  images.get('/', async (c) => {
    const uploadsDir = join(__dirname, '../../public/uploads');
    const currentImagePath = matrixController.getCurrentImagePath();

    try {
      const files = await readdir(uploadsDir);
      const imageFiles = files.filter(f =>
        f.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/)
      );

      const imageInfos: ImageInfo[] = imageFiles.map(filename => ({
        filename,
        path: `/uploads/${filename}`,
        isActive: currentImagePath?.includes(filename) || false
      }));

      return c.html(imageGalleryPage(imageInfos, currentImagePath));
    } catch (error) {
      console.error('Error reading uploads directory:', error);
      return c.html(imageGalleryPage([], currentImagePath));
    }
  });

  return images;
}
