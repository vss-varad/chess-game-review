import { create } from 'zustand';

import useLocalStorage from '../hooks/useLocalStorage';

export type Pieces = 'neo' | 'classic' | 'ocean';
export type Board = 'green' | 'brown' | 'ice';
export const DEPTHS = [8, 10, 12, 14, 16, 18] as const;
export type Depth = typeof DEPTHS[number];

interface SettingsStore {
  settings: {
    showRatings: boolean;
    pieces: Pieces;
    board: Board;
    depth: Depth;
  };
  toggleShowRatings: () => void;
  choosePieces: (pieces: Pieces) => void;
  chooseBoard: (board: Board) => void;
  chooseDepth: (depth: Depth) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => {
  const { item: showRatings, set: setShowRatings } = useLocalStorage('showRatings');
  const { item: pieces, set: setPieces } = useLocalStorage('pieces');
  const { item: board, set: setBoard } = useLocalStorage('board');
  const { item: depth, set: setDepth } = useLocalStorage('depth');
  const savedDepth = Number(depth) as Depth;

  return {
    settings: {
      showRatings: showRatings === 'true' ? true : showRatings === null, // first visit (null) defaults to true
      pieces: pieces as Pieces || 'neo',
      board: board as Board || 'green',
      depth: DEPTHS.includes(savedDepth) ? savedDepth : 14,
    },
    toggleShowRatings: () => set(({ settings }) => {
      setShowRatings('showRatings', settings.showRatings ? 'false' : 'true');

      return { settings: { ...settings, showRatings: !settings.showRatings } };
    }),
    choosePieces: pieces => set(({ settings }) => {
      setPieces('pieces', pieces);

      return { settings: { ...settings, pieces } };
    }),
    chooseDepth: depth => set(({ settings }) => {
      setDepth('depth', String(depth));

      return { settings: { ...settings, depth } };
    }),
    chooseBoard: board => set(({ settings }) => {
      setBoard('board', board);

      return { settings: { ...settings, board } };
    }),
  };
});
