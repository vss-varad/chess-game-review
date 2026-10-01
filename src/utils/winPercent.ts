/** Win chance (0-100) for White from a centipawn score. Same logistic curve Lichess publishes. */
export function cpToWinPercent(cp: number) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Eval as stored in the eval store: number (cp), '+M3' / '-M3', or a result string. White's perspective. */
export function evalToWinPercent(evaluation: string | number) {
  if (typeof evaluation === 'number')
    return cpToWinPercent(evaluation);
  if (evaluation === '1-0')
    return 100;
  if (evaluation === '0-1')
    return 0;
  if (evaluation === '1/2-1/2')
    return 50;

  return evaluation.startsWith('-') ? 0 : 100;
}

/** Same as above but from the point of view of the side that just moved / is to move. */
export function evalToWinPercentFor(evaluation: string | number, color: 'w' | 'b') {
  const white = evalToWinPercent(evaluation);

  return color === 'w' ? white : 100 - white;
}

/** Centipawns clamped to +-1000 (mates and results become +-1000). */
export function evalToClampedCp(evaluation: string | number) {
  if (typeof evaluation === 'number')
    return Math.max(-1000, Math.min(1000, evaluation));
  if (evaluation === '1/2-1/2')
    return 0;
  if (evaluation === '1-0')
    return 1000;
  if (evaluation === '0-1')
    return -1000;

  return evaluation.startsWith('-') ? -1000 : 1000;
}
