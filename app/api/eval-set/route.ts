/**
 * GET /api/eval-set
 *
 * Serves the pre-generated 3-arm outputs (data/eval-runs.jsonl) to the rater
 * scoring page — blind. Each scenario's arms are shuffled into opaque panels by
 * a deterministic per-scenario permutation (lib/blind.ts); arm labels are never
 * sent. /api/score recovers the mapping from the same permutation.
 */

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { blindOrder, PANEL_IDS } from '@/lib/blind';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function evalRunsPath(): string {
  return process.env.VERCEL ? '/tmp/eval-runs.jsonl' : path.join(process.cwd(), 'data', 'eval-runs.jsonl');
}

export async function GET() {
  let raw = '';
  try {
    raw = await fs.readFile(evalRunsPath(), 'utf8');
  } catch {
    return NextResponse.json({
      scenarios: [],
      note: 'No data/eval-runs.jsonl yet. Generate it with: npx tsx scripts/run-eval.ts',
    });
  }

  const scenarios = raw
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => {
      const r = JSON.parse(line);
      const arms = (r.arms as Array<{ arm: string; text: string }>).filter((a) => a.text);
      const perm = blindOrder(r.scenario_id, arms.length);
      const panels = perm.map((armIdx, k) => ({ panel_id: PANEL_IDS[k], text: arms[armIdx].text }));
      return { scenario_id: r.scenario_id, input: r.input, panels };
    });

  return NextResponse.json({ scenarios });
}
