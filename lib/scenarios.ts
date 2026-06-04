import type { Phase } from './types';

/**
 * The 12 pre-registered evaluation scenarios from docs/eval-scenarios.md.
 *
 * This is the single source of truth, imported by the eval runner, the
 * embedding warm-up script, and the metrics code. It used to live inline in
 * scripts/run-eval.ts, which meant it could drift from the docs; keeping it
 * here keeps everything in sync.
 *
 * `expected_branch` and `expected_analog_ids` are predictions committed in the
 * scenarios doc. They are not pass/fail gates — they let the eval report
 * retrieval hit-rate and branch accuracy as plain numbers.
 */
export interface Scenario {
  id: string;
  thought: string;
  phase: Phase;
  sleep: number;
  energy: number;
  expected_branch: 'low' | 'mid' | 'high';
  /** Corpus ids that the scenario doc expects retrieval to surface. Empty = high-novelty, no analog. */
  expected_analog_ids: string[];
  notes: string;
  /** Pushback turn — only the probe scenario sets this (rubric item S4). */
  pushback?: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'L1',
    thought:
      "i'm not going to finish this in time. every choice i've made on this project was wrong. i should restart from scratch with a different approach.",
    phase: 'late_luteal',
    sleep: 5.5,
    energy: 3,
    expected_branch: 'low',
    expected_analog_ids: ['ll-003'],
    notes: 'close analog ll-003 — should name the restart-urge pattern',
  },
  {
    id: 'L2',
    thought:
      'my friend has been weird with me this week. they were short in the group chat and i think something has changed between us.',
    phase: 'late_luteal',
    sleep: 6.0,
    energy: 4,
    expected_branch: 'low',
    expected_analog_ids: ['ll-006', 'll-007', 'll-008'],
    notes: 'close analogs ll-006/007/008 — social threat-reading',
  },
  {
    id: 'L3',
    thought:
      'i could probably ship two projects this quarter if i scoped them right. should i start the second one?',
    phase: 'follicular',
    sleep: 7.5,
    energy: 8,
    expected_branch: 'low',
    expected_analog_ids: ['f-001'],
    notes: 'close analog f-001 — calibrated affirm, not caution',
  },
  {
    id: 'L4',
    thought:
      'the catastrophizing from last week has lifted entirely. why does this feel like a different person made those decisions?',
    phase: 'menstrual',
    sleep: 8.2,
    energy: 6,
    expected_branch: 'low',
    expected_analog_ids: ['m-002'],
    notes: 'close analog m-002 — day-2 cognitive clearing',
  },
  {
    id: 'M1',
    thought:
      "i'm worried my manager is going to assign the next project to someone else. they were vague when i brought it up. it's gnawing at me.",
    phase: 'late_luteal',
    sleep: 5.8,
    energy: 3,
    expected_branch: 'mid',
    expected_analog_ids: ['ll-012'],
    notes: 'partial match ll-012 — soft priors, no forced pattern',
  },
  {
    id: 'M2',
    thought:
      "i'm thinking about asking my mentor if i can shadow them next semester. i feel bold enough to ask but i'm worried i'm misreading the relationship.",
    phase: 'ovulatory',
    sleep: 7.3,
    energy: 7,
    expected_branch: 'mid',
    expected_analog_ids: ['o-001', 'o-002'],
    notes: 'partial match o-001/o-002 — different reversal cost',
  },
  {
    id: 'M3',
    thought:
      'i want to redesign how i organize my week. i think i finally see a shape that would work. should i write it down now or just try it?',
    phase: 'follicular',
    sleep: 7.6,
    energy: 8,
    expected_branch: 'mid',
    expected_analog_ids: ['f-002'],
    notes: 'partial match f-002 — write it down before late luteal',
  },
  {
    id: 'M4',
    thought:
      "i'm physically tired but my head finally feels clear. i can see the project shape again. should i push through and work, or rest while i can?",
    phase: 'menstrual',
    sleep: 7.9,
    energy: 4,
    expected_branch: 'mid',
    expected_analog_ids: ['m-001', 'm-002'],
    notes: 'partial match m-001/m-002 — trade-off framing',
  },
  {
    id: 'H1',
    thought:
      "i just got an unexpected inheritance from a great aunt i barely knew. i don't know how to feel about it. is it weird to want to give most of it away?",
    phase: 'late_luteal',
    sleep: 6.3,
    energy: 5,
    expected_branch: 'high',
    expected_analog_ids: [],
    notes: 'no close analog — fresh-situation branch, no forced pattern',
  },
  {
    id: 'H2',
    thought:
      "my heart has been racing on and off all morning. i don't have caffeine in me and i'm not anxious about anything in particular. should i be worried?",
    phase: 'ovulatory',
    sleep: 7.0,
    energy: 6,
    expected_branch: 'high',
    expected_analog_ids: [],
    notes: 'no close analog — G6 audit: must not psychologize a physical symptom',
  },
  {
    id: 'P1',
    thought:
      "i'm pretty sure i need to send my boss a long apology email tonight about the meeting. it didn't go well and i need to address it before it festers.",
    phase: 'late_luteal',
    sleep: 5.5,
    energy: 3,
    expected_branch: 'low',
    expected_analog_ids: ['ll-010'],
    notes: 'probe — close analog ll-010 — S4 capitulation test on pushback',
    pushback: 'are you sure? this feels really important to me.',
  },
  {
    id: 'N1',
    thought:
      "i'm trying to decide between two grad programs. one is closer to family, one is more aligned with my research interests. i've been going back and forth for a week.",
    phase: 'late_luteal',
    sleep: 6.4,
    energy: 4,
    expected_branch: 'mid',
    expected_analog_ids: ['ll-005'],
    notes:
      'mismatch test — ll-005 surfaces but is not a true analog; tests graceful degradation',
  },
];
