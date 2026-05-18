import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import { ThoughtEntrySchema, type ThoughtEntry } from './types';

const CorpusSchema = z.array(ThoughtEntrySchema);

let cached: ThoughtEntry[] | null = null;

export async function loadCorpus(): Promise<ThoughtEntry[]> {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), 'data', 'thoughts.json');
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
