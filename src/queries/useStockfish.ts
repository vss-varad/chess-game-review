import { useQuery } from '@tanstack/react-query';

const ENGINE_URL = `${import.meta.env.BASE_URL}stockfish-nnue.wasm/stockfish.js`;
const INIT_TIMEOUT_MS = 30_000;

export default function useStockfish() {
  return useQuery({
    queryKey: ['stockfish'],
    queryFn: fetchStockfish,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 0,
  });
}

/**
 * Stockfish 19 (nmrugg/stockfish.js) runs as a plain Web Worker:
 * talk to it with `postMessage` and read UCI lines from `message` events.
 * Resolves once the engine has answered `uci` with `uciok` and `isready` with `readyok`.
 */
function fetchStockfish(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    let worker: Worker;

    try {
      worker = new Worker(ENGINE_URL);
    }
    catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));

      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;

    const handlers: {
      onMessage?: (e: MessageEvent) => void;
      onError?: (e: ErrorEvent) => void;
    } = {};

    const cleanup = () => {
      clearTimeout(timer);
      if (handlers.onMessage)
        worker.removeEventListener('message', handlers.onMessage);
      if (handlers.onError)
        worker.removeEventListener('error', handlers.onError);
    };

    const fail = (message: string) => {
      cleanup();
      worker.terminate();
      reject(new Error(message));
    };

    handlers.onError = (e: ErrorEvent) => fail(e.message || 'Stockfish worker failed to start');

    handlers.onMessage = (e: MessageEvent) => {
      const line = String(e.data);

      if (line.startsWith('uciok')) {
        worker.postMessage('isready');
      }
      else if (line.startsWith('readyok')) {
        cleanup();
        resolve(worker);
      }
    };

    timer = setTimeout(() => fail('Stockfish took too long to start'), INIT_TIMEOUT_MS);

    worker.addEventListener('message', handlers.onMessage);
    worker.addEventListener('error', handlers.onError);
    worker.postMessage('uci');
  });
}
