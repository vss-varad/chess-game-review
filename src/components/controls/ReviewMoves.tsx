import { Button } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { DEFAULT_POSITION } from 'chess.js';
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import MoveClassification from '../../icons/move-classifications/MoveClassification';
import { useBoardStore } from '../../stores/useBoardStore';
import { formatCp, useEvalStore } from '../../stores/useEvalStore';
import { chooseTextColor } from '../../utils/chooseColorFromClassification';
import cn from '../../utils/cn';
import { explainMove } from '../../utils/explainMove';
import lanToSan from '../../utils/lanToSan';
import makePair from '../../utils/makePair';
import { evalToWinPercentFor } from '../../utils/winPercent';
import EvalGraph from './EvalGraph';

import type { Move } from 'chess.js';

const DESCRIPTION: Record<string, string> = {
  brilliant: 'a brilliant move!',
  great: 'a great move',
  best: 'the best move',
  excellent: 'excellent',
  good: 'a good move',
  book: 'a book move',
  forced: 'forced',
  inaccuracy: 'an inaccuracy',
  mistake: 'a mistake',
  miss: 'a miss',
  blunder: 'a blunder',
};

const SHOW_BEST = ['inaccuracy', 'mistake', 'miss', 'blunder'];
const KEY_MOMENTS = ['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder'];
const MARKED = ['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder'];

