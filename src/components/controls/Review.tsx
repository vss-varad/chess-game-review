import { Button, Progress } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { DEFAULT_POSITION } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import useStockfish from '../../queries/useStockfish';
import { useBoardStore } from '../../stores/useBoardStore';
import { useEvalStore } from '../../stores/useEvalStore';
import { DEPTHS, useSettingsStore } from '../../stores/useSettingsStore';
import { useStageStore } from '../../stores/useStageStore';
import { type MoveEval, useStockfishOutputStore } from '../../stores/useStockfishOutputStore';
import cn from '../../utils/cn';
import Loading from '../Loading';
import ReviewMoves from './ReviewMoves';
import ReviewOverview from './ReviewOverview';

const DEPTH_HINT: Record<number, string> = {
  8: 'Fast',
  10: 'Quick',
  12: 'Standard',
  14: 'Balanced',
  16: 'Deep',
  18: 'Max',
};

export default function Review() {
  const queryClient = useQueryClient();
  const depth = useSettingsStore(state => state.settings.depth);
  const chooseDepth = useSettingsStore(state => state.chooseDepth);
  const latest = useRef<Record<number, { moveEval: MoveEval; message: string }>>({});
  const reviewStartedAt = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const stage = useStageStore(state => state.stage);
  const setStage = useStageStore(state => state.setStage);
  const { data: stockfish, isLoading, isFetching, error } = useStockfish(stage === 'reviewing');
  const currentGame = useBoardStore(state => state.currentGame);
  const history = currentGame.history({ verbose: true });
  const fens = [DEFAULT_POSITION, ...history.map(move => move.after)];
  const populate = useEvalStore(state => state.populate);
  const resetEval = useEvalStore(state => state.reset);

  const {
    isListening,
    fenIndex,
    best3Moves,
    saveMove,
    listen,
    stopListen,
    review,
    reset: resetSfOutput,
  } = useStockfishOutputStore(useShallow(state => ({
    isListening: state.isListening,
    fenIndex: state.fenIndex,
    best3Moves: state.best3Moves,
    saveMove: state.saveMove,
    listen: state.listen,
    stopListen: state.stopListen,
    review: state.review,
    reset: state.reset,
  })));

  const totalPositions = (currentGame.isCheckmate() || currentGame.isStalemate()) ? fens.length - 1 : fens.length;
  const completePercentage = Math.floor((best3Moves.length / totalPositions) * 100);

  const estimatedSecondsRemaining = best3Moves.length > 0
    ? Math.ceil((elapsedSeconds / best3Moves.length) * (totalPositions - best3Moves.length))
    : null;

  const outputListener = useCallback((message: string) => {
    if (
      message.startsWith('info')
      && !message.startsWith('info string')
      && message.includes(' depth ')
      && message.includes(' pv ')
      && !message.includes('currmove')
      && !message.includes('bound')
    ) {
      const nodes = Number(message.match(/(?<=nodes\s)\w+/)?.[0]);
      const multiPv = Number(message.match(/(?<=multipv\s)\d/)?.[0]);
      const pv = message.match(/(?<=\spv\s)\w+/)?.[0];
      // score could be 'cp x' or 'mate y'
      const cpMatch = message.match(/(?<=cp\s)[\d-]+/);
      const mateMatch = message.match(/(?<=mate\s)[\d-]+/);

      if (pv && multiPv) {
        // keep only the newest line per rank; the last iteration is the deepest one
        latest.current[multiPv] = {
          moveEval: {
            nodes,
            pv,
            multiPv,
            cp: cpMatch ? Number(cpMatch[0]) : undefined,
            mate: mateMatch ? Number(mateMatch[0]) : undefined,
          },
          message,
        };
      }
    }

    if (message.startsWith('bestmove')) {
      // save the final lines in rank order, even when the engine stopped before the requested depth (e.g. forced mate)
      for (const rank of [1, 2, 3]) {
        const entry = latest.current[rank];
        if (entry)
          saveMove(entry.moveEval, entry.message);
      }

      latest.current = {};
      stopListen(fens.length);
    }
  }, []);

  useEffect(() => {
    if (stockfish) {
      stockfish.postMessage('setoption name MultiPV value 3');
      const onMessage = (e: MessageEvent) => outputListener(String(e.data));
      stockfish.addEventListener('message', onMessage);

      return () => {
        stockfish.removeEventListener('message', onMessage);
        stockfish.terminate();
      };
    }
  }, [stockfish]);

  useEffect(() => {
    return () => {
      // force recreate Stockfish worker every subsequent mounts
      queryClient.invalidateQueries({ queryKey: ['stockfish'] });
      // reset states when leave Review page
      resetSfOutput();
      resetEval();
    };
  }, []);

  useEffect(() => {
    if (completePercentage === 100) {
      populate();
      setStage('review-overview');
    }
  }, [completePercentage]);

  useEffect(() => {
    if (stage !== 'reviewing') {
      reviewStartedAt.current = null;
      setElapsedSeconds(0);

      return;
    }

    reviewStartedAt.current ??= Date.now();

    const interval = setInterval(() => {
      if (reviewStartedAt.current !== null) {
        setElapsedSeconds(Math.floor((Date.now() - reviewStartedAt.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  useEffect(() => {
    /*
      Instead of sending all the fens to Stockfish at once,
      we send one fen at a time, listen to its output,
      and only send the next fen when the previous one is done (when isListening is 'false' again)
    */
    if (stockfish && stage === 'reviewing') {
      if (!isListening) {
        listen();
        stockfish.postMessage(`position fen ${fens[fenIndex]}`);
        stockfish.postMessage(`go depth ${useSettingsStore.getState().settings.depth}`);
      }
    }
  }, [stockfish, stage, isListening]);

  if (isLoading || isFetching)
    return <Loading label="Loading Stockfish…" />;

  if (error) {
    return (
      <p>
        Loading Stockfish failed:
        {' '}
        <code className="inline-block text-small text-danger-500">
          {error.message}
        </code>
      </p>
    );
  }

  return (
    <div className="h-full" id="Review">
      {stage === 'loaded'
        ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-small font-bold">Analysis depth</p>
                <div className="grid grid-cols-3 gap-2">
                  {DEPTHS.map(d => (
                    <Button
                      className="h-auto flex-col gap-0 py-1.5"
                      color={d === depth ? 'primary' : 'default'}
                      key={d}
                      onPress={() => chooseDepth(d)}
                      radius="sm"
                      size="sm"
                      variant={d === depth ? 'solid' : 'flat'}
                    >
                      <span className="font-bold">{d}</span>
                      <span className="text-tiny opacity-70">{DEPTH_HINT[d]}</span>
                    </Button>
                  ))}
                </div>
                <p className="text-tiny text-foreground-500">
                  Depth 14 balances strength and speed. Choose 16 or 18 for deeper analysis, or 8 or 10 for faster results.
                </p>
              </div>
              <Button
                className="h-12 text-medium font-bold text-shadow-xs"
                color="primary"
                fullWidth
                onPress={review}
                radius="sm"
              >
                Generate Review
              </Button>
            </div>
          )
        : stage === 'reviewing'
          ? (
              <div className="flex flex-col gap-2">
                <Progress
                  aria-label="Reviewing..."
                  classNames={{
                    value: cn('mx-auto font-bold'),
                    indicator: `
                      bg-linear-[-45deg,hsl(var(--heroui-primary-600))_15%,hsl(var(--heroui-primary))_15%,hsl(var(--heroui-primary))_30%,hsl(var(--heroui-primary-600))_30%,hsl(var(--heroui-primary-600))_45%,hsl(var(--heroui-primary))_45%,hsl(var(--heroui-primary))_60%,hsl(var(--heroui-primary-600))_60%,hsl(var(--heroui-primary-600))_75%,hsl(var(--heroui-primary))_75%,hsl(var(--heroui-primary))_90%,hsl(var(--heroui-primary-600))_90%]
                    `,
                  }}
                  showValueLabel={true}
                  size="lg"
                  value={completePercentage}
                />
                <p className="text-center text-tiny text-foreground-500">
                  {best3Moves.length}
                  {' '}
                  of
                  {' '}
                  {totalPositions}
                  {' '}
                  positions
                  {estimatedSecondsRemaining === null
                    ? ' · estimating time…'
                    : ` · about ${formatDuration(estimatedSecondsRemaining)} left`}
                </p>
              </div>
            )
          : stage === 'review-overview'
            ? <ReviewOverview />
            : stage === 'review-moves'
              ? <ReviewMoves />
              : null}
    </div>
  );
}

function formatDuration(seconds: number) {
  if (seconds < 60)
    return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}
