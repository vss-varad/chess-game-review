export type CoachSide = 'White' | 'Black';
export interface CoachReview {
  opening: string;
  result: string;
  players: {
    side: CoachSide;
    accuracy: number;
    averageCentipawnLoss: number;
  }[];
  keyMoments: {
    moveNumber: number;
    side: CoachSide;
    played: string;
    classification: string;
    bestMove?: string;
  }[];
}
export interface CoachAdvice {
  summary: string;
  strengths: string[];
  focus: string;
  exercises: string[];
}

export async function requestCoachAdvice(review: CoachReview): Promise<CoachAdvice> {
  const endpoint = import.meta.env.VITE_AI_COACH_ENDPOINT;

  if (import.meta.env.PROD && !endpoint) {
    throw new Error('AI Coach is not configured for this deployment. Set VITE_AI_COACH_ENDPOINT to the hosted API.');
  }

  let response: Response;

  try {
    response = await fetch(endpoint || '/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(review),
    });
  }
  catch {
    throw new Error('Could not reach the AI Coach server. Check that the backend is running.');
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'The coaching request failed.';

    throw new Error(message);
  }

  if (!isCoachAdvice(payload))
    throw new Error('The AI Coach server returned an invalid response.');

  return payload;
}

function isCoachAdvice(value: unknown): value is CoachAdvice {
  if (!value || typeof value !== 'object')
    return false;

  const advice = value as Record<string, unknown>;

  return typeof advice.summary === 'string'
    && typeof advice.focus === 'string'
    && Array.isArray(advice.strengths)
    && advice.strengths.every(item => typeof item === 'string')
    && Array.isArray(advice.exercises)
    && advice.exercises.every(item => typeof item === 'string');
}
