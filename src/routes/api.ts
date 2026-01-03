import { Hono } from 'hono';
import { MatrixController, DisplayMode } from '../matrix/MatrixController.js';
import { html } from 'hono/html';
import { modeButtons } from '../views/dashboard.js';

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

  return api;
}
