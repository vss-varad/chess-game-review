import { Helmet } from '@dr.pogodin/react-helmet';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from 'react-responsive';
import { useShallow } from 'zustand/react/shallow';

import { useBoardStore } from '../../stores/useBoardStore';
import { useSelectGameStore } from '../../stores/useSelectGameStore';
import { useStageStore } from '../../stores/useStageStore';
import cn from '../../utils/cn';
import useNames from '../../utils/useNames';
import Loading from '../Loading';
import Forms from './Forms';
import GameNav from './GameNav';
import Games from './Games';
import Months from './Months';

const Review = lazy(() => import('./Review'));

export default function Controls() {
  const reset = useBoardStore(state => state.reset);

  const {
    stage,
    setStage,
    isLoaded,
  } = useStageStore(useShallow(state => ({
    stage: state.stage,
    setStage: state.setStage,
    isLoaded: state.computed.isLoaded,
  })));

  const {
    site,
    resetSelectGameStore,
  } = useSelectGameStore(useShallow(state => ({
    site: state.site,
    resetSelectGameStore: state.reset,
  })));

  const isLg = useMediaQuery({
    query: '(min-width: 1024px)',
  });

  const [wName, bName] = useNames();

  function back() {
    if (stage === 'select-month') {
      resetSelectGameStore();
      setStage('home');
    }

    else if (stage === 'select-game') {
      setStage('select-month');
    }

    else if (stage === 'loaded' || stage === 'reviewing' || stage === 'review-overview') {
      reset();

      if (site) {
        setStage('select-game');
      }
      else {
        resetSelectGameStore();
        setStage('home');
      }
    }
    else if (stage === 'review-moves') {
      setStage('review-overview');
    }
  }

  return (
    <div
      className={`
        flex h-[500px] max-w-[642px] min-w-[310px] grow flex-col gap-4
        rounded-large border border-default-200/40 bg-default-50/40 p-3
        shadow-2xl shadow-black/30 backdrop-blur-md
        xs:h-[660px]
        lg:mb-0 lg:h-auto lg:max-h-[calc(100vh-48px)] lg:min-h-[560px] lg:w-auto
        lg:max-w-[400px] lg:p-4
      `}
      id="Controls"
    >
      <Helmet>
        <title>
          {isLoaded
            ? `${wName} vs. ${bName} | Game Review`
            : 'Game Review'}
        </title>
      </Helmet>
      <div className="grid grid-cols-[40px_1fr_40px] gap-1">
        <Button
          aria-label="Back"
          className={cn('text-2xl', stage === 'home' && 'invisible')}
          isIconOnly
          onPress={back}
          radius="sm"
          size="sm"
          variant="light"
        >
          <Icon icon="material-symbols:chevron-left-rounded" />
        </Button>
        <p
          className={cn('flex w-full items-center justify-center font-bold', stage === 'home' && `
            text-xl
          `)}
        >
          {stage === 'home'
            ? (
                <>
                  <img alt="" className="mr-1 size-5" src={`${import.meta.env.BASE_URL}star.svg`} />
                  <span>Game Review</span>
                </>
              )
            : stage === 'select-month' ? 'Select Month' : stage === 'select-game' ? 'Select Game' : 'Review'}
        </p>
      </div>
      <div className={`
        mb-32 grow overflow-x-hidden overflow-y-auto
        xs:mb-16 xs:px-4
        lg:mb-0
      `}
      >
        {stage === 'home'
          ? <Forms />
          : stage === 'select-month'
            ? <Months />
            : stage === 'select-game'
              ? <Games />
              : (
                  <Suspense fallback={<Loading label="Loading analysis…" />}>
                    <Review />
                  </Suspense>
                )}
      </div>
      {isLg ? <GameNav /> : createPortal(<GameNav />, document.getElementById('root')!)}
    </div>
  );
}
