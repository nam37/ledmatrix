import { html } from 'hono/html';
import { DisplayState } from '../matrix/MatrixController.js';
import { getModeSettings } from './modeSettings.js';
import { ImageInfo } from './imageGallery.js';

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
      hx-vals='{"mode": "image"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'image' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: image"></span> Image
    </button>
  </div>
  <div>
    <button
      hx-post="/api/mode"
      hx-vals='{"mode": "maze"}'
      hx-target="#mode-buttons"
      hx-swap="innerHTML"
      class="uk-button uk-button-default uk-width-1-1 ${currentMode === 'maze' ? 'uk-button-primary' : ''}">
      <span uk-icon="icon: git-branch"></span> Maze
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

export const dashboard = (state: DisplayState, imageInfos?: ImageInfo[], currentImagePath?: string) => html`
  <div class="uk-child-width-1-2@m uk-child-width-1-1@s" uk-grid>

    <!-- TOP LEFT: Current Mode Status -->
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

    <!-- TOP RIGHT: Mode-Specific Settings -->
    <div>
      <div id="mode-settings" class="uk-card uk-card-default uk-card-body uk-card-hover">
        ${getModeSettings(state, imageInfos, currentImagePath)}
      </div>
    </div>

    <!-- BOTTOM LEFT: Mode Selection Buttons -->
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

    <!-- BOTTOM RIGHT: System Settings -->
    <div>
      <div class="uk-card uk-card-default uk-card-body uk-card-hover">
        <h3 class="uk-card-title">
          <span uk-icon="icon: cog; ratio: 1.2" class="uk-margin-small-right"></span>
          System Settings
        </h3>

        <!-- Brightness Control -->
        <div class="uk-margin">
          <label class="uk-form-label">
            Brightness: <span class="uk-text-bold uk-text-primary">${state.brightness || 80}%</span>
          </label>
          <form hx-post="/api/brightness" hx-target="#brightness-message" hx-swap="innerHTML" class="uk-form-stacked">
            <input
              type="range"
              name="brightness"
              min="0"
              max="100"
              value="${state.brightness || 80}"
              class="uk-range"
              oninput="this.previousElementSibling.querySelector('span').textContent = this.value + '%'"
            />
            <button type="submit" class="uk-button uk-button-secondary uk-width-1-1 uk-margin-small-top">
              <span uk-icon="icon: check"></span> Set Brightness
            </button>
          </form>
          <div id="brightness-message" class="uk-margin-small-top"></div>
        </div>

        <hr class="uk-divider-small">

        <!-- System Info -->
        <div class="uk-margin" id="system-info" hx-get="/api/system-info" hx-trigger="load, every 5s" hx-swap="innerHTML">
          <!-- Auto-refreshing system info will be loaded here -->
        </div>

        <hr class="uk-divider-small">

        <!-- Control Buttons -->
        <div class="uk-margin">
          <button hx-post="/api/system/restart" hx-target="#system-control-message" hx-swap="innerHTML"
                  hx-confirm="Restart the LED matrix service? This will interrupt the current display."
                  class="uk-button uk-button-danger uk-width-1-1 uk-margin-small-bottom">
            <span uk-icon="icon: refresh"></span> Restart Service
          </button>
          <button hx-post="/api/system/shutdown" hx-target="#system-control-message" hx-swap="innerHTML"
                  hx-confirm="Shutdown the Raspberry Pi? You will need to physically power it back on."
                  class="uk-button uk-button-danger uk-width-1-1">
            <span uk-icon="icon: sign-out"></span> Shutdown System
          </button>
          <div id="system-control-message" class="uk-margin-small-top"></div>
        </div>
      </div>
    </div>

  </div>
`;
