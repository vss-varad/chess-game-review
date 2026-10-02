import { Button, Spinner } from '@heroui/react';
import { useState } from 'react';

import { requestCoachAdvice } from '../../services/ai';

import type { CoachAdvice, CoachReview } from '../../services/ai';

export default function AICoach({ review }: { review: CoachReview }) {
  const [advice, setAdvice] = useState<CoachAdvice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isConfigured = import.meta.env.DEV || Boolean(import.meta.env.VITE_AI_COACH_ENDPOINT);

  async function getAdvice() {
    setError(null);
    setIsLoading(true);

    try {
      setAdvice(await requestCoachAdvice(review));
    }
    catch (error) {
      setError(error instanceof Error ? error.message : 'The coaching request failed.');
    }
    finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="ai-coach-title"
      className="border-y border-default-200 py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold" id="ai-coach-title">AI Coach</h2>
        </div>
        <Button
          isDisabled={!isConfigured || isLoading}
          onPress={getAdvice}
          radius="sm"
          size="sm"
          startContent={isLoading ? <Spinner color="current" size="sm" /> : undefined}
          variant="flat"
        >
          {isLoading ? 'Reviewing game…' : advice ? 'Refresh coaching' : 'Get coaching'}
        </Button>
      </div>
      <p className="mt-2 text-tiny text-foreground-500">
        Coaching uses the engine review; player names and the raw PGN are not sent.
      </p>
      {!isConfigured && (
        <p className="mt-2 text-tiny text-warning-500">
          Connect a hosted AI Coach API to enable this feature on the public site.
        </p>
      )}
      {error && <p className="mt-3 text-small text-danger-500" role="alert">{error}</p>}
      {advice && (
        <div
          aria-live="polite"
          className="mt-4 flex flex-col gap-3 border-t border-default-200 pt-4"
        >
          <p>{advice.summary}</p>
          <div>
            <p className="text-tiny font-bold text-foreground-500 uppercase">Strengths</p>
            <ul className="mt-1 list-inside list-disc text-small">
              {advice.strengths.map((strength, index) => <li key={index}>{strength}</li>)}
            </ul>
          </div>
          <div>
            <p className="text-tiny font-bold text-foreground-500 uppercase">Focus next</p>
            <p className="mt-1">{advice.focus}</p>
          </div>
          <div>
            <p className="text-tiny font-bold text-foreground-500 uppercase">Practice</p>
            <ul className="mt-1 list-inside list-disc text-small">
              {advice.exercises.map((exercise, index) => <li key={index}>{exercise}</li>)}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
