# Tetris

A browser-based Tetris implementation. This repository currently contains the
development environment and tooling setup (TETR-61); gameplay features land in
later tickets.

## Tech stack

- **Language:** TypeScript
- **Bundler / dev server:** [Vite](https://vitejs.dev/)
- **Test runner:** [Vitest](https://vitest.dev/) (for pure game-logic modules)
- **Linting / formatting:** ESLint + Prettier
- **Build output:** static assets (local-first, no backend required)

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (tested on Node 22)
- npm 10+ (ships with Node)

## Setup

Clone the repository and check out a feature branch:

```bash
git clone https://github.com/MuhammadAbyaz/tetris.git
cd tetris
git checkout -b your-feature-branch
```

Install dependencies:

```bash
npm install
```

This installs all dependencies and produces a `package-lock.json`.

## Development

Start the Vite dev server with hot module reload:

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in a browser.
The page currently renders a placeholder playfield shell — full game
mechanics are implemented in later tickets.

## Linting and formatting

```bash
npm run lint           # ESLint
npm run format         # Prettier (writes fixes)
npm run format:check   # Prettier (check only, no writes)
```

## Testing

```bash
npm run test
```

Runs the Vitest suite, including a smoke test that verifies the pure
game-logic module (`src/game/logic.ts`) is importable and behaves correctly.

## Production build

```bash
npm run build
```

Type-checks the project and produces a static production build in `dist/`.
Preview it locally with:

```bash
npm run preview
```

## Scope

This ticket (TETR-61) covers environment and tooling setup only:

- Node/TypeScript/Vite toolchain
- `npm install` / `npm run dev` working with hot reload
- ESLint + Prettier configuration
- A minimal pure game-logic module with a Vitest smoke test
- Production build via `npm run build`

Core game mechanics (board, tetrominoes, rotation/SRS, scoring), multiplayer,
backend services, CI/CD, and deployment are out of scope and covered by later
tickets.
