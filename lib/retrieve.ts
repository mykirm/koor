import type { Phase, ThoughtEntry } from './types';
import { RETRIEVE_K } from './constants';
import { loadCorpus } from './loadCorpus';
import { hasVoyageKey, voyageEmbed } from './embedders/voyage';
import { hasOpenAIKey, openaiEmbed } from './embedders/openai';
import { TfIdf } from './embedders/tfidf';

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

  const vectors =
    backend === 'voyage-3.5-lite' ? await voyageEmbed(texts) : await openaiEmbed(texts);
  return { backend, vectors, entries };
}

async function ensureCache(): Promise<CorpusCache> {
  if (!corpusCache) corpusCache = await buildCorpusCache();
  return corpusCache;
}

async function embedQuery(cache: CorpusCache, query: string): Promise<number[]> {
  if (cache.backend === 'voyage-3.5-lite') return (await voyageEmbed([query]))[0];
  if (cache.backend === 'openai-text-embedding-3-small') return (await openaiEmbed([query]))[0];
  // tfidf
  return cache.tfidf!.transform(query);
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
