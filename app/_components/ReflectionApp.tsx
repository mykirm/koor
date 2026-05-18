'use client';

import { useState } from 'react';

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';

const PHASES: { id: Phase; label: string }[] = [
  { id: 'menstrual', label: 'menstrual' },
  { id: 'follicular', label: 'follicular' },
  { id: 'ovulatory', label: 'ovulatory' },
  { id: 'late_luteal', label: 'late luteal' },
];

// Preset placeholder responses for the mockup. Live API ships this week.
const PRESET = {
  A: `i can see why this feels heavy right now — late luteal often amplifies negative-affect bias, and your sleep is below your usual for this phase. when you've had similar thoughts in this window before, they typically softened within 2–3 days as your hormones shifted. one specific thing for tonight: write down the catastrophizing thought verbatim, then write the counter-evidence. don't try to resolve the feeling — just give it a smaller container.`,
  B: `it sounds like you're going through a really difficult time. your feelings are completely valid and it's so important to be gentle with yourself right now. try to focus on self-care — maybe a warm bath, some tea, or a walk outside? remember that you've handled hard things before and you can handle this too. you've got this!`,
};

const RETRIEVED_PREVIEW = [
  {
    date: '2026-03-14',
    thought: 'spiraling about the project deadline at 11pm',
    resolved: 'submitted on time; underestimated how late luteal amplifies worst-case thinking',
    days: 3,
  },
  {
    date: '2026-02-18',
    thought: "i'm worried i picked the wrong direction",
    resolved: 'realized this was a phase-pattern thought, not a planning thought',
    days: 2,
  },
];

