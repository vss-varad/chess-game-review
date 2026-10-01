import { Chess } from 'chess.js';

import { evalToWinPercentFor } from './winPercent';

import type { MoveEvalWithClass } from '../stores/useEvalStore';
import type { Classification } from './classify';
import type { Move, PieceSymbol } from 'chess.js';

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * A move is a sacrifice when a minor/major piece lands on a square where the opponent can take it
 * and, after the best recapture, the mover is at least 2 points of material down.
 */
export function isSacrifice(move: Move) {
  if (!['n', 'b', 'r', 'q'].includes(move.piece) || move.promotion)
    return false;

  const gained = move.captured ? VALUE[move.captured] : 0;

  const captures = new Chess(move.after)
    .moves({ verbose: true })
    .filter(m => m.captured && m.to === move.to);

  if (captures.length === 0)
    return false;

  let worst = Number.POSITIVE_INFINITY;

  for (const capture of captures) {
    const recaptured = new Chess(capture.after)
      .moves({ verbose: true })
      .some(m => m.captured && m.to === move.to);

    const net = gained - VALUE[move.piece] + (recaptured ? VALUE[capture.piece] : 0);
    worst = Math.min(worst, net);
  }

  return worst <= -2;
}

interface RefineInput {
  history: Move[];
  /** engine lines per position (before each move), best first */
  best3: MoveEvalWithClass[][];
  /** position evals, one per position, White's perspective */
  cps: (string | number)[];
  /** classification from the centipawn thresholds */
  base: Classification[];
}

/** Adds chess.com-style Brilliant / Great / Miss on top of the threshold classification. */
export function refineClassifications({ history, best3, cps, base }: RefineInput): Classification[] {
  return base.map((cl, i) => {
    const lines = best3[i];
    if (cl === 'book' || cl === 'forced' || !lines?.length)
      return cl;

    const color = i % 2 === 0 ? 'w' : 'b';
    const win = (e: string | number) => evalToWinPercentFor(e, color);
    const before = win(cps[i]);
    const bestWin = win(lines[0].eval);
    const playedWin = win(cps[i + 1]);
    const loss = bestWin - playedWin;
    const playedIsBest = lines[0].pv === history[i].lan;

    if (
      (cl === 'best' || cl === 'excellent')
      && loss <= 3
      && before <= 85
      && playedWin >= 45
      && isSacrifice(history[i])
    ) {
      return 'brilliant';
    }

    if (
      cl === 'best'
      && playedIsBest
      && lines.length >= 2
      && before <= 92
      && bestWin - win(lines[1].eval) >= 20
    ) {
      return 'great';
    }

    const opponentErred = i > 0 && ['inaccuracy', 'mistake', 'blunder'].includes(base[i - 1]);

    if (opponentErred && (cl === 'inaccuracy' || cl === 'mistake') && bestWin >= 65 && loss >= 10)
      return 'miss';

    // had a forced mate, didn't play it, but is still fine
    if (typeof lines[0].eval === 'string' && ['inaccuracy', 'mistake', 'blunder'].includes(cl) && playedWin >= 50)
      return 'miss';

    return cl;
  });
}
