import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import ChessSiteForm from './ChessSiteForm';
import PGNForm from './PGNForm';

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();

  vi.stubGlobal('localStorage', {
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
    setItem: (key: string, value: string) => storage.set(key, value),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('enables archive submission only for a nonblank username', async () => {
  const user = userEvent.setup();

  render(<ChessSiteForm site="chess.com" />);

  const submit = screen.getByRole('button', { name: 'Submit' });
  const username = screen.getByRole('textbox', { name: 'Username' });

  expect(submit).toBeDisabled();
  await user.type(username, '   ');
  expect(submit).toBeDisabled();
  await user.type(username, 'player');
  expect(submit).toBeEnabled();
  await user.clear(username);
  expect(submit).toBeDisabled();
});

test('enables PGN submission only for nonblank input', async () => {
  const user = userEvent.setup();

  render(<PGNForm />);

  const submit = screen.getByRole('button', { name: 'Add Game' });
  const pgn = screen.getByRole('textbox', { name: 'PGN' });

  expect(submit).toBeDisabled();
  await user.type(pgn, '   ');
  expect(submit).toBeDisabled();
  await user.type(pgn, '1. e4 e5');
  expect(submit).toBeEnabled();
  await user.clear(pgn);
  expect(submit).toBeDisabled();
});
