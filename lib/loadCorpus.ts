import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { ThoughtEntrySchema, type ThoughtEntry } from './types';

const CorpusSchema = z.array(ThoughtEntrySchema);

let cached: ThoughtEntry[] | null = null;

export async function loadCorpus(): Promise<ThoughtEntry[]> {
  if (cached) return cached;
  // Prefer the locally-seeded overlay (real mcPHASES physiology, gitignored under
  // the PhysioNet Restricted DUA) when present; otherwise fall back to the
  // committed corpus, which carries narrative + phase only (sleep shows as
  // "unknown" until a credentialed user runs scripts/seed-from-mcphases.ts).
  const seededPath = path.join(process.cwd(), 'data', 'thoughts.seeded.json');
  const committedPath = path.join(process.cwd(), 'data', 'thoughts.json');
  let filePath = committedPath;
  try {
    await fs.access(seededPath);
    filePath = seededPath;
  } catch {
    // no overlay — use the committed corpus
  }
  const raw = await fs.readFile(filePath, 'utf8');
  const json = JSON.parse(raw) as unknown;
  const parsed = CorpusSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`thoughts.json failed schema validation: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}

// For tests or manual reset
export function resetCorpusCache(): void {
  cached = null;
}
