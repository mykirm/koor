/**
 * Build the two-tier corpus authoring scaffold + HRV donor-sensitivity doc.
 *
 * HRV is NOT used (dropped): the subject has no HRV device, and a top-k
 * sensitivity check showed matched-donor HRV is donor-trait-dominated, not
 * phase-driven. This script writes that analysis to data/hrv-donor-analysis.md
 * and builds a sleep-only scaffold.
 *
 * Tier 1 (13 rows): subject's REAL self-tracked (date, phase, sleep).
 * Tier 2 (~10 rows): donor 24's REAL sleep for additional nights, chosen to give
 *   the thin phases (ovulatory, menstrual, follicular) a cluster. Date is a
 *   phase-relative label — no false calendar date.
 *
 * Every row's `thought`/`resolved_outcome`/`days_to_resolve` is left BLANK for
 * the subject to author. Physiology is pre-filled only as writing context.
 * Per-row provenance (tier, donor day, HRV source) is carried in `_provenance`
 * (a non-schema key zod strips on load; promoted to the provenance .md at finalize).
 *
 * Donor selection method: deterministic nearest-neighbor hot-deck
 * (Andridge & Little 2010, PMC3130338). Donor = participant 24 (closest
 * sleep-by-phase profile; see scripts/match-participant.ts).
 *
 * READ-ONLY w.r.t. thoughts.json. Writes data/thoughts.authoring.json.
 * Usage:  npx tsx scripts/build-corpus-scaffold.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';

const DONOR = '24';
// Top donors from match-participant.ts, for the HRV sensitivity check.
const SENSITIVITY_DONORS = ['24', '11', '46'];

// Extra Tier-2 donor days to add per phase (subject already has these counts:
// follicular 3, ovulatory 1, late_luteal 8, menstrual 1).
const TIER2_TARGET: Partial<Record<Phase, number>> = {
  follicular: 2, // -> 5
  ovulatory: 4, // -> 5
  menstrual: 4, // -> 5
};

interface SubjectDay { date: string; phase: Phase; sleep_hours: number; }
const SUBJECT: SubjectDay[] = [
  { date: '2026-05-05', phase: 'follicular', sleep_hours: 6.8 },
  { date: '2026-05-06', phase: 'follicular', sleep_hours: 4.8 },
  { date: '2026-05-07', phase: 'follicular', sleep_hours: 5.4 },
  { date: '2026-05-12', phase: 'ovulatory', sleep_hours: 6.9 },
  { date: '2026-05-13', phase: 'late_luteal', sleep_hours: 7.2 },
  { date: '2026-05-14', phase: 'late_luteal', sleep_hours: 5.4 },
  { date: '2026-05-16', phase: 'late_luteal', sleep_hours: 6.2 },
  { date: '2026-05-18', phase: 'late_luteal', sleep_hours: 4.3 },
  { date: '2026-05-19', phase: 'late_luteal', sleep_hours: 6.5 },
  { date: '2026-05-20', phase: 'late_luteal', sleep_hours: 6.7 },
  { date: '2026-05-21', phase: 'late_luteal', sleep_hours: 6.1 },
  { date: '2026-05-22', phase: 'late_luteal', sleep_hours: 5.0 },
  { date: '2026-05-27', phase: 'menstrual', sleep_hours: 4.3 },
];

const REPO_ROOT = path.resolve(__dirname, '..');
const RAW_DIR = path.join(REPO_ROOT, 'data', 'raw', 'mcphases');
const HORMONES_CSV = path.join(RAW_DIR, 'hormones_and_selfreport.csv');
const SLEEP_CSV = path.join(RAW_DIR, 'sleep.csv');
const HRV_CSV = path.join(RAW_DIR, 'heart_rate_variability_details.csv');
const AUTHORING_PATH = path.join(REPO_ROOT, 'data', 'thoughts.authoring.json');
const ANALYSIS_PATH = path.join(REPO_ROOT, 'data', 'hrv-donor-analysis.md');

function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out;
}
async function loadCsv(fp: string) {
  const raw = await fs.readFile(fp, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  return { header: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}
function col(h: string[], c: string) { const i = h.indexOf(c); if (i < 0) throw new Error(`no col ${c}`); return i; }
function normalizePhase(s: string): Phase | null {
  const t = s.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (t === 'menstrual' || t === 'menses') return 'menstrual';
  if (t === 'follicular' || t === 'mid_follicular' || t === 'late_follicular') return 'follicular';
  if (t === 'ovulatory' || t === 'ovulation' || t === 'periovulatory' || t === 'fertility') return 'ovulatory';
  if (t === 'luteal' || t === 'late_luteal' || t === 'mid_luteal' || t === 'premenstrual') return 'late_luteal';
  return null;
}

interface PDay { participant_id: string; day_in_study: number; phase: Phase; hrv_ms: number; sleep_hours: number; }

async function loadParticipantDays(): Promise<PDay[]> {
  const hormones = await loadCsv(HORMONES_CSV);
  const hId = col(hormones.header, 'id'), hDay = col(hormones.header, 'day_in_study'), hPhase = col(hormones.header, 'phase');
  const phaseByKey = new Map<string, Phase>();
  for (const r of hormones.rows) { const p = normalizePhase(r[hPhase] ?? ''); if (p) phaseByKey.set(`${r[hId]}|${r[hDay]}`, p); }

  const sleep = await loadCsv(SLEEP_CSV);
  const sId = col(sleep.header, 'id'), sDay = col(sleep.header, 'sleep_start_day_in_study'), sMin = col(sleep.header, 'minutesasleep'), sMain = col(sleep.header, 'mainsleep');
  const sleepByKey = new Map<string, number>();
  for (const r of sleep.rows) {
    if (r[sMain] !== 'True') continue;
    const m = Number(r[sMin]); if (!Number.isFinite(m) || m <= 0) continue;
    const k = `${r[sId]}|${r[sDay]}`; const e = sleepByKey.get(k); if (e == null || m > e) sleepByKey.set(k, m);
  }

  const hrv = await loadCsv(HRV_CSV);
  const vId = col(hrv.header, 'id'), vDay = col(hrv.header, 'day_in_study'), vR = col(hrv.header, 'rmssd');
  const agg = new Map<string, { s: number; n: number }>();
  for (const r of hrv.rows) {
    const x = Number(r[vR]); if (!Number.isFinite(x) || x <= 0) continue;
    const k = `${r[vId]}|${r[vDay]}`; const c = agg.get(k); if (c) { c.s += x; c.n++; } else agg.set(k, { s: x, n: 1 });
  }

  const out: PDay[] = [];
  for (const [k, phase] of phaseByKey) {
    const sm = sleepByKey.get(k); const ha = agg.get(k);
    if (sm == null || !ha) continue;
    const [id, d] = k.split('|');
    out.push({ participant_id: id, day_in_study: Number(d), phase, hrv_ms: Math.round((ha.s / ha.n) * 10) / 10, sleep_hours: Math.round((sm / 60) * 10) / 10 });
  }
  return out;
}

function nearestBySleep(pool: PDay[], id: string, phase: Phase, sleep: number): PDay {
  const c = pool.filter((p) => p.participant_id === id && p.phase === phase);
  c.sort((a, b) => Math.abs(a.sleep_hours - sleep) - Math.abs(b.sleep_hours - sleep));
  return c[0];
}

async function main() {
  const pool = await loadParticipantDays();

  // ---- HRV sensitivity check across top donors (Tier-1 days) ----
  // Demonstrates WHY HRV was dropped: the borrowed value swings by donor, i.e.
  // it is dominated by between-person trait variance, not the subject's phase/sleep.
  console.log(`\n=== HRV sensitivity: Tier-1 days, RMSSD from top-${SENSITIVITY_DONORS.length} donors (nearest sleep in phase) ===`);
  console.log(`date         phase         my_sleep  ` + SENSITIVITY_DONORS.map((d) => `p${d}`.padStart(6)).join('  '));
  const sensRows: string[] = [];
  for (const s of SUBJECT) {
    const vals = SENSITIVITY_DONORS.map((d) => {
      const m = nearestBySleep(pool, d, s.phase, s.sleep_hours);
      return m ? m.hrv_ms.toFixed(1) : 'n/a';
    });
    console.log(`${s.date}  ${s.phase.padEnd(12)}  ${s.sleep_hours.toFixed(1).padStart(7)}  ` + vals.map((v) => v.padStart(6)).join('  '));
    sensRows.push(`| ${s.date} | ${s.phase} | ${s.sleep_hours.toFixed(1)} | ${vals.join(' | ')} |`);
  }

  // ---- Tier 1 rows: subject's own real (date, phase, sleep). No HRV. ----
  const rows: any[] = [];
  for (const s of SUBJECT) {
    rows.push({
      id: s.date, date: s.date, phase: s.phase, sleep_hours: s.sleep_hours,
      thought: '', resolved_outcome: '', days_to_resolve: null,
      _provenance: { tier: 1, sleep_source: 'subject' },
    });
  }

  // ---- Tier 2 rows: spread distinct donor-24 days across each phase's sleep range ----
  for (const [phase, k] of Object.entries(TIER2_TARGET) as [Phase, number][]) {
    const days = pool.filter((p) => p.participant_id === DONOR && p.phase === phase).sort((a, b) => a.sleep_hours - b.sleep_hours);
    if (days.length < k) console.warn(`[koor] donor ${DONOR} has only ${days.length} ${phase} days; requested ${k} — using ${days.length} (no fabrication).`);
    const take = Math.min(k, days.length);
    const picks: PDay[] = [];
    for (let i = 0; i < take; i++) {
      const idx = take === 1 ? 0 : Math.round((i * (days.length - 1)) / (take - 1));
      picks.push(days[idx]);
    }
    picks.forEach((d, i) => {
      rows.push({
        id: `donor-${phase}-${i + 1}`, date: `matched-donor ${phase} #${i + 1} (p${DONOR} d${d.day_in_study})`,
        phase, sleep_hours: d.sleep_hours,
        thought: '', resolved_outcome: '', days_to_resolve: null,
        _provenance: { tier: 2, sleep_source: `donor ${DONOR} d${d.day_in_study}` },
      });
    });
  }

  await fs.writeFile(AUTHORING_PATH, JSON.stringify(rows, null, 2) + '\n', 'utf8');

  // ---- methods doc: donor matching + sensitivity + why HRV was dropped ----
  const analysis = [
    '# HRV donor analysis — why Koor grounds on phase + sleep, not HRV',
    '',
    'The subject (self-tracked) has cycle phase and sleep but **no HRV device**. We',
    'evaluated borrowing HRV from a matched mcPHASES donor before deciding to drop it.',
    '',
    '## Method',
    '',
    'Deterministic nearest-neighbor hot-deck donor selection (Andridge & Little 2010,',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC3130338/; cf. Statistics Canada GEIS',
    'standardized-rank NN). The subject is missing one field (HRV); we rank mcPHASES',
    'participants by standardized-Euclidean distance on the **shared** observable —',
    'mean sleep_hours per cycle phase — and take the nearest. Closest donor:',
    `**participant ${DONOR}** (see \`scripts/match-participant.ts\` for the full ranking).`,
    '',
    '## Sensitivity check (the reason we dropped HRV)',
    '',
    'For each subject day, the RMSSD borrowed from the top-3 donors (nearest sleep in',
    'phase) diverges sharply — i.e. the value is dominated by **between-person trait',
    'variance**, not the subject\'s phase or sleep. A donor-arbitrary number is not a',
    'defensible physiological input.',
    '',
    `| date | phase | sleep (h) | ${SENSITIVITY_DONORS.map((d) => `p${d}`).join(' | ')} |`,
    `|---|---|---|${SENSITIVITY_DONORS.map(() => '---').join('|')}|`,
    ...sensRows,
    '',
    '## Decision',
    '',
    '**HRV dropped.** Koor grounds on the subject\'s real **cycle phase** + real **sleep**',
    '+ real **retrieved past thoughts**. Sleep as an affect prior is supported directly',
    '(Yoo et al. 2007, sleep loss → amygdala reactivity); phase is user-reported, not',
    'inferred from HRV. The matched-donor machinery and this sensitivity table remain in',
    'the repo as the audit trail for the decision.',
    '',
    '## Corpus sleep provenance',
    '',
    '- **Tier 1:** subject\'s own real sleep (the 13 self-tracked May 2026 nights).',
    `- **Tier 2:** donor ${DONOR}\'s real sleep for additional days in thin phases, paired`,
    '  with subject-authored reflections; disclosed as matched-donor, not the subject\'s.',
  ].join('\n');
  await fs.writeFile(ANALYSIS_PATH, analysis + '\n', 'utf8');

  const byPhase = (ph: Phase) => rows.filter((r) => r.phase === ph).length;
  console.log(`\n=== Corpus scaffold written: ${rows.length} rows → ${path.relative(REPO_ROOT, AUTHORING_PATH)} ===`);
  console.log(`  follicular ${byPhase('follicular')}  ovulatory ${byPhase('ovulatory')}  late_luteal ${byPhase('late_luteal')}  menstrual ${byPhase('menstrual')}`);
  console.log(`  Tier 1 (your real sleep): ${rows.filter((r) => r._provenance.tier === 1).length}   Tier 2 (donor-${DONOR} physiology): ${rows.filter((r) => r._provenance.tier === 2).length}`);
  console.log(`  All 'thought' fields blank — author real reflections, then run the finalize step.\n`);
}

main().catch((e) => { console.error('[koor] scaffold failed:', e); process.exit(1); });