export default function ReviewMoves() {
  const {
    currentGame,
    currentMoveNum,
    isFlipped,
    toMove,
  } = useBoardStore(useShallow(state => ({
    currentGame: state.currentGame,
    currentMoveNum: state.currentMoveNum,
    isFlipped: state.isFlipped,
    toMove: state.toMove,
  })));

  const history = currentGame.history({ verbose: true });
  const fens = [DEFAULT_POSITION, ...history.map(move => move.after)];

  const {
    best3MovesWithClass,
    cps,
    classHistory,
    openingNames,
  } = useEvalStore(useShallow(state => ({
    best3MovesWithClass: state.best3MovesWithClass,
    cps: state.cps,
    classHistory: state.classHistory,
    openingNames: state.openingNames,
  })));

  const historyPairs = makePair(history);
  const currentMove = history[currentMoveNum - 1];
  const classification = classHistory[currentMoveNum - 1];
  const advs = cps.map(formatCp);
  const adv = (advs.length === 0) ? '0.0' : advs[currentMoveNum];

  const whiteHasAdv = useMemo(() => {
    let whiteHasAdv: boolean;

    if (typeof cps[currentMoveNum] === 'number') {
      whiteHasAdv = cps[currentMoveNum] >= 0;
    }
    else {
      whiteHasAdv = cps[currentMoveNum].startsWith('+') || cps[currentMoveNum] === '1-0';
    }

    return whiteHasAdv;
  }, [currentMoveNum]);

  const result = currentGame.header().Result;

  const keyMoments = classHistory
    .map((cl, i) => (KEY_MOMENTS.includes(cl) ? i + 1 : 0))
    .filter(Boolean);

  const prevKey = [...keyMoments].reverse().find(n => n < currentMoveNum);
  const nextKey = keyMoments.find(n => n > currentMoveNum);
  const lines = best3MovesWithClass[currentMoveNum - 1];

  const explanation = currentMove && lines?.length
    ? explainMove({
        classification,
        before: evalToWinPercentFor(cps[currentMoveNum - 1], currentMove.color),
        after: evalToWinPercentFor(cps[currentMoveNum], currentMove.color),
        best: evalToWinPercentFor(lines[0].eval, currentMove.color),
        secondBest: lines[1] ? evalToWinPercentFor(lines[1].eval, currentMove.color) : undefined,
      })
    : null;

  return (
    <div className="grid h-full grid-rows-[auto_auto_auto_1fr_80px] gap-3" id="ReviewMoves">
      <div className="flex flex-col gap-1">
        {currentMoveNum > 0 && (
          <p className="flex justify-between gap-2">
            <span>
              <MoveClassification
                classification={classification}
                className="mr-1 inline-block"
              />
              <span className="font-bold">
                {currentMove.san}
              </span>
              {' '}
              is
              {' '}
              {DESCRIPTION[classification] ?? classification}
            </span>
            <span
              className={cn(
                'rounded-sm px-2 py-1 text-center font-bold',
                whiteHasAdv ? 'bg-foreground text-background' : 'bg-default-100',
                adv === '1/2-1/2' ? 'w-20' : 'w-14',
              )}
            >
              {(adv.startsWith('-') || adv.startsWith('+')) ? adv.slice(1) : adv}
            </span>
          </p>
        )}
        {explanation && <p className="text-small text-foreground-500">{explanation}</p>}
        {currentMoveNum > 0 && SHOW_BEST.includes(classification) && best3MovesWithClass[currentMoveNum - 1]?.[0] && (
          <p className="text-small text-foreground-500">
            Best was
            {' '}
            <span className="font-bold text-best">
              {lanToSan(best3MovesWithClass[currentMoveNum - 1][0].pv, currentMoveNum - 1, fens)}
            </span>
          </p>
        )}
        {best3MovesWithClass[currentMoveNum - 1]
          ?.filter(move => move.pv !== currentMove.lan)
          .map((move, i) => {
            let adv;
            const san = lanToSan(move.pv, currentMoveNum - 1, fens);

            if (san.endsWith('#')) {
              const moveEval = move.eval as string;
              adv = moveEval.startsWith('+') ? '1-0' : '0-1';
            }
            else {
              adv = formatCp(move.eval);
            }

            let whiteHasAdv: boolean;

            if (typeof move.eval === 'number') {
              whiteHasAdv = move.eval >= 0;
            }
            else {
              whiteHasAdv = move.eval.startsWith('+');
            }

            return (
              <div
                className={`
                  grid grid-cols-[90px_1fr] items-center justify-items-start
                  gap-4 text-small
                `}
                key={i}
              >
                <p className="font-bold">
                  <MoveClassification
                    classification={move.classification}
                    className="mr-1 inline-block size-5"
                  />
                  {san}
                </p>
                <p
                  className={cn(
                    'w-12 rounded-sm px-2 py-1 text-center font-bold',
                    whiteHasAdv
                      ? 'bg-foreground text-background'
                      : `bg-default-100`,
                  )}
                >
                  {(adv.startsWith('-') || adv.startsWith('+')) ? adv.slice(1) : adv}
                </p>
              </div>
            );
          })}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-small text-foreground-500">{openingNames[currentMoveNum]}</p>
        <div className="flex shrink-0 gap-1">
          <Button
            isDisabled={prevKey === undefined}
            onPress={() => prevKey !== undefined && toMove(prevKey)}
            radius="sm"
            size="sm"
            variant="flat"
          >
            ‹ Key moment
          </Button>
          <Button
            isDisabled={nextKey === undefined}
            onPress={() => nextKey !== undefined && toMove(nextKey)}
            radius="sm"
            size="sm"
            variant="flat"
          >
            Key moment ›
          </Button>
        </div>
      </div>
      <div className="flex gap-4">
        <a
          className={`
            flex w-fit gap-0 text-tiny text-foreground-500
            hover:underline
          `}
          href={`https://www.chess.com/analysis?fen=${fens[currentMoveNum]}&flip=${isFlipped}`}
          target="_blank"
        >
          <span>chess.com</span>
          <Icon
            className="text-small"
            icon="material-symbols:arrow-outward-rounded"
          />
        </a>
        <a
          className={`
            flex w-fit gap-0 text-tiny text-foreground-500
            hover:underline
          `}
          href={`https://lichess.org/analysis/${fens[currentMoveNum]}`}
          target="_blank"
        >
          <span>lichess</span>
          <Icon
            className="text-small"
            icon="material-symbols:arrow-outward-rounded"
          />
        </a>
      </div>
      <div className="overflow-scroll">
        <div className="flex flex-col">
          {historyPairs.map((pair, i) => (
            <div
              className={cn(
                `
                  grid grid-cols-[40px_90px_90px] items-center
                  justify-items-start gap-2 pl-2
                `,
                i % 2 === 1 && 'bg-default-100/50',
              )}
              key={i}
            >
              <p className="text-tiny text-foreground-500">
                {i + 1}
                .
              </p>
              <MoveButton move={pair[0]} pairIndex={i} />
              {pair[1] && <MoveButton move={pair[1]} pairIndex={i} />}
            </div>
          ),
          )}
          <p className="p-2 text-tiny font-bold text-foreground-500">{result}</p>
        </div>
      </div>
      <EvalGraph />
    </div>
  );
}

function MoveButton({ pairIndex, move }: { pairIndex: number; move: Move }) {
  const ref = useRef<HTMLButtonElement>(null);
  const currentMoveNum = useBoardStore(state => state.currentMoveNum);
  const toMove = useBoardStore(state => state.toMove);
  const classHistory = useEvalStore(state => state.classHistory);
  let realIndex = pairIndex * 2 + 1;

  if (move.color === 'b') {
    realIndex += 1;
  }

  const classification = classHistory[realIndex - 1];

  useEffect(() => {
    if (currentMoveNum === realIndex) {
      if (window.innerWidth >= 1024) {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [currentMoveNum]);

  return (
    <div className="relative">
      {MARKED.includes(classification) && (
        <MoveClassification
          classification={classification}
          className="absolute top-1.5 -left-5 size-5 cursor-pointer"
          onClick={() => toMove(realIndex)}
        />
      )}
      <Button
        className={cn(
          'min-w-0 justify-start rounded-[4px] px-2 font-bold',
          currentMoveNum === realIndex && 'bg-default-200',
          chooseTextColor(classification),
        )}
        disableAnimation
        onPress={() => toMove(realIndex)}
        radius="sm"
        ref={ref}
        size="sm"
        variant="light"
      >
        {move.san}
      </Button>
    </div>
  );
}
