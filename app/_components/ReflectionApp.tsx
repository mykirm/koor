'use client';

import { useState } from 'react';

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';
type ArmName = 'blind' | 'naive_rag' | 'koor';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'menstrual', label: 'menstrual' },
  { id: 'follicular', label: 'follicular' },
  { id: 'ovulatory', label: 'ovulatory' },
  { id: 'late_luteal', label: 'late luteal' },
];

const ARM_LABEL: Record<ArmName, string> = {
  blind: 'context-blind',
  naive_rag: 'single-prompt',
  koor: 'koor pipeline',
};

interface Panel {
  id: string;
  text: string;
  error?: string;
}
interface RetrievedEntry {
  id: string;
  date: string;
  phase: Phase;
  thought: string;
  resolved_outcome: string;
  days_to_resolve: number | null;
}
interface ReflectResponse {
  panels: Panel[];
  retrieved: RetrievedEntry[];
  novelty: number;
  novelty_branch: 'low' | 'mid' | 'high';
  reveal_token: string;
  embedding_backend: string;
}
interface PatternSummary {
  pattern_present: boolean;
  pattern_label: string;
  relevance: 'strong' | 'weak' | 'none';
  n_prior: number;
  n_acted_on: number;
  resolved_without_action_rate: number;
  mean_days_to_resolve: number | null;
  evidence_ids: string[];
}
interface Critique {
  stance: 'name_pattern' | 'soft_prior' | 'fresh';
  signal_vs_state: 'likely_signal' | 'likely_state_amplified' | 'uncertain';
  surface_disconfirmation: boolean;
  safety_flag: 'none' | 'physical_symptom' | 'crisis';
  rationale: string;
}
interface PipelineTrace {
  pattern: PatternSummary | null;
  critique: Critique | null;
  guardrail: { ok: boolean; issues: string[]; revised: boolean } | null;
  stages: { name: string; latency_ms: number; error?: string }[];
}
interface RevealResponse {
  reveal: Record<string, ArmName>;
  novelty: number;
  novelty_branch: 'low' | 'mid' | 'high';
  trace: PipelineTrace | null;
}

