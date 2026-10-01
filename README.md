# Game Review

A free, in-browser chess game review in the style of chess.com's Game Review. Load a game from chess.com, lichess, or paste a PGN; Stockfish 19 runs locally in a Web Worker.

## What you get

- Move classifications: Brilliant, Great, Best, Excellent, Good, Book, Inaccuracy, Mistake, Miss, Blunder
- Accuracy per player (Lichess-style win-probability curve, volatility-weighted) and average centipawn loss
- Estimated game rating per player (heuristic, see below)
- Evaluation graph, eval bar, best-move arrows, "Best was …" hints, opening names
- One-line explanations built from the engine's win-chance numbers, and Previous/Next **key moment** buttons
- Selectable analysis depth (12 / 14 / 16 / 18, default 14)

## Run it

```bash
npm install     # also copies the Stockfish 19 engine into public/stockfish-nnue.wasm/
npm run dev
```

Production build: `npm run build` (output in `dist/`).

The full engine's wasm is ~99 MB. If your host limits file size, install with the lite engine (~1.8 MB, weaker):

```bash
STOCKFISH_VARIANT=lite npm install
```

## Notes and limits

- **Game rating is an estimate.** chess.com's Game Rating algorithm isn't public. This app maps accuracy to a rating with its own lookup table and shows a ± band that widens for short games.
- **Brilliant / Great / Miss are heuristics** (sacrifice detection, "only move" gap between engine lines, missed chances after an opponent error). They won't always match chess.com's labels.
- Analysis depth is chosen on the screen before you generate a review (MultiPV 3). Higher depth = more reliable labels, slower review.
- Not implemented: chess.com's interactive "Retry" mode (playing the best move on the board).
- `npm run check` runs type-check, lint and tests.

## Built with

Chess.js, React, TanStack Query, Zustand, HeroUI, Motion, Visx, Stockfish 19. Inspired by [wintrcat](https://www.youtube.com/watch?v=N6dIEzA--7Y).
