/**
 * POST /api/reflect
 *
 * 1. validate body (zod)
 * 2. retrieve top-k same-phase past thoughts + novelty
 * 3. run the requested arms (default: blind / naive_rag / koor) in parallel
 * 4. shuffle the arms into opaque panels A/B/C — the server owns the mapping
 * 5. log the full run (arm texts + koor pipeline trace + mapping) to runs.jsonl
 * 6. return only the opaque panels + a reveal_token
 *
 * The browser never learns which panel is which arm. /api/reveal returns the
 * mapping (and the koor trace) only after the rater has scored.
 *
 * Runtime: nodejs (needs fs for run logging).
 */

import { NextResponse } from 'next/server';
import { ReflectRequestSchema, type ArmName, type Panel, type ReflectResponse, type RunRecord } from '@/lib/types';
import { seal } from '@/lib/sealed';
import { retrieve } from '@/lib/retrieve';
import { noveltyBranch } from '@/lib/prompts';
import { MODEL } from '@/lib/constants';
import { appendRun } from '@/lib/log';
import { DEFAULT_ARMS, runArms } from '@/lib/arms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PANEL_IDS = ['A', 'B', 'C', 'D'];

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const parsed = ReflectRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation failed', issues: parsed.error.issues }, { status: 400 });
  }
  const { thought, phase, sleep, energy, arms } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set — see .env.example' }, { status: 503 });
  }

  // Retrieval
  const { retrieved, novelty, backend } = await retrieve(thought, phase);
  const branch = noveltyBranch(novelty);

  // Run the arms
  const armList: ArmName[] = arms ?? DEFAULT_ARMS;
  const results = await runArms(armList, { thought, phase, sleep, energy, retrieved, novelty });

  // Shuffle arms into opaque panels; the server keeps the mapping
  const order = shuffle(results);
  const panels: Panel[] = order.map((r, i) => ({
    id: PANEL_IDS[i],
    text: r.text,
    ...(r.error ? { error: r.error } : {}),
  }));
  const reveal: Record<string, ArmName> = {};
  order.forEach((r, i) => {
    reveal[PANEL_IDS[i]] = r.arm;
  });

  // The mapping is sealed into the token itself (stateless — survives serverless
  // instance hops on Vercel); the full record incl. trace is also logged.
  const reveal_token = seal({ reveal, novelty });

  const response: ReflectResponse = {
    panels,
    retrieved,
    novelty,
    novelty_branch: branch,
    reveal_token,
    embedding_backend: backend,
  };

  const record: RunRecord & { reveal_token: string } = {
    ts: new Date().toISOString(),
    input: parsed.data,
    arms: results.map((r) => ({
      arm: r.arm,
      text: r.text,
      model: MODEL,
      latency_ms: r.latency_ms,
      ...(r.error ? { error: r.error } : {}),
      ...(r.trace ? { trace: r.trace } : {}),
    })),
    retrieved,
    novelty,
    reveal,
    embedding_backend: backend,
    reveal_token,
  };
  try {
    await appendRun(record);
  } catch (err) {
    console.error('[koor] runs.jsonl append failed:', err);
  }

  return NextResponse.json(response);
}
