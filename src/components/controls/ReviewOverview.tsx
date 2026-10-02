import { Button } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useMemo } from 'react';

import MoveClassification from '../../icons/move-classifications/MoveClassification';
import { useBoardStore } from '../../stores/useBoardStore';
import { useEvalStore } from '../../stores/useEvalStore';
import { useStageStore } from '../../stores/useStageStore';
import capitalize from '../../utils/capitalize';
import { chooseTextColor } from '../../utils/chooseColorFromClassification';
import cn from '../../utils/cn';
import lanToSan from '../../utils/lanToSan';
import useNames from '../../utils/useNames';
import AICoach from './AICoach';
import EvalGraph from './EvalGraph';

import type { Classification } from '../../utils/classify';

// same order chess.com uses
const ROWS: Exclude<Classification, 'forced'>[] = [
  'brilliant',
  'great',
  'best',
  'excellent',
  'good',
  'book',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
];

const GRID = 'grid grid-cols-[1fr_28px_1fr] items-center gap-3';

export default function ReviewOverview() {
  const [wName, bName] = useNames();
  const currentGame = useBoardStore(state => state.currentGame);
  const currentMoveNum = useBoardStore(state => state.currentMoveNum);
  const toNextMove = useBoardStore(state => state.toNextMove);
  const setStage = useStageStore(state => state.setStage);
  const accuracy = useEvalStore(state => state.accuracy);
  const acpl = useEvalStore(state => state.acpl);
  const gameRating = useEvalStore(state => state.gameRating);
  const classHistory = useEvalStore(state => state.classHistory);
  const best3MovesWithClass = useEvalStore(state => state.best3MovesWithClass);
  const openingNames = useEvalStore(state => state.openingNames);
  const header = currentGame.header();
  const elo = [header.WhiteElo, header.BlackElo].map(e => (e && e !== '?' ? e : undefined));
  const opening = openingNames[openingNames.length - 1];

  const counts = useMemo(() => {
    const record = Object.fromEntries(ROWS.map(cl => [cl, [0, 0]])) as Record<string, number[]>;

    classHistory.forEach((cl, i) => {
      if (record[cl])
        record[cl][i % 2] += 1;
    });

    return record;
  }, [classHistory]);

  const players = [
    { name: wName, white: true, elo: elo[0], i: 0 },
    { name: bName, white: false, elo: elo[1], i: 1 },
  ];

  const accuracyLeader = accuracy[0] === accuracy[1]
    ? null
    : accuracy[0] > accuracy[1] ? wName : bName;

  const accuracyGap = Math.abs(accuracy[0] - accuracy[1]).toFixed(1);

  const keyMomentCount = classHistory.filter(cl => [
    'brilliant',
    'great',
    'inaccuracy',
    'mistake',
    'miss',
    'blunder',
  ].includes(cl)).length;

  const momentSummary = keyMomentCount > 0
    ? `The game had ${keyMomentCount} key moments to explore.`
    : 'The move review shows how the evaluation developed.';

  const gameInsight = accuracyLeader
    ? `${accuracyLeader} led accuracy by ${accuracyGap} points. ${momentSummary}`
    : `Both players finished at ${accuracy[0].toFixed(1)} accuracy. ${momentSummary}`;

  const history = currentGame.history({ verbose: true });

  const fens = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ...history.map(move => move.after),
  ];

  const keyClassifications = ['brilliant', 'great', 'inaccuracy', 'mistake', 'miss', 'blunder'];

  const coachReview = {
    opening: opening || 'Unknown opening',
    result: ['1-0', '0-1', '1/2-1/2'].includes(header.Result ?? '') ? header.Result! : '*',
    players: [
      { side: 'White' as const, accuracy: accuracy[0], averageCentipawnLoss: acpl[0] },
      { side: 'Black' as const, accuracy: accuracy[1], averageCentipawnLoss: acpl[1] },
    ],
    keyMoments: history.flatMap((move, index) => {
      const classification = classHistory[index];

      if (!keyClassifications.includes(classification))
        return [];

      const bestMove = best3MovesWithClass[index]?.[0]?.pv;

      return [{
        moveNumber: Math.floor(index / 2) + 1,
        side: move.color === 'w' ? 'White' as const : 'Black' as const,
        played: move.san,
        classification,
        bestMove: bestMove ? lanToSan(bestMove, index, fens) : undefined,
      }];
    }).slice(0, 24),
  };

  return (
    <div className="flex flex-col gap-4 text-small" id="ReviewOverview">
      <div className="flex items-start gap-3 border-b border-default-200 pb-3">
        <span className={`
          grid size-9 shrink-0 place-items-center rounded-full bg-best/15
          text-best
        `}
        >
          <Icon aria-hidden="true" className="text-xl" icon="material-symbols:tips-and-updates-rounded" />
        </span>
        <div className="min-w-0">
          <p className="text-tiny font-semibold text-foreground-500 uppercase">Game insight</p>
          <p className="mt-1 text-small">{gameInsight}</p>
        </div>
      </div>
      <AICoach review={coachReview} />
      <EvalGraph />
      <div className="grid grid-cols-2 gap-3">
        {players.map(({ name, white, elo, i }) => (
          <div
            className={`
              flex flex-col gap-3 rounded-large border border-default-200
              bg-default-50 p-3
            `}
            key={i}
          >
            <div className="flex items-center gap-2">
              <span className={cn(
                `
                  grid size-8 shrink-0 place-items-center rounded-full text-xs
                  font-extrabold
                `,
                white
                  ? 'bg-white text-black'
                  : `border border-default-400 bg-black text-white`,
              )}
              >
                {white ? 'W' : 'B'}
              </span>
              <p className="truncate font-bold" title={name}>{name}</p>
              {elo && <span className="text-tiny text-foreground-500">{elo}</span>}
            </div>
            <div>
              <p className="text-tiny text-foreground-500">Accuracy</p>
              <p className="text-3xl font-extrabold">{accuracy[i].toFixed(1)}</p>
            </div>
            <div className="flex justify-between gap-2">
              <div>
                <p className="text-tiny text-foreground-500" title="Estimated from accuracy - not chess.com's own number">
                  Game rating
                </p>
                <p className="text-large font-bold">
                  {gameRating[i].rating}
                  <span className={`
                    ml-1 text-tiny font-normal text-foreground-500
                  `}
                  >
                    ±
                    {gameRating[i].margin}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-tiny text-foreground-500">Avg. loss</p>
                <p className="text-large font-bold">{acpl[i]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {opening && opening !== 'Starting Position' && (
        <p className="text-center text-foreground-500">{opening}</p>
      )}
      <div className="flex flex-col gap-2">
        {ROWS.map((cl) => {
          const [w, b] = counts[cl];
          const empty = w + b === 0;

          return (
            <div className={cn(GRID, empty && 'opacity-40')} key={cl}>
              <p className={cn('text-right text-base font-bold', chooseTextColor(cl))}>{w}</p>
              <MoveClassification
                classification={cl}
                className="justify-self-center"
              />
              <div className="flex items-baseline gap-3">
                <p className={cn('text-base font-bold', chooseTextColor(cl))}>{b}</p>
                <p className="text-foreground-500">{capitalize(cl)}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-tiny text-foreground-500">
        Game rating is an estimate derived from accuracy; chess.com&apos;s own rating uses a method that isn&apos;t public.
      </p>
      <Button
        className="h-12 text-medium font-bold text-shadow-xs"
        color="primary"
        fullWidth
        onPress={() => {
          setStage('review-moves');
          if (currentMoveNum === 0)
            toNextMove();
        }}
        radius="sm"
      >
        Start Review
      </Button>
    </div>
  );
}