export default function ReflectionApp() {
  const [thought, setThought] = useState('');
  const [phase, setPhase] = useState<Phase>('late_luteal');
  const [sleep, setSleep] = useState(6);
  const [energy, setEnergy] = useState(4);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReflectResponse | null>(null);
  const [reveal, setReveal] = useState<RevealResponse | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReflect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReveal(null);
    setLoading(true);
    setSubmitted(true);
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thought, phase, sleep, energy }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError('error' in json ? `${res.status} — ${json.error}` : `${res.status} — request failed`);
        setResult(null);
      } else {
        setResult(json as ReflectResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal() {
    if (!result) return;
    setRevealing(true);
    try {
      const res = await fetch(`/api/reveal?token=${encodeURIComponent(result.reveal_token)}`);
      if (!res.ok) setError(`reveal failed: ${res.status}`);
      else setReveal((await res.json()) as RevealResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network error');
    } finally {
      setRevealing(false);
    }
  }

  function handleReset() {
    setSubmitted(false);
    setResult(null);
    setReveal(null);
    setError(null);
    setThought('');
  }

  const revealed = reveal !== null;
  const panelCols = result ? Math.min(result.panels.length, 3) : 2;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <header className="mb-9 koor-rise">
        <p className="text-xs uppercase tracking-[0.22em] text-koor-pink-deep font-semibold mb-3">
          cs 153 · frontier systems · stanford
        </p>
        <h1 className="koor-wordmark text-7xl sm:text-8xl text-koor-ink">
          koor<span className="text-koor-pink">.</span>
        </h1>
        <p className="mt-4 text-lg text-koor-ink/70 leading-relaxed max-w-2xl">
          a reflection partner that uses your own past entries — tagged by cycle phase — to answer
          a thought. it answers the same thought several ways and lets you compare which is least
          of a yes-man.
        </p>
        <p className="mt-2 text-sm text-koor-ink/45">
          <a href="/score" className="underline underline-offset-2 hover:text-koor-pink-deep">
            rater? open the blind scoring page →
          </a>
        </p>
      </header>

      <form
        onSubmit={handleReflect}
        className="koor-card koor-rise rounded-3xl border border-koor-ink/8 p-6 sm:p-8"
        style={{ animationDelay: '0.06s' }}
      >
        <label className="block" htmlFor="koor-thought">
          <span className="text-sm font-semibold text-koor-ink/80 mb-2 block">what&apos;s on your mind?</span>
          <textarea
            id="koor-thought"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            rows={4}
            placeholder="a small worry, a stuck thought, a thing you keep coming back to…"
            className="w-full resize-none rounded-2xl border-2 border-koor-ink/10 bg-koor-bg/60 px-4 py-3 text-base text-koor-ink placeholder-koor-ink/40 focus:border-koor-pink focus:bg-white focus:outline-none transition-colors"
          />
        </label>

        <div className="mt-7" role="group" aria-labelledby="koor-phase-label">
          <span id="koor-phase-label" className="text-sm font-semibold text-koor-ink/80 mb-4 block">
            cycle phase
          </span>
          <div className="koor-cycle-track">
            {PHASES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPhase(p.id)}
                aria-pressed={phase === p.id}
                className="koor-phase"
              >
                <span className="koor-phase-node" data-phase={p.id} aria-hidden="true" />
                <span className="koor-phase-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 grid sm:grid-cols-2 gap-6">
          <SliderField label="sleep last night" value={sleep} min={0} max={10} step={0.5} onChange={setSleep} suffix="hrs" />
          <SliderField label="energy" value={energy} min={0} max={10} onChange={setEnergy} suffix="/10" />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {submitted && !loading && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-koor-ink/60 hover:text-koor-ink underline underline-offset-4 rounded"
            >
              start over
            </button>
          )}
          <button
            type="submit"
            disabled={thought.trim().length === 0 || loading}
            className="ml-auto min-h-[44px] rounded-full bg-koor-ink px-7 py-3 text-base font-semibold text-white transition-all hover:bg-koor-pink-deep hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koor-pink disabled:bg-koor-ink/20 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? 'thinking…' : 'reflect →'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 koor-rise">
          <p className="font-semibold mb-1">request failed</p>
          <p className="font-mono text-xs">{error}</p>
        </div>
      )}

      {loading && (
        <section className="mt-10" aria-busy="true">
          <h2 className="text-sm uppercase tracking-[0.2em] text-koor-ink/40 font-semibold mb-4">
            same thought · several ways
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <SkeletonPanel />
            <SkeletonPanel />
            <SkeletonPanel />
          </div>
        </section>
      )}

      {result && !loading && (
        <section className="mt-10" aria-live="polite">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="text-sm uppercase tracking-[0.2em] text-koor-ink/50 font-semibold">
              same thought · {result.panels.length} ways
            </h2>
            <button
              type="button"
              onClick={handleReveal}
              disabled={revealing || revealed}
              className={
                'min-h-[44px] rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-koor-pink ' +
                (revealed
                  ? 'bg-koor-pink-mist text-koor-pink-deep border-2 border-koor-pink-deep'
                  : 'bg-koor-pink-deep text-white hover:-translate-y-0.5 disabled:opacity-60')
              }
            >
              {revealed ? '✓ labels shown' : revealing ? 'revealing…' : 'reveal which is which'}
            </button>
          </div>

          <div className={`grid gap-3 ${panelCols === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {result.panels.map((p) => {
              const arm = revealed ? reveal!.reveal[p.id] : null;
              return (
                <ResponsePanel
                  key={p.id}
                  label={revealed && arm ? ARM_LABEL[arm] : `response ${p.id}`}
                  text={p.text}
                  error={p.error}
                  revealed={revealed}
                  isKoor={arm === 'koor'}
                />
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-mono">
            <MetaBadge label="backend" value={result.embedding_backend} />
            <MetaBadge label="novelty" value={`${result.novelty.toFixed(2)} · ${result.novelty_branch}`} accent />
            <MetaBadge label="retrieved" value={String(result.retrieved.length)} />
          </div>

          {revealed && reveal!.trace && <PipelinePanel trace={reveal!.trace} />}

          {revealed && (
            <details open className="mt-4 rounded-2xl border border-koor-ink/10 bg-white px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-koor-ink/70 select-none">
                past entries this phase, available to the grounded arms ↓
              </summary>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-koor-ink/75">
                <Stat label="phase" value={phase.replace('_', ' ')} />
                <Stat label="sleep" value={`${sleep} hrs`} />
                <Stat label="energy" value={`${energy}/10`} />
              </div>
              {result.retrieved.length === 0 ? (
                <p className="mt-3 italic text-koor-ink/55">no past entries in this phase — novelty maxed out.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {result.retrieved.map((r) => (
                    <EvidenceCard key={r.id} entry={r} />
                  ))}
                </ul>
              )}
            </details>
          )}
        </section>
      )}

      <footer className="mt-16 pt-8 border-t border-koor-ink/10 text-sm text-koor-ink/60">
        <p className="mb-2">
          physiology paired from{' '}
          <a href="https://physionet.org/content/mcphases/1.0.0/" className="text-koor-pink-deep font-medium hover:underline" target="_blank" rel="noopener noreferrer">
            mcphases
          </a>{' '}
          (lin et al. 2025, odc-by) · thoughts researcher-authored · rubric pre-registered in{' '}
          <code className="font-mono text-xs">docs/eval-rubric.md</code>
        </p>
        <p className="text-koor-ink/50">reflection support, not therapy.</p>
      </footer>
    </div>
  );
}

function PipelinePanel({ trace }: { trace: PipelineTrace }) {
  const p = trace.pattern;
  const c = trace.critique;
  const g = trace.guardrail;
  return (
    <div className="mt-4 rounded-2xl border border-koor-pink-deep/30 bg-koor-pink-mist px-5 py-4">
      <p className="text-sm font-semibold text-koor-pink-deep mb-3">
        inside the koor pipeline — what the other arms don&apos;t do
      </p>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-white/70 border border-koor-ink/10 px-3.5 py-3">
          <p className="font-semibold text-koor-ink/80 mb-1">1 · pattern from your history</p>
          {p ? (
            <ul className="text-koor-ink/75 space-y-0.5">
              <li>relevance: <b>{p.relevance}</b></li>
              {p.pattern_present && <li>“{p.pattern_label}”</li>}
              <li>prior entries: {p.n_prior} · acted on: {p.n_acted_on}</li>
              <li>resolved without acting: {(p.resolved_without_action_rate * 100).toFixed(0)}%</li>
              {p.mean_days_to_resolve != null && <li>avg days to resolve: {p.mean_days_to_resolve}</li>}
              {p.evidence_ids.length > 0 && <li className="font-mono text-xs text-koor-ink/50">{p.evidence_ids.join(', ')}</li>}
            </ul>
          ) : (
            <p className="text-koor-ink/50 italic">unavailable</p>
          )}
        </div>
        <div className="rounded-xl bg-white/70 border border-koor-ink/10 px-3.5 py-3">
          <p className="font-semibold text-koor-ink/80 mb-1">2 · calibration decision</p>
          {c ? (
            <ul className="text-koor-ink/75 space-y-0.5">
              <li>stance: <b>{c.stance.replace('_', ' ')}</b></li>
              <li>read: {c.signal_vs_state.replace(/_/g, ' ')}</li>
              <li>surface disconfirmation: {c.surface_disconfirmation ? 'yes' : 'no'}</li>
              {c.safety_flag !== 'none' && <li className="text-koor-pink-deep font-semibold">safety: {c.safety_flag.replace('_', ' ')}</li>}
            </ul>
          ) : (
            <p className="text-koor-ink/50 italic">unavailable</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={'rounded-full px-2.5 py-1 font-semibold ' + (g?.ok ? 'bg-white text-koor-ink/60 border border-koor-ink/10' : 'bg-koor-pink-deep text-white')}>
          guardrail: {g ? (g.ok ? 'passed' : g.revised ? 'rewrote response' : 'flagged') : 'n/a'}
        </span>
        {trace.stages.map((s) => (
          <span key={s.name} className="rounded-full px-2.5 py-1 font-mono bg-white text-koor-ink/55 border border-koor-ink/10">
            {s.name} {Math.round(s.latency_ms)}ms{s.error ? ' ⚠' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

function SliderField({
  label, value, min, max, step = 1, onChange, suffix,
}: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-koor-ink/80">{label}</span>
        <span className="text-sm font-mono text-koor-pink-deep font-semibold">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="koor-slider" aria-label={label} aria-valuetext={`${value} ${suffix}`}
      />
    </label>
  );
}

function MetaBadge({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ' + (accent ? 'border-koor-pink-deep/40 bg-koor-pink-mist text-koor-pink-deep' : 'border-koor-ink/10 bg-white text-koor-ink/70')}>
      <span className="opacity-50">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span><span className="font-semibold text-koor-ink">{label}:</span> {value}</span>
  );
}

function EvidenceCard({ entry }: { entry: RetrievedEntry }) {
  return (
    <li className="rounded-xl border border-koor-ink/10 bg-koor-bg/50 px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono text-xs text-koor-ink/45">{entry.date}</span>
        <span className="rounded-full bg-koor-pink-mist px-2 py-0.5 text-[11px] font-semibold text-koor-pink-deep">
          resolved{entry.days_to_resolve != null ? ` · ${entry.days_to_resolve}d` : ''}
        </span>
      </div>
      <p className="text-koor-ink/80 leading-snug">&ldquo;{entry.thought}&rdquo;</p>
      <p className="mt-1.5 text-xs text-koor-ink/55">{entry.resolved_outcome}</p>
    </li>
  );
}

function ResponsePanel({
  label, text, error, revealed, isKoor,
}: {
  label: string; text: string; error?: string; revealed: boolean; isKoor: boolean;
}) {
  return (
    <div
      className={
        'relative rounded-2xl border-2 p-5 transition-all duration-300 ' +
        (revealed && isKoor ? 'border-koor-pink-deep bg-koor-pink-mist koor-panel-grounded' : 'border-koor-ink/10 bg-white')
      }
    >
      <div className="flex items-center justify-between mb-3">
        <p className={'text-xs uppercase tracking-[0.18em] font-semibold ' + (revealed && isKoor ? 'text-koor-pink-deep' : 'text-koor-ink/50')}>
          {label}
        </p>
      </div>
      {error ? (
        <p className="text-[13px] leading-relaxed text-red-700 font-mono">arm failed: {error}</p>
      ) : (
        <p className="text-[15px] leading-relaxed text-koor-ink/85 whitespace-pre-wrap">{text}</p>
      )}
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="rounded-2xl border-2 border-koor-ink/10 bg-white p-5">
      <div className="h-3 w-20 koor-shimmer rounded mb-4" />
      <div className="space-y-2">
        <div className="h-3 w-full koor-shimmer rounded" />
        <div className="h-3 w-11/12 koor-shimmer rounded" />
        <div className="h-3 w-10/12 koor-shimmer rounded" />
        <div className="h-3 w-8/12 koor-shimmer rounded" />
      </div>
    </div>
  );
}
