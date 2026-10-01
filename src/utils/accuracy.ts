import { evalToClampedCp, evalToWinPercent } from './winPercent';

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Accuracy of a single move from the mover's win% before/after (Lichess-style curve). */
export function moveAccuracy(winBefore: number, winAfter: number) {
  const loss = Math.max(0, winBefore - winAfter);

  return clamp(103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1, 0, 100);
}

function stdDev(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

export interface GameStats {
  /** [white, black] */
  accuracy: [number, number];
  /** average centipawn loss, [white, black] */
  acpl: [number, number];
}

/**
 * @param cps position evaluations from White's perspective, one per position (moves + 1)
 */
export function computeStats(cps: (string | number)[]): GameStats {
  const moveCount = cps.length - 1;
  if (moveCount < 1)
    return { accuracy: [0, 0], acpl: [0, 0] };

  const wins = cps.map(evalToWinPercent);
  const windowSize = clamp(Math.floor(moveCount / 10), 2, 8);
  const accs: [number[], number[]] = [[], []];
  const weights: [number[], number[]] = [[], []];
  const losses: [number[], number[]] = [[], []];

  for (let k = 0; k < moveCount; k++) {
    const side = k % 2;
    const before = side === 0 ? wins[k] : 100 - wins[k];
    const after = side === 0 ? wins[k + 1] : 100 - wins[k + 1];
    const start = Math.min(k, Math.max(0, wins.length - windowSize));

    accs[side].push(moveAccuracy(before, after));
    // moves played in volatile positions count more
    weights[side].push(clamp(stdDev(wins.slice(start, start + windowSize)), 0.5, 12));

    const cpBefore = evalToClampedCp(cps[k]);
    const cpAfter = evalToClampedCp(cps[k + 1]);
    losses[side].push(Math.max(0, side === 0 ? cpBefore - cpAfter : cpAfter - cpBefore));
  }

  const summarize = (side: 0 | 1): [number, number] => {
    const a = accs[side];
    if (a.length === 0)
      return [0, 0];

    const w = weights[side];
    const weighted = a.reduce((sum, x, i) => sum + x * w[i], 0) / w.reduce((s, x) => s + x, 0);
    const harmonic = a.length / a.reduce((sum, x) => sum + 1 / Math.max(x, 1), 0);
    const acpl = losses[side].reduce((s, x) => s + x, 0) / a.length;

    return [Number(((weighted + harmonic) / 2).toFixed(1)), Math.round(acpl)];
  };

  const [wAcc, wAcpl] = summarize(0);
  const [bAcc, bAcpl] = summarize(1);

  return { accuracy: [wAcc, bAcc], acpl: [wAcpl, bAcpl] };
}
