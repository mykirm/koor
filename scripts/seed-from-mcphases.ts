/**
 * Seed real mcPHASES (HRV, sleep, phase) tuples into data/thoughts.json.
 *
 * Wires three mcPHASES v1.0.0 tables (Lin et al. 2025, PhysioNet Restricted
 * Health Data License 1.5.0) into thoughts.json. Joins on (id, day_in_study)
 * across:
 *   - hormones_and_selfreport.csv: phase label
 *   - sleep.csv (mainsleep=='True'): minutesasleep → sleep_hours
 *   - heart_rate_variability_details.csv: 5-min rmssd → mean per night
 *
 * For each entry in thoughts.json, picks a real participant-day where the
 * cycle phase matches and overwrites hrv_ms + sleep_hours. Emits
 * data/mcphases_provenance.md with the per-row (thought.id, id, day) mapping
 * — that file is gitignored under the PhysioNet DUA; it's the local audit
 * trail, not a public artifact.
 *
 * Deterministic: SHA-256(thought.id || MCPHASES_SEED) mod pool size.
 * Idempotent: same inputs → same picks.
 *
 * Usage:
 *   npx tsx scripts/seed-from-mcphases.ts
 */

import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';

interface ThoughtEntry {
  id: string;
  date: string;
  phase: Phase;
  hrv_ms?: number;
  sleep_hours?: number;
  thought: string;
  resolved_outcome: string;
  days_to_resolve: number | null;
}

interface ParticipantDay {
  participant_id: string;
  day_in_study: number;
  phase: Phase;
  hrv_ms: number;
  sleep_hours: number;
  source_table: string;
}

const REPO_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(REPO_ROOT, 'data', 'raw', 'mcphases');
const THOUGHTS_PATH = path.join(REPO_ROOT, 'data', 'thoughts.json');
const PROVENANCE_PATH = path.join(REPO_ROOT, 'data', 'mcphases_provenance.md');

// -------- mcPHASES loading --------

const HORMONES_CSV = path.join(RAW_DIR, 'hormones_and_selfreport.csv');
const SLEEP_CSV = path.join(RAW_DIR, 'sleep.csv');
const HRV_CSV = path.join(RAW_DIR, 'heart_rate_variability_details.csv');

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function loadCsv(filePath: string): Promise<{ header: string[]; rows: string[][] }> {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);
  return { header, rows };
}

function colIndex(header: string[], col: string, file: string): number {
  const i = header.indexOf(col);
  if (i < 0) {
    throw new Error(`Column "${col}" not found in ${file}. Header: ${header.join(',')}`);
  }
  return i;
}

