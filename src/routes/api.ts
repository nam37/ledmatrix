import { Hono } from 'hono';
import { MatrixController, DisplayMode } from '../matrix/MatrixController.js';
import { html } from 'hono/html';
import { modeButtons } from '../views/dashboard.js';
import { imageGallery, ImageInfo } from '../views/imageGallery.js';
import { writeFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApiRoutes(matrixController: MatrixController) {
  const api = new Hono();

  // Get current status
  api.get('/status', (c) => {
    const state = matrixController.getState();
    return c.html(html`
      <dl class="uk-description-list uk-description-list-divider">
        <dt>Mode</dt>
        <dd class="uk-text-bold uk-text-primary">${state.mode.toUpperCase()}</dd>
        <dt>Brightness</dt>
        <dd class="uk-text-bold">${state.brightness}%</dd>
        ${state.text ? html`
          <dt>Display Text</dt>
          <dd class="uk-text-bold">"${state.text}"</dd>
        ` : ''}
      </dl>
    `);
  });

  // Change display mode
  api.post('/mode', async (c) => {
    const formData = await c.req.parseBody();
    const mode = formData.mode as DisplayMode;

    if (['clock', 'text', 'weather', 'scroll', 'rainbow', 'plasma', 'squares', 'life', 'pulse', 'image', 'maze', 'off'].includes(mode)) {
      matrixController.setMode(mode);
      return c.html(modeButtons(mode));
    }

    return c.json({ success: false, error: 'Invalid mode' }, 400);
  });

  // Update text
  api.post('/text', async (c) => {
    const formData = await c.req.parseBody();
    const text = formData.text as string;

    if (text && text.length > 0) {
      matrixController.setText(text);
      return c.html(html`
        <div class="uk-alert-success" uk-alert>
          <p><span uk-icon="icon: check"></span> Text updated to: "${text}"</p>
        </div>
      `);
    }

    return c.html(html`
      <div class="uk-alert-danger" uk-alert>
        <p><span uk-icon="icon: warning"></span> Please enter some text</p>
      </div>
    `);
  });

  // Set brightness
  api.post('/brightness', async (c) => {
    const formData = await c.req.parseBody();
    const brightness = parseInt(formData.brightness as string);

    if (!isNaN(brightness) && brightness >= 0 && brightness <= 100) {
      matrixController.setBrightness(brightness);
      return c.html(html`
        <div class="uk-alert-success" uk-alert>
          <p><span uk-icon="icon: check"></span> Brightness set to ${brightness}%</p>
        </div>
      `);
    }

    return c.html(html`
      <div class="uk-alert-danger" uk-alert>
        <p><span uk-icon="icon: warning"></span> Invalid brightness value</p>
      </div>
    `);
  });

  // Image upload
  api.post('/images/upload', async (c) => {
    try {
      const formData = await c.req.parseBody();
      const file = formData.image as File;

      if (!file) {
        return c.html(html`
          <div class="uk-alert-danger" uk-alert>
            <p><span uk-icon="icon: warning"></span> No file selected</p>
          </div>
        `);
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return c.html(html`
          <div class="uk-alert-danger" uk-alert>
            <p><span uk-icon="icon: warning"></span> File too large. Maximum size is 5MB.</p>
          </div>
        `);
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return c.html(html`
          <div class="uk-alert-danger" uk-alert>
            <p><span uk-icon="icon: warning"></span> Invalid file type. Please upload an image.</p>
          </div>
        `);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}_${originalName}`;
      const uploadsDir = join(__dirname, '../../public/uploads');
      const filepath = join(uploadsDir, filename);

      // Read file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process and save image
      await sharp(buffer)
        .resize(128, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0 } })
        .png()
        .toFile(filepath);

      // Get updated image list
      const files = await readdir(uploadsDir);
      const imageFiles = files.filter(f => f.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/));
      const currentImagePath = matrixController.getCurrentImagePath();
      const imageInfos: ImageInfo[] = imageFiles.map(f => ({
        filename: f,
        path: `/uploads/${f}`,
        isActive: currentImagePath?.includes(f) || false
      }));

      return c.html(html`
        ${imageGallery(imageInfos, currentImagePath)}
        <div class="uk-alert-success uk-margin-top" uk-alert>
          <p><span uk-icon="icon: check"></span> Image uploaded successfully!</p>
        </div>
      `);
    } catch (error) {
      console.error('Upload error:', error);
      return c.html(html`
        <div class="uk-alert-danger" uk-alert>
          <p><span uk-icon="icon: warning"></span> Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `);
    }
  });

  // Set active image
  api.post('/images/set-active', async (c) => {
    try {
      const formData = await c.req.parseBody();
      const filename = formData.filename as string;

      if (!filename) {
        return c.json({ success: false, error: 'No filename provided' }, 400);
      }

      const uploadsDir = join(__dirname, '../../public/uploads');
      const filepath = join(uploadsDir, filename);

      await matrixController.setImage(filepath);
      matrixController.setMode('image');

      // Get updated image list
      const files = await readdir(uploadsDir);
      const imageFiles = files.filter(f => f.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/));
      const currentImagePath = matrixController.getCurrentImagePath();
      const imageInfos: ImageInfo[] = imageFiles.map(f => ({
        filename: f,
        path: `/uploads/${f}`,
        isActive: currentImagePath?.includes(f) || false
      }));

      return c.html(imageGallery(imageInfos, currentImagePath));
    } catch (error) {
      console.error('Set active error:', error);
      return c.html(html`
        <div class="uk-alert-danger" uk-alert>
          <p><span uk-icon="icon: warning"></span> Failed to set active image</p>
        </div>
      `);
    }
  });

  // Delete image
  api.post('/images/delete', async (c) => {
    try {
      const formData = await c.req.parseBody();
      const filename = formData.filename as string;

      if (!filename) {
        return c.json({ success: false, error: 'No filename provided' }, 400);
      }

      const uploadsDir = join(__dirname, '../../public/uploads');
      const filepath = join(uploadsDir, filename);
      const currentImagePath = matrixController.getCurrentImagePath();

      // Delete file
      await unlink(filepath);

      // If deleting active image, reset to default
      if (currentImagePath?.includes(filename)) {
        const defaultImagePath = join(__dirname, '../../public/default-image-cropped.png');
        await matrixController.setImage(defaultImagePath);
      }

      // Get updated image list
      const files = await readdir(uploadsDir);
      const imageFiles = files.filter(f => f.toLowerCase().match(/\.(png|jpg|jpeg|gif)$/));
      const newCurrentPath = matrixController.getCurrentImagePath();
      const imageInfos: ImageInfo[] = imageFiles.map(f => ({
        filename: f,
        path: `/uploads/${f}`,
        isActive: newCurrentPath?.includes(f) || false
      }));

      return c.html(imageGallery(imageInfos, newCurrentPath));
    } catch (error) {
      console.error('Delete error:', error);
      return c.html(html`
        <div class="uk-alert-danger" uk-alert>
          <p><span uk-icon="icon: warning"></span> Failed to delete image</p>
        </div>
      `);
    }
  });

  // Configure weather location
  api.post('/weather/config', async (c) => {
    try {
      const formData = await c.req.parseBody();
      const zipcode = formData.zipcode as string;

      if (!zipcode || !/^\d{5}$/.test(zipcode)) {
        return c.html(html`
          <div class="uk-alert-danger" uk-alert>
            <p><span uk-icon="icon: warning"></span> Please enter a valid 5-digit zipcode</p>
          </div>
        `);
      }

      await matrixController.setWeatherZipcode(zipcode);

      return c.html(html`
        <div class="uk-alert-success" uk-alert>
          <p><span uk-icon="icon: check"></span> Location set to ${zipcode}</p>
        </div>
      `);
    } catch (error) {
      console.error('Weather config error:', error);
      return c.html(html`
        <div class="uk-alert-danger" uk-alert>
          <p><span uk-icon="icon: warning"></span> Failed to save location</p>
        </div>
      `);
    }
  });

  return api;
}
