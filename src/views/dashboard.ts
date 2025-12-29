import { html } from 'hono/html';
import { DisplayState } from '../matrix/MatrixController.js';

export const dashboard = (state: DisplayState) => html`
  <div class="dashboard">
    <section class="status-card">
      <h2>Current Status</h2>
      <div id="status-display" hx-get="/api/status" hx-trigger="every 2s" hx-swap="innerHTML">
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
      </div>
    </section>

    <section class="control-card">
      <h2>Display Modes</h2>
      <div class="button-group">
        <button
          hx-post="/api/mode"
          hx-vals='{"mode": "clock"}'
          hx-swap="none"
          class="btn ${state.mode === 'clock' ? 'active' : ''}">
          🕐 Clock
        </button>
        <button
          hx-post="/api/mode"
          hx-vals='{"mode": "text"}'
          hx-swap="none"
          class="btn ${state.mode === 'text' ? 'active' : ''}">
          💬 Text
        </button>
        <button
          hx-post="/api/mode"
          hx-vals='{"mode": "weather"}'
          hx-swap="none"
          class="btn ${state.mode === 'weather' ? 'active' : ''}">
          🌤️ Weather
        </button>
        <button
          hx-post="/api/mode"
          hx-vals='{"mode": "off"}'
          hx-swap="none"
          class="btn ${state.mode === 'off' ? 'active' : ''}">
          ⚫ Off
        </button>
      </div>
    </section>

    <section class="control-card">
      <h2>Custom Text</h2>
      <form hx-post="/api/text" hx-target="#message" hx-swap="innerHTML">
        <input
          type="text"
          name="text"
          placeholder="Enter text to display..."
          value="${state.text || ''}"
          maxlength="50"
        />
        <button type="submit" class="btn btn-primary">Update Text</button>
      </form>
      <div id="message" class="message"></div>
    </section>

    <section class="control-card">
      <h2>Brightness</h2>
      <form hx-post="/api/brightness" hx-target="#brightness-message" hx-swap="innerHTML">
        <div class="slider-container">
          <input
            type="range"
            name="brightness"
            min="0"
            max="100"
            value="${state.brightness || 80}"
            class="slider"
          />
          <span class="slider-value">${state.brightness || 80}%</span>
        </div>
        <button type="submit" class="btn btn-secondary">Set Brightness</button>
      </form>
      <div id="brightness-message" class="message"></div>
    </section>
  </div>
`;
