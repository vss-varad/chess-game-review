import { Button } from '@heroui/react';
import { ErrorBoundary } from 'react-error-boundary';

import Board from './components/board/Board';
import Controls from './components/controls/Controls';

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={Fallback}>
      <div
        className={`
          min-h-screen overflow-x-hidden px-3 py-5
          xs:px-6 xs:py-7
        `}
        id="App"
      >
        <a
          className={`
            fixed top-3 left-3 z-50 -translate-y-[160%] rounded-md bg-best px-3
            py-2 font-bold text-black
            focus:translate-y-0
          `}
          href="#review-workspace"
        >
          Skip to review workspace
        </a>
        <div className="mx-auto max-w-[1440px]">
          <header className={`
            mb-6 flex items-center justify-between border-b border-white/10 pb-4
            sm:mb-8
          `}
          >
            <div className="flex items-center gap-3">
              <img alt="" className="size-9" src={`${import.meta.env.BASE_URL}star.svg`} />
              <div>
                <p className={`
                  text-[11px] font-semibold tracking-[0.16em]
                  text-foreground-500 uppercase
                `}
                >
                  Chess analysis
                </p>
                <p className="text-lg leading-tight font-bold">Game Review</p>
              </div>
            </div>
            <div className={`
              flex items-center gap-2 rounded-full border border-white/10
              bg-white/[0.04] px-3 py-2 text-xs font-medium text-foreground-500
            `}
            >
              <span
                aria-hidden="true"
                className={`
                  size-2 rounded-full bg-best
                  shadow-[0_0_12px_rgb(129_182_76_/_0.65)]
                `}
              />
              Stockfish 19
              <span className={`
                hidden text-foreground-600
                xs:inline
              `}
              >
                · runs locally
              </span>
            </div>
          </header>
          <div
            className={`
              relative mx-auto flex max-w-[642px] flex-col justify-center gap-6
              focus:outline-none
              lg:max-w-none lg:flex-row lg:items-start lg:justify-center
            `}
            id="review-workspace"
            tabIndex={-1}
          >
            <Board />
            <Controls />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function Fallback({ error }: { error: Error }) {
  return (
    <div className="flex h-screen flex-col gap-2 p-8" role="alert">
      <p className="text-2xl">Something went wrong:</p>
      <code className="inline-block text-small text-danger-500">
        {error.message}
      </code>
      <div className="flex gap-1">
        <Button
          onPress={() => {
            window.location.reload();
          }}
        >
          Refresh
        </Button>
      </div>
    </div>
  );
}
