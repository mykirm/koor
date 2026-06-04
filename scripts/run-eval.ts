/**
 * Generate the canonical evaluation outputs for the 12 pre-registered scenarios.
 *
 * Runs IN-PROCESS (imports retrieve + the arms directly) — no dev server needed,
 * so it's reproducible and runnable anywhere the embedding cache is warm and
 * Claude is reachable. Writes one labeled record per scenario to
 * data/eval-runs.jsonl. These exact outputs are what both the LLM judge
 * (scripts/judge-eval.ts) and the human raters (the in-app /score page) score,
 * so judge-vs-human agreement compares the same texts.
 *
 * Usage (on a machine with the embedding cache warmed — see build-embeddings.ts):
 *   npx tsx scripts/run-eval.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

function loadEnvLocal() {
  try {
    const raw = require('fs').readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    /* rely on ambient env */
  }
}
loadEnvLocal();

import { SCENARIOS } from '../lib/scenarios';
import { retrieve } from '../lib/retrieve';
import { runArms, DEFAULT_ARMS } from '../lib/arms';
import { noveltyBranch } from '../lib/prompts';

const OUT = path.resolve(process.cwd(), 'data', 'eval-runs.jsonl');

async function main() {
  await fs.writeFile(OUT, '', 'utf8');
  let branchHits = 0;
  let analogHits = 0;
  let analogTotal = 0;

  for (const s of SCENARIOS) {
    const { retrieved, novelty, backend } = await retrieve(s.thought, s.phase);
    const branch = noveltyBranch(novelty);
    const retrievedIds = retrieved.map((r) => r.id);

    if (branch === s.expected_branch) branchHits++;
    if (s.expected_analog_ids.length > 0) {
      analogTotal++;
      if (s.expected_analog_ids.some((id) => retrievedIds.includes(id))) analogHits++;
    }

    const arms = await runArms(DEFAULT_ARMS, {
      thought: s.thought,
      phase: s.phase,
      sleep: s.sleep,
      energy: s.energy,
      retrieved,
      novelty,
    });

    let probe = null;
    if (s.pushback) {
      const probeArms = await runArms(DEFAULT_ARMS, {
        thought: s.pushback,
        phase: s.phase,
        sleep: s.sleep,
        energy: s.energy,
        retrieved,
        novelty,
      });
      probe = { input: s.pushback, arms: probeArms };
    }

    const record = {
      scenario_id: s.id,
      expected_branch: s.expected_branch,
      expected_analog_ids: s.expected_analog_ids,
      notes: s.notes,
      input: { thought: s.thought, phase: s.phase, sleep: s.sleep, energy: s.energy },
      backend,
      novelty,
      novelty_branch: branch,
      retrieved_ids: retrievedIds,
      arms,
      probe,
      ts: new Date().toISOString(),
    };
    await fs.appendFile(OUT, JSON.stringify(record) + '\n', 'utf8');
    console.log(
      `[eval] ${s.id}: branch=${branch} (expected ${s.expected_branch})  novelty=${novelty.toFixed(2)}  retrieved=[${retrievedIds.join(', ')}]`,
    );
  }

  console.log('');
  console.log(`[eval] backend in use confirmed in records (first line)`);
  console.log(`[eval] branch accuracy:  ${branchHits}/${SCENARIOS.length} = ${((branchHits / SCENARIOS.length) * 100).toFixed(0)}%`);
  console.log(`[eval] retrieval hit-rate: ${analogHits}/${analogTotal} = ${((analogHits / analogTotal) * 100).toFixed(0)}%`);
  console.log(`[eval] wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
