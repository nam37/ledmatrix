import { html } from 'hono/html';

export const layout = (title: string, content: string) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <link rel="stylesheet" href="/styles.css" />
    </head>
    <body>
      <header>
        <h1>🎨 LED Matrix Controller</h1>
      </header>
      <main>${content}</main>
      <footer>
        <p>Powered by Hono + HTMX + rpi-led-matrix</p>
      </footer>
    </body>
  </html>
`;
