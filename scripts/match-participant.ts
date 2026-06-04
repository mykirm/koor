/**
 * Find the mcPHASES participant whose sleep-by-phase profile is closest to the
 * subject's (Myra's) real self-tracked data, to act as an HRV *donor*.
 *
 * Method: deterministic nearest-neighbor hot-deck donor selection
 * (Andridge & Little 2010, https://pmc.ncbi.nlm.nih.gov/articles/PMC3130338/;
 * cf. Statistics Canada GEIS standardized-rank NN). The subject is missing one
 * field (HRV); we pick the single donor most similar on the SHARED observed
 * variable — mean sleep_hours per cycle phase — using standardized (z-scored)
 * Euclidean distance over the four phases, then impute the donor's HRV.
 *
 * LIMITATION (must be disclosed): we can only match on sleep, then borrow HRV.
 * This assumes sleep-similarity tracks HRV-similarity; it does not claim the
 * donor's HRV is the subject's. The subject's ovulatory/menstrual phases have
 * n=1 observed night each, so those phase means are noisy.
 *
 * READ-ONLY: prints a ranking + a proposed per-day HRV table. Does NOT write
 * thoughts.json (the corpus narratives are pending real entries from Myra).
 *
 * Usage:  npx tsx scripts/match-participant.ts
 */

import { promises as fs } from 'fs';
import path from 'path';

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';
const PHASES: Phase[] = ['follicular', 'ovulatory', 'late_luteal', 'menstrual'];

// ---- Subject's real self-tracked days (sleep = "Time Asleep", from screenshots) ----
// Phase derived from her May 2026 cycle calendar: fertile window May 6-12,
// ovulation May 11, period May 25-30.  *Verify these before relying on them.*
interface SubjectDay {
  date: string;
  phase: Phase;
  sleep_hours: number;
}
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

// -------- CSV (same parser as seed-from-mcphases.ts) --------
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}
async function loadCsv(filePath: string) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  return { header: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}
function colIndex(header: string[], col: string): number {
  const i = header.indexOf(col);
  if (i < 0) throw new Error(`Column "${col}" not found. Header: ${header.join(',')}`);
  return i;
}
function normalizePhase(s: string): Phase | null {
  const t = s.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  if (t === 'menstrual' || t === 'menses') return 'menstrual';
  if (t === 'follicular' || t === 'mid_follicular' || t === 'late_follicular') return 'follicular';
  if (t === 'ovulatory' || t === 'ovulation' || t === 'periovulatory' || t === 'fertility') return 'ovulatory';
  if (t === 'luteal' || t === 'late_luteal' || t === 'mid_luteal' || t === 'premenstrual') return 'late_luteal';
  return null;
}

interface ParticipantDay {
  participant_id: string;
  day_in_study: number;
  phase: Phase;
  hrv_ms: number;
  sleep_hours: number;
}

async function loadParticipantDays(): Promise<ParticipantDay[]> {
  const hormones = await loadCsv(HORMONES_CSV);
  const hId = colIndex(hormones.header, 'id');
  const hDay = colIndex(hormones.header, 'day_in_study');
  const hPhase = colIndex(hormones.header, 'phase');
  const phaseByKey = new Map<string, Phase>();
  for (const r of hormones.rows) {
    const phase = normalizePhase(r[hPhase] ?? '');
    if (phase) phaseByKey.set(`${r[hId]}|${r[hDay]}`, phase);
  }

  const sleep = await loadCsv(SLEEP_CSV);
  const sId = colIndex(sleep.header, 'id');
  const sDay = colIndex(sleep.header, 'sleep_start_day_in_study');
  const sMin = colIndex(sleep.header, 'minutesasleep');
  const sMain = colIndex(sleep.header, 'mainsleep');
  const sleepByKey = new Map<string, number>();
  for (const r of sleep.rows) {
    if (r[sMain] !== 'True') continue;
    const minutes = Number(r[sMin]);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const key = `${r[sId]}|${r[sDay]}`;
    const existing = sleepByKey.get(key);
    if (existing == null || minutes > existing) sleepByKey.set(key, minutes);
  }

  const hrv = await loadCsv(HRV_CSV);
  const vId = colIndex(hrv.header, 'id');
  const vDay = colIndex(hrv.header, 'day_in_study');
  const vRmssd = colIndex(hrv.header, 'rmssd');
  const hrvAgg = new Map<string, { sum: number; n: number }>();
  for (const r of hrv.rows) {
    const rmssd = Number(r[vRmssd]);
    if (!Number.isFinite(rmssd) || rmssd <= 0) continue;
    const key = `${r[vId]}|${r[vDay]}`;
    const cur = hrvAgg.get(key);
    if (cur) { cur.sum += rmssd; cur.n += 1; } else hrvAgg.set(key, { sum: rmssd, n: 1 });
  }

  const out: ParticipantDay[] = [];
  for (const [key, phase] of phaseByKey) {
    const sm = sleepByKey.get(key);
    const ha = hrvAgg.get(key);
    if (sm == null || !ha) continue;
    const [id, dayStr] = key.split('|');
    out.push({
      participant_id: id,
      day_in_study: Number(dayStr),
      phase,
      hrv_ms: Math.round((ha.sum / ha.n) * 10) / 10,
      sleep_hours: Math.round((sm / 60) * 10) / 10,
    });
  }
  return out;
}

