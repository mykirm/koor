import { z } from 'zod';

export const PhaseSchema = z.enum([
  'menstrual',
  'follicular',
  'ovulatory',
  'late_luteal',
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const ThoughtEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  phase: PhaseSchema,
  sleep_hours: z.number().optional(),
  thought: z.string(),
  resolved_outcome: z.string(),
  days_to_resolve: z.number().nullable(),
});
export type ThoughtEntry = z.infer<typeof ThoughtEntrySchema>;

export const ArmNameSchema = z.enum(['blind', 'naive_rag', 'koor']);

export const ReflectRequestSchema = z.object({
  thought: z.string().min(1).max(2000),
  phase: PhaseSchema,
  sleep: z.number().min(0).max(10).optional(),
  energy: z.number().min(0).max(10).optional(),
  /** Which arms to run + compare. Defaults to all three. */
  arms: z.array(ArmNameSchema).min(1).optional(),
});
export type ReflectRequest = z.infer<typeof ReflectRequestSchema>;

export type NoveltyBranch = 'low' | 'mid' | 'high';

// The three comparison arms:
//   blind     — context-blind baseline (no retrieval)
//   naive_rag — the original single grounded prompt: retrieved text + state in one prompt
//   koor      — the multi-stage pipeline (lib/pipeline)
export type ArmName = 'blind' | 'naive_rag' | 'koor';

/** Opaque panel shown to the rater — no arm label until reveal. */
export interface Panel {
  id: string; // 'A' | 'B' | 'C'
  text: string;
  error?: string;
}

export interface ReflectResponse {
  panels: Panel[];
  retrieved: ThoughtEntry[];
  novelty: number;
  novelty_branch: NoveltyBranch;
  reveal_token: string;
  embedding_backend: string;
}

export interface ArmRecord {
  arm: ArmName;
  text: string;
  model: string;
  latency_ms: number;
  error?: string;
  // koor only — the intermediate pipeline artifacts
  trace?: import('./pipeline/types').PipelineTrace;
}

export interface RunRecord {
  ts: string;
  input: ReflectRequest;
  arms: ArmRecord[];
  retrieved: ThoughtEntry[];
  novelty: number;
  /** panel id -> which arm it was */
  reveal: Record<string, ArmName>;
  embedding_backend: string;
}

/** Returned by /api/reveal after a rater has scored — unmasks the panels. */
export interface RevealResponse {
  reveal: Record<string, ArmName>;
  novelty: number;
  novelty_branch: NoveltyBranch;
  trace: import('./pipeline/types').PipelineTrace | null;
}