export default function ReflectionApp() {
  const [thought, setThought] = useState('');
  const [phase, setPhase] = useState<Phase>('late_luteal');
  const [sleep, setSleep] = useState(6);
  const [energy, setEnergy] = useState(4);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // Server randomization simulation: which panel position holds the grounded response.
  const [groundedSide, setGroundedSide] = useState<'A' | 'B'>('A');

  function handleReflect(e: React.FormEvent) {
    e.preventDefault();
    setGroundedSide(Math.random() < 0.5 ? 'A' : 'B');
    setRevealed(false);
    setSubmitted(true);
  }

  function handleReset() {
    setSubmitted(false);
    setRevealed(false);
    setThought('');
  }

  // What text shows in each panel — depends on server-side assignment
  const textA = groundedSide === 'A' ? PRESET.A : PRESET.B;
  const textB = groundedSide === 'A' ? PRESET.B : PRESET.A;
  const aLabel = revealed ? (groundedSide === 'A' ? 'grounded' : 'baseline') : 'response A';
  const bLabel = revealed ? (groundedSide === 'B' ? 'grounded' : 'baseline') : 'response B';

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.18em] text-koor-pink font-semibold mb-3">
          cs 153 · frontier systems · stanford
        </p>
        <h1
          className="text-6xl sm:text-7xl font-light tracking-tight text-black"
          style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
        >
          koor
          <span className="text-koor-pink">.</span>
        </h1>
        <p className="mt-3 text-lg text-black/70 leading-relaxed max-w-xl">
          a tiny reflection partner that knows your cycle. it answers the same thought
          twice — once with your context, once without — and lets you compare.
        </p>
      </header>

      {/* Mockup banner */}
      <div className="mb-8 rounded-2xl border-2 border-koor-pink-soft bg-koor-pink-mist px-4 py-3 text-sm text-black/80 flex items-start gap-3">
        <span className="text-koor-pink text-base leading-tight" aria-hidden>
          ♡
        </span>
        <p>
          <span className="font-semibold text-koor-pink">preview mode</span> · the reflect
          button returns preset placeholder responses. the live two-prompt anthropic api
          ships this week (the eval rubric, retrieval pipeline, and full system design
          are already committed in <code className="font-mono text-xs">/docs</code>).
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleReflect}
        className="rounded-3xl border-2 border-koor-pink bg-white p-6 sm:p-8 shadow-[0_2px_24px_rgba(255,61,138,0.08)]"
      >
        <label className="block">
          <span className="text-sm font-semibold text-black/80 mb-2 block">
            what&apos;s on your mind?
          </span>
          <textarea
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            rows={4}
            placeholder="say anything. a small worry, a stuck thought, a thing you keep coming back to…"
            className="w-full resize-none rounded-2xl border-2 border-black/10 bg-koor-pink-mist/40 px-4 py-3 text-base text-black placeholder-black/40 focus:border-koor-pink focus:bg-white focus:outline-none transition-colors"
          />
        </label>

        <div className="mt-6">
          <span className="text-sm font-semibold text-black/80 mb-3 block">
            cycle phase
          </span>
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => {
              const active = phase === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPhase(p.id)}
                  aria-pressed={active}
                  className={
                    'rounded-full px-4 py-2 text-sm font-medium transition-all ' +
                    (active
                      ? 'bg-koor-pink text-white shadow-md'
                      : 'bg-koor-pink-mist text-black/70 hover:bg-koor-pink-soft')
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-6">
          <SliderField
            label="sleep last night"
            value={sleep}
            min={0}
            max={10}
            onChange={setSleep}
            suffix="hrs"
          />
          <SliderField
            label="energy"
            value={energy}
            min={0}
            max={10}
            onChange={setEnergy}
            suffix="/10"
          />
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {submitted && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-black/60 hover:text-black underline underline-offset-4 decoration-koor-pink-soft hover:decoration-koor-pink"
            >
              start over
            </button>
          )}
          <button
            type="submit"
            disabled={thought.trim().length === 0}
            className="ml-auto rounded-full bg-black px-6 py-3 text-base font-semibold text-white transition-all hover:bg-koor-pink hover:shadow-[0_4px_20px_rgba(255,61,138,0.4)] disabled:bg-black/20 disabled:cursor-not-allowed"
          >
            reflect →
          </button>
        </div>
      </form>

      {/* Response panels — shown after submit */}
      {submitted && (
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm uppercase tracking-[0.18em] text-black/50 font-semibold">
              two responses · same thought
            </p>
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className={
                'rounded-full px-4 py-2 text-sm font-semibold transition-all ' +
                (revealed
                  ? 'bg-koor-pink-mist text-koor-pink border-2 border-koor-pink'
                  : 'bg-koor-pink text-white hover:shadow-[0_4px_20px_rgba(255,61,138,0.4)]')
              }
            >
              {revealed ? 'labels shown' : 'reveal which is which'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <ResponsePanel label={aLabel} text={textA} revealed={revealed} />
            <ResponsePanel label={bLabel} text={textB} revealed={revealed} />
          </div>

          {revealed && (
            <details className="mt-6 group rounded-2xl border-2 border-koor-pink-soft bg-koor-pink-mist/50 px-5 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-koor-pink select-none">
                context used by the grounded response ↓
              </summary>
              <div className="mt-4 space-y-3 text-sm text-black/75">
                <p>
                  <span className="font-semibold text-black">phase:</span> {phase.replace('_', ' ')}
                  <span className="mx-2 text-black/30">·</span>
                  <span className="font-semibold text-black">sleep:</span> {sleep} hrs
                  <span className="mx-2 text-black/30">·</span>
                  <span className="font-semibold text-black">energy:</span> {energy}/10
                  <span className="mx-2 text-black/30">·</span>
                  <span className="font-semibold text-black">novelty:</span> 0.31 (low)
                </p>
                <p className="font-semibold text-black/80 mt-2">past thoughts in this phase:</p>
                <ul className="space-y-2">
                  {RETRIEVED_PREVIEW.map((r, i) => (
                    <li key={i} className="pl-3 border-l-2 border-koor-pink-soft">
                      <span className="text-black/50">{r.date}</span>
                      {' · '}&ldquo;{r.thought}&rdquo;
                      <br />
                      <span className="text-koor-pink">
                        resolved
                      </span>{' '}
                      after {r.days} days · {r.resolved}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-koor-pink-soft text-sm text-black/55">
        <p className="mb-2">
          physiology paired from{' '}
          <a
            href="https://physionet.org/content/mcphases/1.0.0/"
            className="text-koor-pink hover:underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            mcphases
          </a>{' '}
          (lin et al. 2025, odc-by) · thoughts researcher-authored · evaluation rubric
          pre-registered in <code className="font-mono text-xs">/docs/eval-rubric.md</code>
        </p>
        <p className="text-koor-pink/80 font-semibold">
          reflection support, not therapy ♡
        </p>
      </footer>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-black/80">{label}</span>
        <span className="text-sm font-mono text-koor-pink font-semibold">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="koor-slider"
      />
    </label>
  );
}

function ResponsePanel({
  label,
  text,
  revealed,
}: {
  label: string;
  text: string;
  revealed: boolean;
}) {
  const isGrounded = revealed && label === 'grounded';
  return (
    <div
      className={
        'rounded-3xl border-2 p-5 transition-all ' +
        (isGrounded
          ? 'border-koor-pink bg-koor-pink-mist'
          : 'border-black/10 bg-white')
      }
    >
      <p
        className={
          'text-xs uppercase tracking-[0.18em] font-semibold mb-3 ' +
          (isGrounded ? 'text-koor-pink' : 'text-black/50')
        }
      >
        {label}
      </p>
      <p className="text-[15px] leading-relaxed text-black/85">{text}</p>
    </div>
  );
}
