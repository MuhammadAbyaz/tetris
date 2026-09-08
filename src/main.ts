import './style.css';
import { createEmptyBoard, DEFAULT_CONFIG } from './game/logic';

function renderPlayfield(board: number[][]): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  const grid = document.createElement('div');
  grid.className = 'playfield';
  grid.style.setProperty('--cols', String(DEFAULT_CONFIG.boardWidth));

  for (const row of board) {
    for (const cell of row) {
      const cellEl = document.createElement('div');
      cellEl.className = 'cell';
      cellEl.dataset.filled = String(cell !== 0);
      grid.appendChild(cellEl);
    }
  }

  app.innerHTML = '';
  app.appendChild(grid);
}

renderPlayfield(createEmptyBoard());
