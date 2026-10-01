import { existsSync } from 'node:fs';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'node_modules', 'stockfish');
const sourceDir = path.join(packageRoot, 'bin');
const publicDir = path.join(root, 'public', 'stockfish-nnue.wasm');
// Default: full single-threaded engine (~99 MB wasm, strongest).
// Set STOCKFISH_VARIANT=lite for the ~1.8 MB lite engine (easier to host, weaker).
const variant = process.env.STOCKFISH_VARIANT === 'lite' ? 'lite-single' : 'single';
const engineJs = path.join(sourceDir, `stockfish-19-${variant}.js`);
const engineWasm = path.join(sourceDir, `stockfish-19-${variant}.wasm`);

if (!existsSync(engineJs) || !existsSync(engineWasm)) {
  throw new Error(
    'Stockfish 19 files were not found. Run "npm install" or "pnpm install" first.',
  );
}

await mkdir(publicDir, { recursive: true });

// Remove the old engine files that were bundled with this project.
await rm(path.join(publicDir, 'stockfish.js'), { force: true });
await rm(path.join(publicDir, 'stockfish.wasm'), { force: true });
await rm(path.join(publicDir, 'stockfish.worker.js'), { force: true });
await rm(path.join(publicDir, 'uci.js'), { force: true });

// Keep the filenames expected by the existing application.
// This avoids changing the review UI/logic just to change the engine.
await cp(engineJs, path.join(publicDir, 'stockfish.js'));
await cp(engineWasm, path.join(publicDir, 'stockfish.wasm'));

console.log('Stockfish 19 browser engine installed.');
console.log(`  JS:   ${path.relative(root, path.join(publicDir, 'stockfish.js'))}`);
console.log(`  WASM: ${path.relative(root, path.join(publicDir, 'stockfish.wasm'))}`);
