import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import AICoach from './AICoach';

import type { CoachAdvice, CoachReview } from '../../services/ai';

const review: CoachReview = {
  opening: 'Italian Game',
  result: '1-0',
  players: [
    { side: 'White', accuracy: 84, averageCentipawnLoss: 30 },
    { side: 'Black', accuracy: 70, averageCentipawnLoss: 80 },
  ],
  keyMoments: [
    { moveNumber: 24, side: 'Black', played: 'Qh4', classification: 'blunder', bestMove: 'Re8' },
  ],
};

const advice: CoachAdvice = {
  summary: 'White converted the advantage after a defensive error.',
  strengths: ['White kept an active initiative.'],
  focus: 'Review the defensive choice on move 24.',
  exercises: ['Practice finding candidate moves under pressure.'],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('requests coaching from the API and renders the returned advice', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => advice,
  });

  vi.stubGlobal('fetch', fetchMock);
  const user = userEvent.setup();

  render(<AICoach review={review} />);
  await user.click(screen.getByRole('button', { name: 'Get coaching' }));

  expect(await screen.findByText(advice.summary)).toBeInTheDocument();

  expect(fetchMock).toHaveBeenCalledWith('/api/coach', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify(review),
  }));
});