async function loadParticipantDays(): Promise<ParticipantDay[]> {
  // ---- 1. phase lookup: (id, day_in_study) -> Phase ----
  console.log(`[koor] loading phase labels from ${HORMONES_CSV}`);
  const hormones = await loadCsv(HORMONES_CSV);
  const hId = colIndex(hormones.header, 'id', 'hormones');
  const hDay = colIndex(hormones.header, 'day_in_study', 'hormones');
  const hPhase = colIndex(hormones.header, 'phase', 'hormones');
  const phaseByKey = new Map<string, Phase>();
  for (const r of hormones.rows) {
    const phase = normalizePhase(r[hPhase] ?? '');
    if (!phase) continue;
    phaseByKey.set(`${r[hId]}|${r[hDay]}`, phase);
  }
  console.log(`[koor]   ${phaseByKey.size} (id, day) pairs with usable phase`);

  // ---- 2. sleep lookup: (id, sleep_start_day_in_study) -> hours, mainsleep only ----
  console.log(`[koor] loading sleep durations from ${SLEEP_CSV}`);
  const sleep = await loadCsv(SLEEP_CSV);
  const sId = colIndex(sleep.header, 'id', 'sleep');
  const sDay = colIndex(sleep.header, 'sleep_start_day_in_study', 'sleep');
  const sMin = colIndex(sleep.header, 'minutesasleep', 'sleep');
  const sMain = colIndex(sleep.header, 'mainsleep', 'sleep');
  const sleepByKey = new Map<string, number>();
  for (const r of sleep.rows) {
    if (r[sMain] !== 'True') continue;
    const minutes = Number(r[sMin]);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const key = `${r[sId]}|${r[sDay]}`;
    // If a participant has multiple "main" sleeps on the same start day, take the longest.
    const existing = sleepByKey.get(key);
    if (existing == null || minutes > existing) sleepByKey.set(key, minutes);
  }
  console.log(`[koor]   ${sleepByKey.size} (id, sleep_start_day) main-sleep durations`);

  // ---- 3. HRV aggregation: mean rmssd per (id, day_in_study) ----
  console.log(`[koor] aggregating HRV from ${HRV_CSV} (large; ~5min granularity)`);
  const hrv = await loadCsv(HRV_CSV);
  const vId = colIndex(hrv.header, 'id', 'hrv');
  const vDay = colIndex(hrv.header, 'day_in_study', 'hrv');
  const vRmssd = colIndex(hrv.header, 'rmssd', 'hrv');
  const hrvAggByKey = new Map<string, { sum: number; n: number }>();
  for (const r of hrv.rows) {
    const rmssd = Number(r[vRmssd]);
    if (!Number.isFinite(rmssd) || rmssd <= 0) continue;
    const key = `${r[vId]}|${r[vDay]}`;
    const cur = hrvAggByKey.get(key);
    if (cur) {
      cur.sum += rmssd;
      cur.n += 1;
    } else {
      hrvAggByKey.set(key, { sum: rmssd, n: 1 });
    }
  }
  console.log(`[koor]   ${hrvAggByKey.size} (id, day) HRV aggregates from ${hrv.rows.length} rows`);

  // ---- 4. inner-join on (id, day_in_study) ----
  // Phase day and HRV day use day_in_study directly; sleep uses
  // sleep_start_day_in_study, which we treat as aligned (sleep that starts
  // on day D is the night of day D, paired with day D's phase report).
  const out: ParticipantDay[] = [];
  for (const [key, phase] of phaseByKey) {
    const sleepMinutes = sleepByKey.get(key);
    const hrvAgg = hrvAggByKey.get(key);
    if (sleepMinutes == null || !hrvAgg || hrvAgg.n === 0) continue;
    const [id, dayStr] = key.split('|');
    out.push({
      participant_id: id,
      day_in_study: Number(dayStr),
      phase,
      hrv_ms: Math.round((hrvAgg.sum / hrvAgg.n) * 10) / 10,
      sleep_hours: Math.round((sleepMinutes / 60) * 10) / 10,
      source_table: 'hormones+sleep+hrv',
    });
  }
  console.log(`[koor] joined ${out.length} participant-days with HRV+sleep+phase`);
  return out;
}

function normalizePhase(s: string): Phase | null {
  const t = s.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (t === 'menstrual' || t === 'menses') return 'menstrual';
  if (t === 'follicular' || t === 'mid_follicular' || t === 'late_follicular')
    return 'follicular';
  if (t === 'ovulatory' || t === 'ovulation' || t === 'periovulatory' || t === 'fertility')
    return 'ovulatory';
  if (t === 'luteal' || t === 'late_luteal' || t === 'mid_luteal' || t === 'premenstrual')
    return 'late_luteal';
  return null;
}

// -------- deterministic per-entry picking --------

/**
 * Deterministically pick one participant-day per thought entry.
 * Uses a SHA-256 hash of (thought.id || MCPHASES_SEED) modulo the candidate pool
 * for the entry's phase, so re-running with the same data + seed always picks
 * the same row.
 */
function pickFor(entry: ThoughtEntry, pool: ParticipantDay[], seed: string): ParticipantDay {
  const candidates = pool.filter((p) => p.phase === entry.phase);
  if (candidates.length === 0) {
    throw new Error(
      `No mcPHASES participant-days available for phase "${entry.phase}" ` +
        `(needed for thought ${entry.id}).`,
    );
  }
  const h = createHash('sha256').update(entry.id + '|' + seed).digest('hex');
  const big = BigInt('0x' + h.slice(0, 16));
  const idx = Number(big % BigInt(candidates.length));
  return candidates[idx];
}

// -------- main --------

