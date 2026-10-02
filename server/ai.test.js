import { afterEach, describe, expect, test, vi } from 'vitest';

import { buildCoachMessages, generateCoachAdvice, validateCoachReview } from './ai.js';

const review = {
  opening: 'Italian Game',
  result: '1-0',
  players: [
    { side: 'White', accuracy: 84.2, averageCentipawnLoss: 28 },
    { side: 'Black', accuracy: 68.5, averageCentipawnLoss: 91 },
  ],
  keyMoments: [
    { moveNumber: 24, side: 'Black', played: 'Qh4', classification: 'blunder', bestMove: 'Re8' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ai coach service', () => {
  test('accepts compact engine-backed review data', () => {
    expect(validateCoachReview(review)).toEqual(review);
  });

  test('rejects invalid classifications before building a provider request', () => {
    const invalidReview = {
      ...review,
      keyMoments: [{ ...review.keyMoments[0], classification: 'certain-win' }],
    };

    expect(() => buildCoachMessages(invalidReview)).toThrow('Invalid move classification');
  });

  test('requires a server-side API key', async () => {
    await expect(generateCoachAdvice(review, { apiKey: '' })).rejects.toThrow('Set AI_API_KEY on the server');
  });

  test('returns structured advice without exposing the provider key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              summary: 'White converted the advantage after Black blundered.',
              strengths: ['White kept the initiative.'],
              focus: 'Review the defensive resource on move 24.',
              exercises: ['Practice finding candidate moves while under pressure.'],
            }),
          },
        }],
      }),
    });

    const advice = await generateCoachAdvice(review, {
      apiKey: 'server-only-test-key',
      endpoint: 'https://provider.example/v1/chat/completions',
      model: 'test-model',
      fetchImpl,
    });

    const [, options] = fetchImpl.mock.calls[0];

    expect(advice.summary).toContain('White converted');
    expect(options.headers.authorization).toBe('Bearer server-only-test-key');
    expect(options.body).not.toContain('server-only-test-key');
  });
});
