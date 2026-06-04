import { promises as fs } from 'fs';
import path from 'path';
import type { ArmName, RunRecord } from './types';
import type { PipelineTrace } from './pipeline/types';

/**
 * Append-only JSONL run logger.
 *
 * Local dev: writes to ./runs.jsonl in the project root (gitignored).
 * Vercel: filesystem is read-only except /tmp, so we redirect there.
 *
 * Reads (for /api/reveal) go through {@link lookupReveal}.
 */
function runsPath(): string {
  if (process.env.VERCEL) return '/tmp/runs.jsonl';
  return path.join(process.cwd(), 'runs.jsonl');
}

export async function appendRun(record: RunRecord & { reveal_token: string }): Promise<void> {
  const line = JSON.stringify(record) + '\n';
  await fs.appendFile(runsPath(), line, 'utf8');
}

export interface RevealLookup {
  reveal: Record<string, ArmName>;
  novelty: number;
  trace: PipelineTrace | null;
}

/**
 * Reads runs.jsonl and returns the panel->arm mapping (and the koor pipeline
 * trace) for the given reveal_token. Returns null if the token isn't found.
 *
 * Linear scan is fine: this is a research prototype with O(eval scenarios)
 * runs per session. A real product would use a kv store.
 */
export async function lookupReveal(token: string): Promise<RevealLookup | null> {
  let raw: string;
  try {
    raw = await fs.readFile(runsPath(), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  // Scan from the end — newest run with this token wins
  const lines = raw.split('\n').filter((l) => l.length > 0);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const rec = JSON.parse(lines[i]) as Partial<RunRecord & { reveal_token: string }>;
      if (rec.reveal_token === token && rec.reveal) {
        const koor = rec.arms?.find((a) => a.arm === 'koor');
        return { reveal: rec.reveal, novelty: rec.novelty ?? 0, trace: koor?.trace ?? null };
      }
    } catch {
      // skip malformed lines silently — eval data shouldn't be fragile to one bad row
      continue;
    }
  }
  return null;
}
