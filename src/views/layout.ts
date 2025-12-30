import { html } from 'hono/html';

export const layout = (title: string, content: string) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>

      <!-- UIKit CSS -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/uikit@3.19.4/dist/css/uikit.min.css" />

      <!-- HTMX -->
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>

      <!-- UIKit JS -->
      <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.4/dist/js/uikit.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/uikit@3.19.4/dist/js/uikit-icons.min.js"></script>

      <!-- Custom styles -->
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
        <nav class="uk-navbar-container" uk-navbar>
          <div class="uk-navbar-left">
            <div class="uk-navbar-item">
              <span class="uk-text-large uk-text-bold">
                <span uk-icon="icon: tv; ratio: 1.5" class="uk-margin-small-right"></span>
                LED Matrix Controller
              </span>
            </div>
          </div>
        </nav>
      </div>

      <div class="uk-container uk-container-expand uk-margin-top">
        ${content}
      </div>

      <footer class="uk-section uk-section-secondary uk-section-small uk-margin-large-top">
        <div class="uk-container uk-text-center">
          <p class="uk-text-small uk-margin-remove">
            Powered by <span uk-icon="icon: bolt"></span> Hono + HTMX + rpi-led-matrix
          </p>
        </div>
      </footer>

      <!-- Reinitialize UIKit after HTMX swaps -->
      <script>
        document.body.addEventListener('htmx:afterSwap', function(evt) {
          if (window.UIkit) {
            UIkit.update(evt.detail.target);
          }
        });
      </script>
    </body>
  </html>
`;
