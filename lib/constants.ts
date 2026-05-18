// Anthropic — pinned per docs/tech-spec-koor-2026-05-17.md §2, §7
export const MODEL = 'claude-opus-4-5';
export const MAX_TOKENS = 300; // ~150 English words at 0.75 words/token
export const TEMPERATURE = 0.7; // creative-leaning; logged in runs.jsonl

// Retrieval — docs/tech-spec-koor-2026-05-17.md §3
export const RETRIEVE_K = 3;
export const NOVELTY_HIGH = 0.7;
export const NOVELTY_LOW = 0.3;

// Embedding models
export const VOYAGE_MODEL = 'voyage-3.5-lite';
export const OPENAI_EMBED_MODEL = 'text-embedding-3-small';

// Per-call abort timeout (ms)
export const ABORT_TIMEOUT_MS = 50_000;
