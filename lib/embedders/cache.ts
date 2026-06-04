import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

/**
 * Disk-backed embedding cache.
 *
 * Embeddings are deterministic for a given (text, model), and our corpus and
 * eval scenarios are fixed text. Caching the vectors to disk means:
 *   - the corpus isn't re-embedded on every server cold start,
 *   - the eval is reproducible offline once the cache is warmed
 *     (see scripts/build-embeddings.ts),
 *   - a machine that can't reach the embedding API can still run retrieval
 *     against a pre-warmed cache.
 *
 * A brand-new user thought (never seen before) is embedded live and added to
 * the cache. On read-only hosts (Vercel) the write is skipped silently and the
 * in-memory copy serves the rest of the process.
 */

type Vec = number[];
type CacheFile = Record<string, Vec>; // sha1(text) -> vector

function keyFor(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function cachePath(model: string): string {
  const safe = model.replace(/[^a-z0-9.\-]/gi, '_');
  return path.join(process.cwd(), 'data', `embeddings.${safe}.json`);
}

const memCache = new Map<string, CacheFile>(); // model -> file contents

async function loadFile(model: string): Promise<CacheFile> {
  const hit = memCache.get(model);
  if (hit) return hit;
  let file: CacheFile = {};
  try {
    file = JSON.parse(await fs.readFile(cachePath(model), 'utf8')) as CacheFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    // no cache yet — start empty
  }
  memCache.set(model, file);
  return file;
}

async function saveFile(model: string, file: CacheFile): Promise<void> {
  memCache.set(model, file);
  try {
    await fs.writeFile(cachePath(model), JSON.stringify(file), 'utf8');
  } catch {
    // read-only filesystem (e.g. Vercel) — in-memory cache still works
  }
}

/** How many of these texts are already cached (used by the warm-up script for reporting). */
export async function cacheCoverage(texts: string[], model: string): Promise<{ hit: number; total: number }> {
  const file = await loadFile(model);
  const hit = texts.filter((t) => keyFor(t) in file).length;
  return { hit, total: texts.length };
}

/**
 * Embed `texts`, reusing cached vectors and calling `embedFn` only for the
 * misses. Returns vectors in the same order as `texts`.
 */
export async function cachedEmbed(
  texts: string[],
  model: string,
  embedFn: (batch: string[]) => Promise<Vec[]>,
): Promise<Vec[]> {
  const file = await loadFile(model);
  const missIdx: number[] = [];
  texts.forEach((t, i) => {
    if (!(keyFor(t) in file)) missIdx.push(i);
  });
  if (missIdx.length > 0) {
    const fresh = await embedFn(missIdx.map((i) => texts[i]));
    missIdx.forEach((origIdx, j) => {
      file[keyFor(texts[origIdx])] = fresh[j];
    });
    await saveFile(model, file);
  }
  return texts.map((t) => file[keyFor(t)]);
}
