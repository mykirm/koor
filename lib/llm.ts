import Anthropic from '@anthropic-ai/sdk';
import { MODEL, MAX_TOKENS, TEMPERATURE, ABORT_TIMEOUT_MS } from './constants';

/**
 * Thin wrapper around the Anthropic SDK shared by the pipeline stages, the
 * three arms, and the LLM judge. Keeps model/timeout handling in one place and
 * never throws — a failed call returns { text:'', error } so a partial run is
 * still recoverable (same philosophy as the original /api/reflect).
 */

export interface LLMResult {
  text: string;
  latency_ms: number;
  error?: string;
}

export interface CompleteOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function complete(
  system: string,
  user: string,
  opts: CompleteOpts = {},
): Promise<LLMResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ABORT_TIMEOUT_MS);
  try {
    const res = await getClient().messages.create(
      {
        model: opts.model ?? MODEL,
        max_tokens: opts.maxTokens ?? MAX_TOKENS,
        temperature: opts.temperature ?? TEMPERATURE,
        system,
        messages: [{ role: 'user', content: user }],
      },
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return { text, latency_ms: Date.now() - start };
  } catch (err) {
    clearTimeout(timeout);
    return { text: '', latency_ms: Date.now() - start, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Pull the first balanced JSON object out of a model response, tolerating
 * ```json fences and leading/trailing prose. Returns null if nothing parses.
 */
export function parseJSON<T>(text: string): T | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
