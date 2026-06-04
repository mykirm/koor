/**
 * GET /api/reveal?token=<uuid>
 *
 * Returns the panel->arm mapping (and the koor pipeline trace) for a previously
 * logged run. The client holds only the opaque panels + a reveal_token; to
 * learn which panel was which arm, it must come through this endpoint, which
 * reads the server-side runs.jsonl.
 *
 * This is the second half of the "server owns the mapping" invariant
 * (docs/architecture-koor-2026-05-17.md §3): a rater inspecting the DOM can't
 * deduce which response is grounded before they've scored.
 */

import { NextResponse } from 'next/server';
import { lookupReveal } from '@/lib/log';
import { noveltyBranch } from '@/lib/prompts';
import { open } from '@/lib/sealed';
import type { ArmName, RevealResponse } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SealedPayload {
  reveal: Record<string, ArmName>;
  novelty: number;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'token query param required' }, { status: 400 });
  }

  // Primary: the mapping is sealed in the token (stateless, works across
  // serverless instances). The log lookup is best-effort for the pipeline
  // trace, which is too large to seal.
  const sealed = open<SealedPayload>(token);
  const logged = await lookupReveal(token);
  const mapping = sealed ?? logged;
  if (!mapping) {
    return NextResponse.json({ error: 'token not found' }, { status: 404 });
  }

  const body: RevealResponse = {
    reveal: mapping.reveal,
    novelty: mapping.novelty,
    novelty_branch: noveltyBranch(mapping.novelty),
    trace: logged?.trace ?? null,
  };
  return NextResponse.json(body);
}