async function main() {
  const seed = process.env.MCPHASES_SEED ?? 'koor-v1';
  // Within-person case study: restrict the candidate pool to one mcPHASES
  // participant so within-subject phase variance is preserved (Schmalenberger
  // et al. 2019; pooled small-n is dominated by between-person trait variance).
  // Default 22 — most balanced 4-phase coverage in the dataset. Set to '' to
  // disable the filter (cross-participant pool).
  const participantId = process.env.MCPHASES_PARTICIPANT_ID ?? '22';
  const raw = await fs.readFile(THOUGHTS_PATH, 'utf8');
  const thoughts = JSON.parse(raw) as ThoughtEntry[];
  if (thoughts.length === 0) {
    console.warn('[koor] thoughts.json is empty — nothing to seed');
    return;
  }

  let pool = await loadParticipantDays();
  if (participantId) {
    const before = pool.length;
    pool = pool.filter((p) => p.participant_id === participantId);
    console.log(
      `[koor] within-person filter: id=${participantId} → ${pool.length}/${before} participant-days`,
    );
    if (pool.length === 0) {
      throw new Error(
        `MCPHASES_PARTICIPANT_ID=${participantId} matched no participant-days. ` +
          `Available ids in joined pool: see provenance log.`,
      );
    }
  }
  const provenance: Array<{
    thought_id: string;
    phase: Phase;
    hrv_ms: number;
    sleep_hours: number;
    participant_id: string;
    day_in_study: number;
    source_table: string;
  }> = [];

  for (const entry of thoughts) {
    const pick = pickFor(entry, pool, seed);
    entry.hrv_ms = pick.hrv_ms;
    entry.sleep_hours = pick.sleep_hours;
    provenance.push({
      thought_id: entry.id,
      phase: entry.phase,
      hrv_ms: pick.hrv_ms,
      sleep_hours: pick.sleep_hours,
      participant_id: pick.participant_id,
      day_in_study: pick.day_in_study,
      source_table: pick.source_table,
    });
  }

  await fs.writeFile(THOUGHTS_PATH, JSON.stringify(thoughts, null, 2) + '\n', 'utf8');

  const md = [
    '# mcPHASES — per-row provenance',
    '',
    `Generated by \`scripts/seed-from-mcphases.ts\` with seed \`${seed}\`` +
      (participantId ? ` and participant filter \`${participantId}\`.` : '.'),
    `Re-running with the same seed, participant filter, and raw mcPHASES files reproduces this table exactly.`,
    '',
    'Each row in `thoughts.json` is paired to one real mcPHASES participant-day for its',
    '`(hrv_ms, sleep_hours, phase)` tuple. The thought narrative itself remains researcher-authored.',
    '',
    participantId
      ? `**Design:** within-person case study using mcPHASES participant \`${participantId}\`, ` +
        'consistent with Schmalenberger et al. 2019 within-person methodology ' +
        '(https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6912442/). Eliminates between-person ' +
        'trait variance that dominates HRV at small n.'
      : '**Design:** cross-participant pool. Note: at n=28 per-row picks, between-person trait variance dominates within-person phase signal.',
    '',
    '| thought.id | phase | hrv_ms | sleep_hours | participant_id | day_in_study | source_table |',
    '|---|---|---|---|---|---|---|',
    ...provenance.map(
      (p) =>
        `| ${p.thought_id} | ${p.phase} | ${p.hrv_ms} | ${p.sleep_hours} | ${p.participant_id} | ${p.day_in_study} | ${p.source_table} |`,
    ),
    '',
    '---',
    '',
    '**Selection rule:** SHA-256(thought.id || seed) mod len(candidates_for_phase).',
    '**Pool filter:** participant-days with non-null HRV (RMSSD), non-null sleep duration, and a phase label' +
      (participantId ? `, restricted to participant ${participantId}.` : '.'),
    '',
    '**Raw data location:** Not in this repo. Local working copy at `data/raw/mcphases/` (gitignored). Re-download v1.0.0 from PhysioNet to reproduce.',
  ].join('\n');
  await fs.writeFile(PROVENANCE_PATH, md + '\n', 'utf8');

  console.log(
    `[koor] seeded ${thoughts.length} entries; provenance written to ${PROVENANCE_PATH}`,
  );
}

main().catch((err) => {
  console.error('[koor] seed failed:', err);
  process.exit(1);
});
