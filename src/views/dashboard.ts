import { html } from 'hono/html';
import { DisplayState } from '../matrix/MatrixController.js';

export const modeButtons = (currentMode: string) => html`
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "clock"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'clock' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: clock"></span> Clock
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "text"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'text' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: comment"></span> Text
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "weather"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'weather' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: cloud"></span> Weather
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "scroll"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'scroll' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: forward"></span> Scroll
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "rainbow"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'rainbow' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: paint-bucket"></span> Rainbow
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "plasma"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'plasma' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: star"></span> Plasma
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "squares"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'squares' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: move"></span> Squares
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "life"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'life' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: grid"></span> Life
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "pulse"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'pulse' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: heart"></span> Pulse
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "off"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'off' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: ban"></span> Off
    </button>
  </div>
`;

export const dashboard = (state: DisplayState) => html`
  <div class="uk-grid-match uk-child-width-1-2@m uk-child-width-1-1@s" uk-grid>

    <!-- Current Status Card -->
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-card-hover">
        <h3 class="uk-card-title">
          <span uk-icon="icon: info; ratio: 1.2" class="uk-margin-small-right"></span>
          Current Status
        </h3>
        <div id="status-display" hx-get="/api/status" hx-trigger="every 2s" hx-swap="innerHTML">
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
        </div>
      </div>
    </div>

    <!-- Display Modes Card -->
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-card-hover">
        <h3 class="uk-card-title">
          <span uk-icon="icon: settings; ratio: 1.2" class="uk-margin-small-right"></span>
          Display Modes
        </h3>
        <div id="mode-buttons" class="uk-grid-small uk-child-width-1-2" uk-grid>
          ${modeButtons(state.mode)}
        </div>
      </div>
    </div>

    <!-- Custom Text Card -->
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-card-hover">
        <h3 class="uk-card-title">
          <span uk-icon="icon: pencil; ratio: 1.2" class="uk-margin-small-right"></span>
          Custom Text
        </h3>
        <form hx-post="/api/text" hx-target="#message" hx-swap="innerHTML" class="uk-form-stacked">
          <div class="uk-margin">
            <input
              type="text"
              name="text"
              placeholder="Enter text to display..."
              value="${state.text || ''}"
              maxlength="50"
              class="uk-input"
            />
          </div>
          <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
            <span uk-icon="icon: check"></span> Update Text
          </button>
        </form>
        <div id="message" class="uk-margin-small-top"></div>
      </div>
    </div>

    <!-- Brightness Control Card -->
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-card-hover">
        <h3 class="uk-card-title">
          <span uk-icon="icon: sun; ratio: 1.2" class="uk-margin-small-right"></span>
          Brightness Control
        </h3>
        <form hx-post="/api/brightness" hx-target="#brightness-message" hx-swap="innerHTML" class="uk-form-stacked">
          <div class="uk-margin">
            <label class="uk-form-label">
              Brightness: <span class="uk-text-bold uk-text-primary">${state.brightness || 80}%</span>
            </label>
            <input
              type="range"
              name="brightness"
              min="0"
              max="100"
              value="${state.brightness || 80}"
              class="uk-range"
              oninput="this.previousElementSibling.querySelector('span').textContent = this.value + '%'"
            />
          </div>
          <button type="submit" class="uk-button uk-button-secondary uk-width-1-1">
            <span uk-icon="icon: check"></span> Set Brightness
          </button>
        </form>
        <div id="brightness-message" class="uk-margin-small-top"></div>
      </div>
    </div>

  </div>
`;
