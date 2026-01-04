import { html } from 'hono/html';

export interface ImageInfo {
  filename: string;
  path: string;
  isActive: boolean;
}

export const imageGalleryPage = (images: ImageInfo[], currentImage?: string) => html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Management - LED Matrix Controller</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.16.26/dist/css/uikit.min.css" />
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.16.26/dist/js/uikit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/uikit@3.16.26/dist/js/uikit-icons.min.js"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="uk-background-muted uk-height-viewport">
  <div class="uk-container uk-container-large uk-padding">

    <!-- Header -->
    <div class="uk-flex uk-flex-between uk-flex-middle uk-margin-medium-bottom">
      <h1 class="uk-heading-small uk-margin-remove">
        <span uk-icon="icon: image; ratio: 1.5" class="uk-margin-small-right"></span>
        Image Management
      </h1>
      <a href="/" class="uk-button uk-button-default">
        <span uk-icon="icon: arrow-left"></span> Back to Dashboard
      </a>
    </div>

    <!-- Upload Section -->
    <div class="uk-card uk-card-default uk-card-body uk-margin-large-bottom">
      <h3 class="uk-card-title">
        <span uk-icon="icon: cloud-upload; ratio: 1.2" class="uk-margin-small-right"></span>
        Upload New Image
      </h3>
      <form
        hx-post="/api/images/upload"
        hx-target="#gallery-container"
        hx-encoding="multipart/form-data"
        class="uk-form-stacked">
        <div class="uk-margin">
          <div uk-form-custom="target: true">
            <input type="file" name="image" accept="image/*" required>
            <input class="uk-input" type="text" placeholder="Select image file..." disabled>
          </div>
          <p class="uk-text-meta uk-margin-small-top">
            Supported formats: PNG, JPG, JPEG, GIF | Max size: 5MB | Will be resized to 128x64
          </p>
        </div>
        <button type="submit" class="uk-button uk-button-primary">
          <span uk-icon="icon: upload"></span> Upload Image
        </button>
      </form>
      <div id="upload-message" class="uk-margin-top"></div>
    </div>

    <!-- Gallery Section -->
    <div class="uk-card uk-card-default uk-card-body">
      <h3 class="uk-card-title">
        <span uk-icon="icon: folder; ratio: 1.2" class="uk-margin-small-right"></span>
        Image Gallery
      </h3>
      <div id="gallery-container">
        ${imageGallery(images, currentImage)}
      </div>
    </div>

  </div>
</body>
</html>
`;

export const imageGallery = (images: ImageInfo[], currentImage?: string) => {
  if (images.length === 0) {
    return html`
      <div class="uk-alert uk-alert-primary" uk-alert>
        <p>
          <span uk-icon="icon: info"></span>
          No images uploaded yet. Use the form above to upload your first image!
        </p>
      </div>
    `;
  }

  return html`
    <div class="uk-grid uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l" uk-grid>
      ${images.map(image => html`
        <div>
          <div class="uk-card uk-card-small uk-card-default ${image.isActive ? 'uk-card-primary' : ''}">
            <div class="uk-card-media-top" style="height: 150px; background: #000; display: flex; align-items: center; justify-content: center;">
              <img src="${image.path}" alt="${image.filename}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
            <div class="uk-card-body uk-padding-small">
              <h4 class="uk-card-title uk-margin-remove-bottom uk-text-truncate" style="font-size: 0.875rem;">
                ${image.filename}
              </h4>
              ${image.isActive ? html`
                <span class="uk-badge uk-margin-small-top">Active</span>
              ` : ''}
            </div>
            <div class="uk-card-footer uk-padding-small">
              <div class="uk-button-group uk-width-1-1">
                ${!image.isActive ? html`
                  <button
                    hx-post="/api/images/set-active"
                    hx-vals='{"filename": "${image.filename}"}'
                    hx-target="#mode-settings"
                    hx-swap="innerHTML"
                    class="uk-button uk-button-small uk-button-primary uk-width-1-2">
                    <span uk-icon="icon: check; ratio: 0.8"></span> Activate
                  </button>
                ` : html`
                  <button class="uk-button uk-button-small uk-button-default uk-width-1-2" disabled>
                    <span uk-icon="icon: check; ratio: 0.8"></span> Active
                  </button>
                `}
                <button
                  hx-post="/api/images/delete"
                  hx-vals='{"filename": "${image.filename}"}'
                  hx-target="#mode-settings"
                  hx-swap="innerHTML"
                  hx-confirm="Are you sure you want to delete this image?"
                  class="uk-button uk-button-small uk-button-danger uk-width-1-2">
                  <span uk-icon="icon: trash; ratio: 0.8"></span> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      `)}
    </div>
  `;
};
