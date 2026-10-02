import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';

import { CoachError, generateCoachAdvice } from './ai.js';

import 'dotenv/config';

const MAX_BODY_BYTES = 32_768;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 60_000;
const recentRequests = new Map();
let lastRateLimitCleanup = Date.now();

const allowedOrigins = new Set(
  (process.env.AI_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
);

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });

  response.end(JSON.stringify(payload));
}

function applyCors(request, response) {
  const origin = request.headers.origin;

  if (!origin)
    return true;

  if (!allowedOrigins.has(origin))
    return false;

  response.setHeader('access-control-allow-origin', origin);
  response.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');
  response.setHeader('vary', 'Origin');

  return true;
}

function isRateLimited(ip) {
  const now = Date.now();

  if (now - lastRateLimitCleanup >= RATE_WINDOW_MS) {
    for (const [trackedIp, timestamps] of recentRequests) {
      if (timestamps.every(time => now - time >= RATE_WINDOW_MS))
        recentRequests.delete(trackedIp);
    }

    lastRateLimitCleanup = now;
  }

  const timestamps = (recentRequests.get(ip) ?? []).filter(time => now - time < RATE_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT) {
    recentRequests.set(ip, timestamps);

    return true;
  }

  timestamps.push(now);
  recentRequests.set(ip, timestamps);

  return false;
}

async function readJson(request) {
  const contentType = request.headers['content-type'] ?? '';

  if (!contentType.toLowerCase().includes('application/json'))
    throw new CoachError(415, 'Send the review as JSON.');

  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_BODY_BYTES)
      throw new CoachError(413, 'The review data is too large.');

    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  catch {
    throw new CoachError(400, 'The review data is not valid JSON.');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');

  if (url.pathname !== '/api/health' && url.pathname !== '/api/coach') {
    sendJson(response, 404, { error: 'Not found.' });

    return;
  }

  if (!applyCors(request, response)) {
    sendJson(response, 403, { error: 'This website is not allowed to use the AI Coach API.' });

    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();

    return;
  }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, {
      ok: true,
      coachConfigured: Boolean(process.env.AI_API_KEY),
      model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    });

    return;
  }

  if (url.pathname !== '/api/coach' || request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' });

    return;
  }

  const ip = request.socket.remoteAddress ?? 'unknown';

  if (isRateLimited(ip)) {
    sendJson(response, 429, { error: 'Too many coaching requests. Wait a minute and try again.' });

    return;
  }

  try {
    const review = await readJson(request);
    const advice = await generateCoachAdvice(review);
    sendJson(response, 200, advice);
  }
  catch (error) {
    const status = error instanceof CoachError ? error.status : 500;
    const message = error instanceof CoachError ? error.message : 'The coaching request failed.';

    sendJson(response, status, { error: message });
  }
});

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? process.env.AI_SERVER_PORT ?? 8787);

server.listen(port, host, () => {
  console.log(`AI Coach API listening on http://${host}:${port}`);
});
