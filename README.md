# Tetris

A browser-based Tetris game. Contributors can clone this repository, install
the frontend toolchain (Node, TypeScript, Vite), and run a local development
server with hot module reload — no backend is required.

## Tech stack

- **Language:** TypeScript
- **Bundler / dev server:** [Vite](https://vitejs.dev/)
- **Test runner:** [Vitest](https://vitest.dev/) (pure game-logic modules)
- **Linting / formatting:** ESLint + Prettier
- **Build output:** static files under `dist/` (local-first; no server)

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (see `.nvmrc`; tested on Node 22)
- npm 10+ (ships with Node)

## Setup

Clone the repository and create a feature branch:

```bash
git clone https://github.com/MuhammadAbyaz/tetris.git
cd tetris
git checkout -b your-feature-branch
```

Install dependencies:

```bash
npm install
```

This installs all packages listed in `package.json` and writes a
`package-lock.json` lockfile.

## Development

Start the Vite dev server with hot module reload:

```bash
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in a browser.
The app loads the playfield shell. Edits under `src/` reload automatically.

## Build and tooling

Scripts used for day-to-day work:

```bash
npm run lint           # ESLint
npm run format         # Prettier (writes fixes)
npm run format:check   # Prettier (check only, no writes)
npm run test           # Vitest (includes the game-logic smoke test)
npm run build          # Type-check + production bundle into dist/
npm run preview        # Serve the dist/ build locally
```

- **ESLint** (`eslint.config.js`) lints TypeScript sources.
- **Prettier** (`.prettierrc.json`) formats the tree; `package-lock.json` and
  `dist/` are ignored.
- **Vitest** runs `src/**/*.test.ts`. The smoke test in
  `src/game/logic.test.ts` imports the pure game-logic module
  (`src/game/logic.ts`) and asserts a passing result.

## Deployment

This project is a **local-first static build**. There is no backend to deploy
for local play.

```bash
npm run build
```

Type-checks the project and writes static assets to `dist/`. Preview that
output locally with:

```bash
npm run preview
```

Host the contents of `dist/` on any static file host when you are ready to
publish. CI/CD and production hosting are out of scope for the development
environment setup.

## Project layout

```
src/game/     Pure game logic (board helpers, engine, modes, scoring)
src/player/   Controls, settings, audio, themes, persistence
src/ui/       Playfield shell and chrome
src/runtime/  Frame loop, input timing, offline helpers
src/social/   Optional stretch features (accounts, versus, leaderboards)
public/       Static assets (favicon, PWA manifest, service worker)
```
