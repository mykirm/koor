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
  hrv_ms: z.number().optional(),
  sleep_hours: z.number().optional(),
  thought: z.string(),
  resolved_outcome: z.string(),
  days_to_resolve: z.number().nullable(),
});
export type ThoughtEntry = z.infer<typeof ThoughtEntrySchema>;

export const ReflectRequestSchema = z.object({
  thought: z.string().min(1).max(2000),
  phase: PhaseSchema,
  sleep: z.number().min(0).max(10).optional(),
  energy: z.number().min(0).max(10).optional(),
});
export type ReflectRequest = z.infer<typeof ReflectRequestSchema>;

export type NoveltyBranch = 'low' | 'mid' | 'high';

export interface ReflectResponse {
  A: { text: string; error?: string };
  B: { text: string; error?: string };
  retrieved: ThoughtEntry[];
  novelty: number;
  novelty_branch: NoveltyBranch;
  reveal_token: string;
  embedding_backend: string;
}

export interface RunRecord {
  ts: string;
  input: ReflectRequest;
  grounded: { text: string; model: string; latency_ms: number; novelty_branch: NoveltyBranch; error?: string };
  baseline: { text: string; model: string; latency_ms: number; error?: string };
  retrieved: ThoughtEntry[];
  novelty: number;
  reveal: { A: 'grounded' | 'baseline'; B: 'grounded' | 'baseline' };
  embedding_backend: string;
}
