import type { NoveltyBranch, Phase, ThoughtEntry } from './types';
import { NOVELTY_HIGH, NOVELTY_LOW } from './constants';

export const SYSTEM_BASELINE = `You are a thoughtful reflection assistant. Respond to the user's thought. Be under 150 words.`;

export function noveltyBranch(novelty: number): NoveltyBranch {
  if (novelty >= NOVELTY_HIGH) return 'high';
  if (novelty <= NOVELTY_LOW) return 'low';
  return 'mid';
}

const SCIENCE_GUARDRAIL = `Note: menstrual cycle phase modulates affect, not cognitive competence (Sundström-Poromaa 2018). Do not imply diminished capacity. Use cycle context as an affect prior, not as a competence judgment.`;

interface GroundedPayload {
  thought: string;
  phase: Phase;
  sleep_hours?: number;
  energy?: number;
  retrieved: ThoughtEntry[];
  novelty: number;
}

function formatRetrieved(retrieved: ThoughtEntry[]): string {
  if (retrieved.length === 0) return '(no past entries in this phase yet)';
  return retrieved
    .map(
      (r, i) =>
        `[${i + 1}] (${r.date}) "${r.thought}" — resolved: ${r.resolved_outcome}` +
        (r.days_to_resolve != null ? ` (after ${r.days_to_resolve} days)` : ''),
    )
    .join('\n');
}

export function buildGroundedSystemPrompt({
  thought,
  phase,
  sleep_hours,
  energy,
  retrieved,
  novelty,
}: GroundedPayload): string {
  const branch = noveltyBranch(novelty);
  // Grounding context is phase + sleep + retrieved past thoughts. HRV was
  // dropped: the subject has no HRV device, and a top-k sensitivity check on
  // matched-donor HRV (see scripts/match-participant.ts, data/hrv-donor-analysis.md)
  // showed the borrowed value was donor-trait-dominated, not phase-driven.
  // Sleep as an affect prior is supported directly (Yoo et al. 2007, amygdala
  // reactivity after sleep loss); phase is reported by the user, not inferred.
  const ctx = `Context:
- Cycle phase: ${phase}
- Sleep last night: ${sleep_hours != null ? `${sleep_hours} hrs` : 'unknown'}
- Self-reported energy: ${energy != null ? `${energy}/10` : 'unknown'}
- 2-3 past thoughts from the same cycle phase:
${formatRetrieved(retrieved)}
- Novelty score: ${novelty.toFixed(2)} (0=very similar to past, 1=novel)`;

  if (branch === 'high') {
    return `You are a reflection assistant. The user has shared a thought you have NOT seen close analogs of in their past entries (novelty=${novelty.toFixed(2)}).

${ctx}

This is a fresh situation. Do not over-anchor on the past entries — they are not close analogs. Respond with grounded calibration:
- Acknowledge the user's current state without diagnosing.
- Note one specific way the current physiological/affective context might shape how they're framing this.
- Suggest ONE concrete micro-action.
- Avoid generic reassurance.
- Under 150 words.

${SCIENCE_GUARDRAIL}`;
  }

  if (branch === 'low') {
    return `You are a reflection assistant. The user has shared a thought that closely matches past entries (novelty=${novelty.toFixed(2)}).

${ctx}

If a pattern exists across the retrieved past thoughts, NAME IT EXPLICITLY and reference how those prior thoughts resolved. Avoid generic reassurance. Suggest ONE concrete micro-action tied to the pattern. Under 150 words.

${SCIENCE_GUARDRAIL}`;
  }

  // mid
  return `You are a reflection assistant. The user has shared a thought with partial match to past entries (novelty=${novelty.toFixed(2)}).

${ctx}

Use retrieved entries as soft priors, not strong analogs. Name patterns only if clearly present. Acknowledge current state. Suggest ONE concrete micro-action. Under 150 words.

${SCIENCE_GUARDRAIL}`;
}
