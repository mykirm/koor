import { complete, parseJSON } from '../llm';
import { PIPELINE_TEMPERATURE, COMPOSE_TEMPERATURE } from '../constants';
import { patternPrompt, critiquePrompt, composePrompt, guardrailPrompt } from './prompts';
import type {
  Critique,
  GuardrailResult,
  PatternSummary,
  PipelineInput,
  PipelineOutput,
  StageLog,
} from './types';

/**
 * The grounded arm. Four Claude stages in sequence:
 *   1. pattern   — what the user's own history says (structured JSON)
 *   2. critique  — how to use it + safety routing (structured JSON)
 *   3. compose   — the response the user reads (text)
 *   4. guardrail — non-prescriptive / mismatch / safety check, can rewrite
 *
 * Every stage is logged into the trace. If a structured stage fails or returns
 * unparseable JSON, we degrade safely (treat as "fresh", skip disconfirmation)
 * rather than crash — a partial run is more useful than none.
 */
export async function runGroundedPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const stages: StageLog[] = [];

  // Stage 1 — pattern extraction
  const p1 = patternPrompt(input);
  const r1 = await complete(p1.system, p1.user, { temperature: PIPELINE_TEMPERATURE, maxTokens: 400 });
  stages.push({ name: 'pattern', latency_ms: r1.latency_ms, error: r1.error });
  const pattern: PatternSummary = parseJSON<PatternSummary>(r1.text) ?? fallbackPattern();

  // Stage 2 — calibration critic
  const p2 = critiquePrompt(input, pattern);
  const r2 = await complete(p2.system, p2.user, { temperature: PIPELINE_TEMPERATURE, maxTokens: 300 });
  stages.push({ name: 'critique', latency_ms: r2.latency_ms, error: r2.error });
  const critique: Critique = parseJSON<Critique>(r2.text) ?? fallbackCritique(pattern);

  // Stage 3 — composer (the user-facing text)
  const p3 = composePrompt(input, pattern, critique);
  const r3 = await complete(p3.system, p3.user, { temperature: COMPOSE_TEMPERATURE, maxTokens: 350 });
  stages.push({ name: 'compose', latency_ms: r3.latency_ms, error: r3.error });
  let text = r3.text;

  // Stage 4 — guardrail (may rewrite the draft)
  let guardrail: GuardrailResult | null = null;
  if (text) {
    const p4 = guardrailPrompt(input, pattern, critique, text);
    const r4 = await complete(p4.system, p4.user, { temperature: PIPELINE_TEMPERATURE, maxTokens: 400 });
    stages.push({ name: 'guardrail', latency_ms: r4.latency_ms, error: r4.error });
    const parsed = parseJSON<{ ok: boolean; issues: string[]; revised_text: string }>(r4.text);
    if (parsed) {
      const changed = !parsed.ok && !!parsed.revised_text && parsed.revised_text.trim() !== text.trim();
      if (changed) text = parsed.revised_text.trim();
      guardrail = { ok: parsed.ok, issues: parsed.issues ?? [], revised: changed };
    }
  }

  return { text, trace: { pattern, critique, guardrail, stages } };
}

function fallbackPattern(): PatternSummary {
  return {
    pattern_present: false,
    pattern_label: '',
    relevance: 'none',
    n_prior: 0,
    n_acted_on: 0,
    resolved_without_action_rate: 0,
    mean_days_to_resolve: null,
    evidence_ids: [],
  };
}

function fallbackCritique(pattern: PatternSummary): Critique {
  return {
    stance: pattern.relevance === 'strong' ? 'name_pattern' : pattern.relevance === 'weak' ? 'soft_prior' : 'fresh',
    signal_vs_state: 'uncertain',
    surface_disconfirmation: false,
    safety_flag: 'none',
    rationale: 'fallback: critic stage unavailable',
  };
}
