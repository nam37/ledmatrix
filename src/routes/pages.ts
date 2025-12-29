import { Hono } from 'hono';
import { MatrixController } from '../matrix/MatrixController.js';
import { layout } from '../views/layout.js';
import { dashboard } from '../views/dashboard.js';

export function createPageRoutes(matrixController: MatrixController) {
  const pages = new Hono();

  // Main dashboard
  pages.get('/', (c) => {
    const state = matrixController.getState();
    return c.html(layout('LED Matrix Dashboard', dashboard(state)));
  });

  return pages;
}
