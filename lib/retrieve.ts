import type { Phase, ThoughtEntry } from './types';
import { RETRIEVE_K, VOYAGE_MODEL, OPENAI_EMBED_MODEL } from './constants';
import { loadCorpus } from './loadCorpus';
import { hasVoyageKey, voyageEmbed } from './embedders/voyage';
import { hasOpenAIKey, openaiEmbed } from './embedders/openai';
import { TfIdf } from './embedders/tfidf';
import { cachedEmbed } from './embedders/cache';

// Route API embeddings through the disk cache so the fixed corpus + scenarios
// aren't re-embedded on every cold start, and so retrieval still works where
// the embedding API isn't reachable (see lib/embedders/cache.ts).
function embedWithCache(backend: EmbeddingBackend, texts: string[]): Promise<number[][]> {
  if (backend === 'voyage-3.5-lite') return cachedEmbed(texts, VOYAGE_MODEL, voyageEmbed);
  return cachedEmbed(texts, OPENAI_EMBED_MODEL, openaiEmbed);
}

export type EmbeddingBackend = 'voyage-3.5-lite' | 'openai-text-embedding-3-small' | 'tfidf';

interface CorpusCache {
  backend: EmbeddingBackend;
  // when backend === 'tfidf', use tfidf to transform queries; vectors live in tfidf
  tfidf?: TfIdf;
  // when backend is API-based, embeddings are unit-normalized vectors (cosine = dot)
  vectors?: number[][];
  entries: ThoughtEntry[];
}

let corpusCache: CorpusCache | null = null;

function chooseBackend(): EmbeddingBackend {
  if (hasVoyageKey()) return 'voyage-3.5-lite';
  if (hasOpenAIKey()) return 'openai-text-embedding-3-small';
  return 'tfidf';
}

async function buildCorpusCache(): Promise<CorpusCache> {
  const entries = await loadCorpus();
  const backend = chooseBackend();
  // Log cold-start backend choice (tech-spec §3, FR-007)
  console.log(`[koor] embedding backend: ${backend}`);

  if (entries.length === 0) {
    return { backend, entries };
  }

  const texts = entries.map((e) => e.thought);

  if (backend === 'tfidf') {
    const tfidf = new TfIdf();
    tfidf.fit(texts);
    return { backend, tfidf, entries };
  }

  const vectors = await embedWithCache(backend, texts);
  return { backend, vectors, entries };
}

async function ensureCache(): Promise<CorpusCache> {
  if (!corpusCache) corpusCache = await buildCorpusCache();
  return corpusCache;
}

async function embedQuery(cache: CorpusCache, query: string): Promise<number[]> {
  if (cache.backend === 'tfidf') return cache.tfidf!.transform(query);
  return (await embedWithCache(cache.backend, [query]))[0];
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export interface RetrieveResult {
  retrieved: ThoughtEntry[];
  novelty: number;
  backend: EmbeddingBackend;
}

export async function retrieve(
  thought: string,
  phase: Phase,
  k: number = RETRIEVE_K,
): Promise<RetrieveResult> {
  const cache = await ensureCache();

  // Phase-filter
  const phaseMask: number[] = [];
  const phaseEntries: ThoughtEntry[] = [];
  cache.entries.forEach((e, i) => {
    if (e.phase === phase) {
      phaseMask.push(i);
      phaseEntries.push(e);
    }
  });

  if (phaseEntries.length === 0) {
    // No past entries in this phase — novelty maxed out
    return { retrieved: [], novelty: 1.0, backend: cache.backend };
  }

  // Query vector + similarities
  const qVec = await embedQuery(cache, thought);
  const sims: number[] = phaseMask.map((idx) => {
    if (cache.backend === 'tfidf') {
      const docVecs = cache.tfidf!.vectors();
      return dot(qVec, docVecs[idx]);
    }
    return dot(qVec, cache.vectors![idx]);
  });

  // Top-k by similarity desc
  const order = sims
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k);

  const retrieved = order.map(({ i }) => phaseEntries[i]);
  const maxSim = order[0]?.s ?? 0;
  const novelty = Math.max(0, Math.min(1, 1 - maxSim));

  return { retrieved, novelty, backend: cache.backend };
}

export function resetRetrievalCache(): void {
  corpusCache = null;
}
