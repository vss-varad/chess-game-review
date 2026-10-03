import { Chess } from 'chess.js';
import { describe, expect, test } from 'vitest';

import { computeStats, moveAccuracy } from './accuracy';
import classify from './classify';
import { explainMove } from './explainMove';
import { estimateRating } from './gameRating';
import { isSacrifice } from './refineClassification';
import { cpToWinPercent, evalToWinPercent } from './winPercent';

function play(fen: string, san: string) {
  return new Chess(fen).move(san);
}

describe('winPercent', () => {
  test('is 50 at equality and symmetric', () => {
    expect(cpToWinPercent(0)).toBeCloseTo(50);
    expect(cpToWinPercent(300) + cpToWinPercent(-300)).toBeCloseTo(100);
  });

  test('handles mates and results', () => {
    expect(evalToWinPercent('+M3')).toBe(100);
    expect(evalToWinPercent('-M3')).toBe(0);
    expect(evalToWinPercent('1-0')).toBe(100);
    expect(evalToWinPercent('0-1')).toBe(0);
    expect(evalToWinPercent('1/2-1/2')).toBe(50);
  });
});

describe('accuracy', () => {
  test('gives ~100 for a move that keeps the win chance and less for a blunder', () => {
    expect(moveAccuracy(50, 50)).toBe(100);
    expect(moveAccuracy(50, 50)).toBeGreaterThan(moveAccuracy(50, 30));
    expect(moveAccuracy(50, 5)).toBeLessThan(20);
  });

  test('scores a flat game near 100 and counts each side separately', () => {
    const flat = computeStats([20, 20, 20, 20, 20, 20]);
    expect(flat.accuracy[0]).toBeGreaterThan(95);
    expect(flat.accuracy[1]).toBeGreaterThan(95);
  });

  test('punishes the side that blunders, including when sides have unequal move counts', () => {
    // white's first move drops the eval from +30 to -600, then nothing changes
    const stats = computeStats([30, -600, -600, -600, -600]);
    expect(stats.accuracy[0]).toBeLessThan(stats.accuracy[1]);
    expect(stats.acpl[0]).toBeGreaterThan(stats.acpl[1]);
  });

  test('returns zeros for an empty game', () => {
    expect(computeStats([0])).toEqual({ accuracy: [0, 0], acpl: [0, 0] });
  });
});

describe('gameRating', () => {
  test('increases with accuracy and widens the band for short games', () => {
    expect(estimateRating(60, 30).rating).toBeLessThan(estimateRating(80, 30).rating);
    expect(estimateRating(80, 30).rating).toBeLessThan(estimateRating(95, 30).rating);
    expect(estimateRating(80, 5).margin).toBeGreaterThan(estimateRating(80, 40).margin);
  });
});

describe('isSacrifice', () => {
  const fen = '4k3/8/2p5/8/8/8/8/3QK3 w - - 0 1';

  test('detects a queen dropped onto a pawn-guarded square', () => {
    expect(isSacrifice(play(fen, 'Qd5')!)).toBe(true);
  });

  test('does not flag a safe move', () => {
    expect(isSacrifice(play(fen, 'Qd2')!)).toBe(false);
  });

  test('does not flag an even trade', () => {
    // knight takes a pawn-defended knight: knight for knight, level material
    const trade = 'k7/8/2p5/3n4/8/2N5/8/K7 w - - 0 1';
    expect(isSacrifice(play(trade, 'Nxd5')!)).toBe(false);
  });
});

describe('classify', () => {
  test('recognizes opening-book moves from the supplied dataset', () => {
    const move = new Chess().move('e4');

    expect(classify({
      subArr: [
        { pv: 'e2e4', nodes: 1, multiPv: 1, eval: 0 },
        { pv: 'd2d4', nodes: 1, multiPv: 2, eval: 0 },
      ],
      lan: 'e2e4',
      history: [move],
      i: 0,
      beforeEval: 0,
      afterEval: 0,
      openings: [{ eco: 'C20', epd: '', name: 'King\'s Pawn Game', pgn: '1. e4', uci: 'e2e4' }],
    })).toBe('book');
  });
});

describe('explainMove', () => {
  test('reports win-chance change for bad moves and nothing for ordinary ones', () => {
    expect(explainMove({ classification: 'blunder', before: 62, after: 21, best: 62 })).toContain('62% to 21%');
    expect(explainMove({ classification: 'good', before: 50, after: 49, best: 50 })).toBeNull();
  });

  test('describes Great and Miss using the engine numbers', () => {
    expect(explainMove({ classification: 'great', before: 60, after: 60, best: 60, secondBest: 28 })).toContain('28%');
    expect(explainMove({ classification: 'miss', before: 40, after: 55, best: 90 })).toContain('90%');
  });
});
