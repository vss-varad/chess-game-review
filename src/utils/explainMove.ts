import type { Classification } from './classify';

interface ExplainInput {
  classification: Classification;
  /** mover's win chance (0-100) before the move, after the move, and if the best move had been played */
  before: number;
  after: number;
  best: number;
  /** win chance if the second-best engine line had been played */
  secondBest?: number;
}

const pct = (n: number) => `${Math.round(n)}%`;

/** One factual sentence, built only from the engine's win-chance numbers. */
export function explainMove({ classification, before, after, best, secondBest }: ExplainInput): string | null {
  switch (classification) {
    case 'inaccuracy':
    case 'mistake':
    case 'blunder':
      return `Your winning chances went from ${pct(before)} to ${pct(after)}.`;
    case 'miss':
      return `The best move kept ${pct(best)} winning chances; this one left you with ${pct(after)}.`;
    case 'brilliant':
      return `A sacrifice that keeps your winning chances at ${pct(after)}.`;
    case 'great':
      return secondBest === undefined
        ? 'A critical move.'
        : `The only strong move here: the next best option drops your winning chances to ${pct(secondBest)}.`;
    default:
      return null;
  }
}
