import { Hono } from 'hono';
import { MatrixController, DisplayMode } from '../matrix/MatrixController.js';
import { html } from 'hono/html';

export function createApiRoutes(matrixController: MatrixController) {
  const api = new Hono();

  // Get current status
  api.get('/status', (c) => {
    const state = matrixController.getState();
    return c.html(html`
      <div class="status-item">
        <span class="label">Mode:</span>
        <span class="value">${state.mode}</span>
      </div>
      <div class="status-item">
        <span class="label">Brightness:</span>
        <span class="value">${state.brightness}%</span>
      </div>
      ${state.text ? html`
        <div class="status-item">
          <span class="label">Text:</span>
          <span class="value">${state.text}</span>
        </div>
      ` : ''}
    `);
  });

  // Change display mode
  api.post('/mode', async (c) => {
    const body = await c.req.json();
    const mode = body.mode as DisplayMode;

    if (['clock', 'text', 'weather', 'off'].includes(mode)) {
      matrixController.setMode(mode);
      return c.json({ success: true, mode });
    }

    return c.json({ success: false, error: 'Invalid mode' }, 400);
  });

  // Update text
  api.post('/text', async (c) => {
    const formData = await c.req.parseBody();
    const text = formData.text as string;

    if (text && text.length > 0) {
      matrixController.setText(text);
      return c.html(html`<div class="success">✅ Text updated to: "${text}"</div>`);
    }

    return c.html(html`<div class="error">❌ Please enter some text</div>`);
  });

  // Set brightness
  api.post('/brightness', async (c) => {
    const formData = await c.req.parseBody();
    const brightness = parseInt(formData.brightness as string);

    if (!isNaN(brightness) && brightness >= 0 && brightness <= 100) {
      matrixController.setBrightness(brightness);
      return c.html(html`<div class="success">✅ Brightness set to ${brightness}%</div>`);
    }

    return c.html(html`<div class="error">❌ Invalid brightness value</div>`);
  });

  return api;
}
