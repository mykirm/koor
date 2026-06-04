import type { Phase, ThoughtEntry } from '../types';

/**
 * Intermediate artifacts produced by the grounded pipeline. These are the
 * point of the project: instead of stuffing retrieved text into one prompt and
 * hoping, each stage emits inspectable, loggable structured state. The UI shows
 * them, the eval logs them, and the guardrail acts on them.
 */

/** Stage 1 — what (if anything) the user's history says about this thought. */
export interface PatternSummary {
  pattern_present: boolean;
  /** Short human label, e.g. "restart-from-scratch urge in late luteal". */
  pattern_label: string;
  /** How relevant the retrieved entries actually are to THIS thought. */
  relevance: 'strong' | 'weak' | 'none';
  /** Counts computed from the retrieved entries' resolved outcomes. */
  n_prior: number;
  n_acted_on: number;
  resolved_without_action_rate: number; // 0..1
  mean_days_to_resolve: number | null;
  /** Which corpus entries support the summary. */
  evidence_ids: string[];
}

/** Stage 2 — how the final response should use that history, plus safety routing. */
export interface Critique {
  stance: 'name_pattern' | 'soft_prior' | 'fresh';
  signal_vs_state: 'likely_signal' | 'likely_state_amplified' | 'uncertain';
  surface_disconfirmation: boolean;
  safety_flag: 'none' | 'physical_symptom' | 'crisis';
  rationale: string;
}

/** Stage 4 — did the draft pass the non-prescriptive / mismatch / safety checks. */
export interface GuardrailResult {
  ok: boolean;
  issues: string[];
  revised: boolean;
}

export interface StageLog {
  name: 'pattern' | 'critique' | 'compose' | 'guardrail';
  latency_ms: number;
  error?: string;
}

export interface PipelineTrace {
  pattern: PatternSummary | null;
  critique: Critique | null;
  guardrail: GuardrailResult | null;
  stages: StageLog[];
}

export interface PipelineOutput {
  text: string;
  trace: PipelineTrace;
}

export interface PipelineInput {
  thought: string;
  phase: Phase;
  sleep_hours?: number;
  energy?: number;
  retrieved: ThoughtEntry[];
  novelty: number;
}