function mean(xs: number[]): number { return xs.reduce((a, b) => a + b, 0) / xs.length; }
function std(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

async function main() {
  const pool = await loadParticipantDays();
  const ids = [...new Set(pool.map((p) => p.participant_id))];

  // Per-participant per-phase mean sleep.
  const profile = new Map<string, Partial<Record<Phase, number>>>();
  for (const id of ids) {
    const rec: Partial<Record<Phase, number>> = {};
    for (const ph of PHASES) {
      const xs = pool.filter((p) => p.participant_id === id && p.phase === ph).map((p) => p.sleep_hours);
      if (xs.length) rec[ph] = mean(xs);
    }
    profile.set(id, rec);
  }

  // Subject per-phase mean sleep.
  const subj: Record<Phase, number | undefined> = {} as any;
  for (const ph of PHASES) {
    const xs = SUBJECT.filter((s) => s.phase === ph).map((s) => s.sleep_hours);
    subj[ph] = xs.length ? mean(xs) : undefined;
  }

  // Standardize each phase dimension across participants (z-score).
  const phaseStats: Record<Phase, { mu: number; sd: number }> = {} as any;
  for (const ph of PHASES) {
    const vals = ids.map((id) => profile.get(id)![ph]).filter((v): v is number => v != null);
    phaseStats[ph] = { mu: mean(vals), sd: std(vals) || 1 };
  }

  // Donors must cover all four phases (so HRV is available for every phase the subject needs).
  const eligible = ids.filter((id) => PHASES.every((ph) => profile.get(id)![ph] != null));

  const ranked = eligible
    .map((id) => {
      const rec = profile.get(id)!;
      let sumSq = 0;
      for (const ph of PHASES) {
        const z = (v: number) => (v - phaseStats[ph].mu) / phaseStats[ph].sd;
        sumSq += (z(subj[ph]!) - z(rec[ph]!)) ** 2;
      }
      return { id, dist: Math.sqrt(sumSq), rec };
    })
    .sort((a, b) => a.dist - b.dist);

  console.log(`\n[koor] participants in joined pool: ${ids.length}; eligible (all 4 phases): ${eligible.length}`);
  console.log(`[koor] subject per-phase mean sleep (h): ` +
    PHASES.map((ph) => `${ph}=${subj[ph]?.toFixed(2)}`).join('  '));
  console.log(`\n=== Donor ranking (standardized-Euclidean distance on sleep-by-phase) ===`);
  console.log(`rank  id    dist    foll  ovul  lut   mens`);
  ranked.slice(0, 8).forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(2)}    ${r.id.padEnd(4)}  ${r.dist.toFixed(3)}  ` +
      PHASES.map((ph) => r.rec[ph]!.toFixed(1).padStart(4)).join('  '),
    );
  });

  const donor = ranked[0];
  console.log(`\n=== Best donor: participant ${donor.id} (dist ${donor.dist.toFixed(3)}) ===`);
  console.log(`Proposed HRV pairing — per subject-day, donor's same-phase day with closest sleep:`);
  console.log(`date         phase         my_sleep  donor_day  donor_sleep  donor_hrv_ms`);
  for (const s of SUBJECT) {
    const cands = pool.filter((p) => p.participant_id === donor.id && p.phase === s.phase);
    cands.sort((a, b) => Math.abs(a.sleep_hours - s.sleep_hours) - Math.abs(b.sleep_hours - s.sleep_hours));
    const d = cands[0];
    console.log(
      `${s.date}  ${s.phase.padEnd(12)}  ${s.sleep_hours.toFixed(1).padStart(7)}  ` +
      `${String(d.day_in_study).padStart(8)}  ${d.sleep_hours.toFixed(1).padStart(10)}  ${d.hrv_ms.toFixed(1).padStart(11)}`,
    );
  }
  console.log('');
}

main().catch((err) => { console.error('[koor] match failed:', err); process.exit(1); });
