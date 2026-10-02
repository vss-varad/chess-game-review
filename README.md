# Game Review

A free, browser-based chess analysis workspace. Load games from chess.com or Lichess, or paste a PGN, then review every move with Stockfish 19 running locally in a Web Worker.

## Features

- Classifies moves from Brilliant and Great through Inaccuracy, Mistake, Miss, and Blunder
- Summarizes player accuracy, average centipawn loss, and estimated game rating
- Shows an evaluation graph, evaluation bar, best-move arrows, opening names, and move explanations
- Jumps between key moments and lets you step through the game with keyboard-friendly controls
- Offers six engine analysis depths (balanced default: 14), board themes, piece sets, and optional move sounds
- Supports game archives from chess.com and Lichess, plus pasted PGN

## Run locally

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env`, add an API key for an OpenAI-compatible chat completions provider, then open the local URL printed by Vite. `npm run dev` starts both Vite and the AI Coach API. `npm ci` installs Stockfish and copies its browser worker into `public/stockfish-nnue.wasm/`.

The provider key is read by the Node server and must never be placed in a `VITE_` variable or committed. The coach sends the opening, game result, accuracy summaries, and notable Stockfish-classified moves; it does not send player names or the raw PGN.

```bash
npm run check    # type-check, lint, and tests
npm run build    # production build in dist/
npm run preview  # serve the production build locally
```

## Engine size

The full Stockfish 19 WebAssembly engine is about 99 MB. For a smaller download, install the lite engine instead (about 1.8 MB, with weaker analysis):

```bash
STOCKFISH_VARIANT=lite npm ci
```

The GitHub Pages workflow uses the lite single-threaded engine, so visitors download about 1.8 MB when they first start a review. Local installs use the full engine by default. For a smaller local build, use the lite variant above.

## Publish on GitHub Pages

The repository includes a GitHub Actions workflow for deployment. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**, then push to the `main` branch or run the **Deploy to GitHub Pages** workflow manually. The Vite base path is configured for the `chess-game-review` repository name.

GitHub Pages only hosts the static UI. To enable AI coaching in production, deploy `server/server.js` to a Node host, set `AI_API_KEY`, `AI_MODEL`, and `AI_ALLOWED_ORIGINS` there, bind to `0.0.0.0` if the host requires it, then add the non-secret repository variable `VITE_AI_COACH_ENDPOINT` with the hosted API URL ending in `/api/coach`. The server honors the host's `PORT` variable. Never add the provider key to GitHub Pages build variables. Without a hosted API, chess review and Stockfish still work; the coach remains disabled.

The backend defaults to `https://api.openai.com/v1/chat/completions` and `gpt-4o-mini`. Compatible providers can be configured with `AI_BASE_URL` and `AI_MODEL`.

## Notes

- Game rating is an estimate based on this app's accuracy lookup table; chess.com's Game Rating algorithm is not public.
- Brilliant, Great, and Miss classifications are heuristics and may differ from other review tools.
- Higher analysis depths can take significantly longer, depending on the game and device.

## Built with

React, TypeScript, Vite, Chess.js, Stockfish 19, TanStack Query, Zustand, HeroUI, Motion, and Visx. Inspired by [wintrcat](https://www.youtube.com/watch?v=N6dIEzA--7Y).
