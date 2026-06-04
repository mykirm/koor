import type { ArmName, Phase, ThoughtEntry } from './types';
import type { PipelineTrace } from './pipeline/types';
import { SYSTEM_BASELINE, buildGroundedSystemPrompt } from './prompts';
import { complete } from './llm';
import { runGroundedPipeline } from './pipeline/run';

/**
 * The three comparison arms. All three receive the SAME retrieved context, so
 * the only thing that differs is how that context is used:
 *
 *   blind     — gets nothing but the thought (context-blind baseline)
 *   naive_rag — the original single grounded prompt: retrieved entries + state
 *               dumped into one prompt. This is the "wrapper" comparison.
 *   koor      — the four-stage pipeline (pattern -> critique -> compose -> guardrail)
 *
 * If naive_rag and koor tie, the structure isn't earning its complexity; if koor
 * wins, the architecture is doing real work. That contrast is the point.
 */

export const DEFAULT_ARMS: ArmName[] = ['blind', 'naive_rag', 'koor'];

export interface ArmInput {
  thought: string;
  phase: Phase;
  sleep?: number;
  energy?: number;
  retrieved: ThoughtEntry[];
  novelty: number;
}

export interface ArmResult {
  arm: ArmName;
  text: string;
  latency_ms: number;
  error?: string;
  trace?: PipelineTrace; // koor only
}

export async function runArm(arm: ArmName, input: ArmInput): Promise<ArmResult> {
  if (arm === 'blind') {
    const r = await complete(SYSTEM_BASELINE, input.thought);
    return { arm, text: r.text, latency_ms: r.latency_ms, error: r.error };
  }

  if (arm === 'naive_rag') {
    const system = buildGroundedSystemPrompt({
      thought: input.thought,
      phase: input.phase,
      sleep_hours: input.sleep,
      energy: input.energy,
      retrieved: input.retrieved,
      novelty: input.novelty,
    });
    const r = await complete(system, input.thought);
    return { arm, text: r.text, latency_ms: r.latency_ms, error: r.error };
  }

  // koor — the pipeline
  const start = Date.now();
  const out = await runGroundedPipeline({
    thought: input.thought,
    phase: input.phase,
    sleep_hours: input.sleep,
    energy: input.energy,
    retrieved: input.retrieved,
    novelty: input.novelty,
  });
  const error = out.text ? undefined : out.trace.stages.find((s) => s.error)?.error ?? 'pipeline produced no text';
  return { arm, text: out.text, latency_ms: Date.now() - start, error, trace: out.trace };
}

/** Run the requested arms. Arms are independent, so run them in parallel. */
export async function runArms(arms: ArmName[], input: ArmInput): Promise<ArmResult[]> {
  const settled = await Promise.allSettled(arms.map((a) => runArm(a, input)));
  return settled.map((s, i) =>
    s.status === 'fulfilled'
      ? s.value
      : { arm: arms[i], text: '', latency_ms: 0, error: String(s.reason) },
  );
}
