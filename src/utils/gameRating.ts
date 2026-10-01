/**
 * Rough "game rating" estimate from accuracy.
 *
 * NOTE: chess.com's own Game Rating algorithm is not public, so this is an independent heuristic:
 * a monotone lookup (accuracy -> rating) with a confidence band that widens for short games.
 * Treat it as a ballpark, not as chess.com's number.
 */
const ANCHORS: [accuracy: number, rating: number][] = [
  [0, 100],
  [30, 250],
  [50, 500],
  [65, 900],
  [75, 1300],
  [85, 1800],
  [92, 2300],
  [96, 2700],
  [99, 3000],
  [100, 3200],
];

export interface GameRating {
  rating: number;
  /** +- margin */
  margin: number;
}

export function estimateRating(accuracy: number, movesByPlayer: number): GameRating {
  const acc = Math.min(100, Math.max(0, accuracy));
  let rating = ANCHORS[ANCHORS.length - 1][1];

  for (let i = 1; i < ANCHORS.length; i++) {
    const [a0, r0] = ANCHORS[i - 1];
    const [a1, r1] = ANCHORS[i];

    if (acc <= a1) {
      rating = r0 + ((acc - a0) / (a1 - a0)) * (r1 - r0);
      break;
    }
  }

  const margin = movesByPlayer < 10 ? 400 : movesByPlayer < 25 ? 250 : 150;

  return { rating: Math.round(rating / 50) * 50, margin };
}
