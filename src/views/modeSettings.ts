import { html } from 'hono/html';
import { DisplayState } from '../matrix/MatrixController.js';
import { imageGallery, ImageInfo } from './imageGallery.js';

// Text mode settings
export const textModeSettings = (state: DisplayState) => html`
  <h3 class="uk-card-title">Text Settings</h3>
  <form hx-post="/api/text" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Display Text</label>
      <input
        type="text"
        name="text"
        value="${state.text || ''}"
        placeholder="Enter text to display..."
        maxlength="50"
        class="uk-input"
      />
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: check"></span> Update Text
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Scroll mode settings (same as text mode, different label)
export const scrollModeSettings = (state: DisplayState) => html`
  <h3 class="uk-card-title">Scroll Settings</h3>
  <form hx-post="/api/text" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Scroll Text</label>
      <input
        type="text"
        name="text"
        value="${state.text || ''}"
        placeholder="Enter text to scroll..."
        maxlength="50"
        class="uk-input"
      />
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: check"></span> Update Text
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Weather mode settings
export const weatherModeSettings = () => html`
  <h3 class="uk-card-title">Weather Settings</h3>
  <form hx-post="/api/weather/config" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Zipcode</label>
      <input
        type="text"
        name="zipcode"
        placeholder="Enter 5-digit zipcode..."
        maxlength="5"
        pattern="[0-9]{5}"
        class="uk-input"
      />
      <p class="uk-text-meta uk-margin-small-top">
        Get your free API key at <a href="https://openweathermap.org/api" target="_blank">openweathermap.org/api</a>
      </p>
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: location"></span> Save Location
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Image mode settings (integrate image gallery inline)
export const imageModeSettings = (imageInfos: ImageInfo[], currentImagePath?: string) => html`
  <h3 class="uk-card-title">Image Settings</h3>

  <!-- Upload Form -->
  <form hx-post="/api/images/upload" hx-target="#mode-settings" hx-swap="innerHTML"
        hx-encoding="multipart/form-data" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Upload New Image</label>
      <div uk-form-custom="target: true">
        <input type="file" name="image" accept="image/*" required />
        <input class="uk-input" type="text" placeholder="Select image file..." disabled />
      </div>
      <p class="uk-text-meta uk-margin-small-top">Maximum size: 5MB. Will be resized to 192x64 pixels.</p>
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: upload"></span> Upload Image
    </button>
  </form>

  <!-- Image Gallery (inline, not separate page) -->
  <div class="uk-margin-top">
    <h4 class="uk-heading-divider">Uploaded Images</h4>
    ${imageGallery(imageInfos, currentImagePath)}
  </div>

  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Clock mode settings
export const clockModeSettings = (state: DisplayState) => html`
  <h3 class="uk-card-title">Clock Settings</h3>
  <form hx-post="/api/mode-options/clock" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Time Format</label>
      <select name="clockFormat" class="uk-select">
        <option value="12hour" ${state.clockFormat === '12hour' ? 'selected' : ''}>12-Hour (AM/PM)</option>
        <option value="24hour" ${state.clockFormat === '24hour' ? 'selected' : ''}>24-Hour</option>
      </select>
    </div>
    <div class="uk-margin">
      <label class="uk-form-label">Color Mode</label>
      <select name="clockColor" class="uk-select">
        <option value="rainbow" ${state.clockColor === 'rainbow' ? 'selected' : ''}>Rainbow Fade</option>
        <option value="solid" ${state.clockColor === 'solid' ? 'selected' : ''}>Solid Color</option>
      </select>
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: check"></span> Apply Settings
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Maze mode settings
export const mazeModeSettings = (state: DisplayState) => html`
  <h3 class="uk-card-title">Maze Settings</h3>
  <form hx-post="/api/mode-options/maze" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Solve Speed</label>
      <select name="mazeSpeed" class="uk-select">
        <option value="slow" ${state.mazeSpeed === 'slow' ? 'selected' : ''}>Slow</option>
        <option value="medium" ${state.mazeSpeed === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="fast" ${state.mazeSpeed === 'fast' ? 'selected' : ''}>Fast</option>
      </select>
    </div>
    <div class="uk-margin">
      <label class="uk-form-label">Maze Thickness</label>
      <select name="mazeThickness" class="uk-select">
        <option value="small" ${state.mazeThickness === 'small' ? 'selected' : ''}>Small (Fine Detail)</option>
        <option value="medium" ${state.mazeThickness === 'medium' ? 'selected' : ''}>Medium</option>
        <option value="large" ${state.mazeThickness === 'large' ? 'selected' : ''}>Large (Bold)</option>
      </select>
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: check"></span> Apply Settings
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Plasma mode settings
export const plasmaModeSettings = (state: DisplayState) => html`
  <h3 class="uk-card-title">Plasma Settings</h3>
  <form hx-post="/api/mode-options/plasma" hx-target="#mode-settings-message" hx-swap="innerHTML" class="uk-form-stacked">
    <div class="uk-margin">
      <label class="uk-form-label">Pattern Algorithm</label>
      <select name="plasmaPattern" class="uk-select">
        <option value="classic" ${state.plasmaPattern === 'classic' ? 'selected' : ''}>Classic</option>
        <option value="waves" ${state.plasmaPattern === 'waves' ? 'selected' : ''}>Waves</option>
        <option value="cellular" ${state.plasmaPattern === 'cellular' ? 'selected' : ''}>Cellular</option>
        <option value="psychedelic" ${state.plasmaPattern === 'psychedelic' ? 'selected' : ''}>Psychedelic</option>
      </select>
    </div>
    <button type="submit" class="uk-button uk-button-primary uk-width-1-1">
      <span uk-icon="icon: check"></span> Apply Settings
    </button>
  </form>
  <div id="mode-settings-message" class="uk-margin-small-top"></div>
`;

// Empty settings for modes with no config
export const emptyModeSettings = (modeName: string) => html`
  <h3 class="uk-card-title">${modeName} Mode</h3>
  <p class="uk-text-muted uk-text-center uk-margin-medium-top">
    <span uk-icon="icon: info; ratio: 2" class="uk-text-muted"></span>
  </p>
  <p class="uk-text-muted uk-text-center">No settings available for this mode.</p>
`;

// Main function to get settings for current mode
export const getModeSettings = (state: DisplayState, imageInfos?: ImageInfo[], currentImagePath?: string) => {
  switch (state.mode) {
    case 'text':
      return textModeSettings(state);
    case 'scroll':
      return scrollModeSettings(state);
    case 'weather':
      return weatherModeSettings();
    case 'image':
      return imageModeSettings(imageInfos || [], currentImagePath);
    case 'clock':
      return clockModeSettings(state);
    case 'rainbow':
      return emptyModeSettings('Rainbow');
    case 'plasma':
      return plasmaModeSettings(state);
    case 'squares':
      return emptyModeSettings('Squares');
    case 'life':
      return emptyModeSettings('Game of Life');
    case 'pulse':
      return emptyModeSettings('Pulse');
    case 'maze':
      return mazeModeSettings(state);
    case 'off':
      return emptyModeSettings('Off');
    default:
      return emptyModeSettings('Unknown');
  }
};
