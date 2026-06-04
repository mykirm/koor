/**
 * Warm the embedding cache for the fixed corpus + the 12 eval scenarios.
 *
 * Run this once, on a machine where the embedding API is reachable:
 *   npx tsx scripts/build-embeddings.ts
 *
 * It writes data/embeddings.<model>.json. After that, retrieval and the eval
 * runner read vectors from disk — reproducible, and runnable even where the
 * embedding API is blocked. Re-running is cheap: already-cached texts are skipped.
 *
 * Reads keys from .env.local (a standalone tsx script doesn't get Next.js's
 * env loading, so we parse it here).
 */

import { promises as fs } from 'fs';
import path from 'path';

// --- load .env.local into process.env (minimal parser, no dependency) -------
function loadEnvLocal() {
  try {
    const raw = require('fs').readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}
loadEnvLocal();

import { VOYAGE_MODEL, OPENAI_EMBED_MODEL } from '../lib/constants';
import { hasVoyageKey, voyageEmbed } from '../lib/embedders/voyage';
import { hasOpenAIKey, openaiEmbed } from '../lib/embedders/openai';
import { cachedEmbed, cacheCoverage } from '../lib/embedders/cache';
import { SCENARIOS } from '../lib/scenarios';

async function main() {
  const corpusRaw = await fs.readFile(path.resolve(process.cwd(), 'data', 'thoughts.json'), 'utf8');
  const corpus = JSON.parse(corpusRaw) as Array<{ thought: string }>;

  const texts = [
    ...corpus.map((e) => e.thought),
    ...SCENARIOS.map((s) => s.thought),
    ...SCENARIOS.filter((s) => s.pushback).map((s) => s.pushback as string),
  ];

  let model: string;
  let embedFn: (b: string[]) => Promise<number[][]>;
  if (hasVoyageKey()) {
    model = VOYAGE_MODEL;
    embedFn = voyageEmbed;
  } else if (hasOpenAIKey()) {
    model = OPENAI_EMBED_MODEL;
    embedFn = openaiEmbed;
  } else {
    console.error('No VOYAGE_API_KEY or OPENAI_API_KEY found in env / .env.local. Nothing to warm.');
    process.exit(1);
  }

  const before = await cacheCoverage(texts, model);
  console.log(`[embeddings] model=${model}  cached ${before.hit}/${before.total} before`);

  await cachedEmbed(texts, model, embedFn);

  const after = await cacheCoverage(texts, model);
  console.log(`[embeddings] cached ${after.hit}/${after.total} after`);
  console.log(`[embeddings] wrote data/embeddings.${model.replace(/[^a-z0-9.\-]/gi, '_')}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
