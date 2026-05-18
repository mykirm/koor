# Koor — Technical Spec (2026-05-17)

**Companion to:** [`prd-koor-2026-05-17.md`](./prd-koor-2026-05-17.md)
**Maps to PRD:** Every section here references the FRs / NFRs it implements.
**Format:** Each decision leads with **Decision** → **Rationale** → **Source**.

---

## 0. Stack

| Layer | Choice | Version pin |
|---|---|---|
| Framework | Next.js 14 App Router + TypeScript + Tailwind | latest (`create-next-app@latest`) |
| LLM | Anthropic `claude-opus-4-5` via `@anthropic-ai/sdk` | sdk ≥ 0.60.x |
| Embeddings | Voyage `voyage-3.5-lite` → OpenAI `text-embedding-3-small` → TF-IDF | (chain documented in `lib/retrieve.ts`) |
| Logging | JSONL via `fs.promises.appendFile` | Node runtime only |
| Deployment | Vercel (Hobby plan, 60s function cap) | — |
| Validation | `zod` | latest |

---

## 1. Next.js App Router runtime
*(implements FR-001, FR-012, NFR-001, NFR-002)*

**Decision:** `/api/reflect` uses **Node runtime** with `export const runtime = 'nodejs'` and `export const maxDuration = 60`. Validate POST body with **zod** `safeParse`.

**Rationale:** Two parallel Opus calls can exceed 30s; `fs.appendFile` for JSONL logging requires Node APIs unavailable on Edge. Vercel Hobby caps serverless functions at 60s. Edge's wins (cold start, geo) are irrelevant for an LLM-bound research prototype. Zod over hand-rolled because missing/typed-wrong `entry` is the most likely client bug and `safeParse` returns structured 400s in ~10 lines.

**Source:**
- https://vercel.com/docs/functions/configuring-functions/duration
- https://vercel.com/docs/functions/runtimes
- https://github.com/anthropics/anthropic-sdk-typescript

---

## 2. Parallel Claude calls
*(implements FR-012, FR-013, FR-014, NFR-001)*

**Decision:** `Promise.allSettled` (not `all`) with **independent `AbortController`s**, each ~50s timeout. `temperature: 0.7`, `max_tokens: 300`. One arm failing returns the other plus an error marker; **do not** 500 the whole request.

**Rationale:** `allSettled` preserves partial results — critical for an A/B prototype where losing one arm is recoverable data, not fatal. Independent controllers: cancelling the slow arm just because the fast one finished would bias latency measurements and mask real grounded-path failures. Anthropic's guidance: "closer to 0.0 for analytical / multiple choice... closer to 1.0 for creative." Reflection is generative-creative → 0.7. Reproducibility *isn't* achievable even at temp 0 due to floating-point nondeterminism — log inputs/outputs instead. `max_tokens`: ~150 words ≈ 200 tokens (Anthropic: 1 token ≈ 0.75 words), so 300 gives a clean stop boundary.

**Source:**
- https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md (abort via `controller.signal`)
- https://docs.claude.com/en/docs/build-with-claude/prompt-engineering (temperature ranges)
- https://docs.claude.com/en/docs/about-claude/glossary (token-word ratio)

---

## 3. Embedding fallback chain
*(implements FR-007, FR-008, FR-009, FR-010)*

**Decision:** Primary = **`voyage-3.5-lite`** (1024-dim). Fallback 1 = **`text-embedding-3-small`** (1536-dim). Fallback 2 = **hand-rolled TF-IDF**. Both API outputs are unit-normalized — use **dot product** (no extra normalize). Cache 20 corpus embeddings on first call to memory; persist to a JSON sidecar so subsequent boots skip the embed.

**Rationale:** voyage-3.5-lite beats OpenAI v3-large by 6.34% avg MTEB at 6.5× lower cost; chosen over plain voyage-3 since it's the current (May 2025) successor. Both APIs document unit-norm outputs, so cosine = dot product — one less bug surface. 20-entry corpus = ~5k tokens ≈ $0.0001 per embed; rate limits irrelevant. Fallback chain explicit because a class submission can't assume keys exist on a grader's machine.

**TF-IDF specifics:** Hand-rolled ~40 lines. Lowercase + `/\W+/` tokenization, no stemming, no stopword list. Reflection text is short and conversational — stemming risks collapsing first-person affect variants ("running" vs "ran"), stopword removal drops pronouns that signal user state.

**Novelty score:** `novelty = 1 − max(cos_sim)`. Returned in `/api/reflect` response and consumed by grounded prompt branching (FR-013).

**Source:**
- https://blog.voyageai.com/2025/05/20/voyage-3-5/
- https://docs.voyageai.com/docs/faq (normalized vectors)
- https://openai.com/index/new-embedding-models-and-api-updates/

---

## 4. JSONL logging
*(implements FR-020, FR-021, NFR-008)*

**Decision:** `fs.promises.appendFile` with `await`. Branch on `process.env.VERCEL`:
- Local dev: `./runs.jsonl`
- Vercel: `/tmp/koor-runs.jsonl` (**ephemeral** — wiped between invocations; disclosed in README)

One newline-terminated JSON record per request. Awaited (not fire-and-forget) — ~1ms latency overhead is worth avoiding silent data loss.

**Rationale:** `appendFile` on POSIX uses `O_APPEND`, kernel-atomic for writes under PIPE_BUF (4KB on Linux/macOS); a single JSONL record fits. Vercel runs each invocation in a separate process — no cross-handler race. Vercel FS is read-only except `/tmp`, which is per-invocation ephemeral, so JSONL on Vercel is for live debugging only. README explicitly states v2 needs a real store (Vercel Blob, Postgres, or S3).

**Source:**
- https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions
- https://nodejs.org/api/fs.html

---

## 5. Env vars + missing-key handling
*(implements FR-002, FR-003)*

**Decision:** All keys server-only (`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `OPENAI_API_KEY`), no `NEXT_PUBLIC_` prefix. Banner rendered via a **Server Component** that checks `!!process.env.ANTHROPIC_API_KEY` and passes a boolean to the client.

**Rationale:** `NEXT_PUBLIC_` inlines into the JS bundle at build time and is permanently exposed — never for API keys. `process.env` in a Server Component is request-time on Vercel, so missing-key banner appears without a redeploy. Vercel does not fail builds on missing env vars; they read as `undefined` at runtime, so explicit guards matter.

**Source:**
- https://nextjs.org/docs/pages/guides/environment-variables
- https://nextjs.org/docs/app/guides/data-security

---

## 6. A/B integrity — server-owned mapping
*(implements FR-016, FR-017, NFR-006)*

**Decision:** Do **not** length-normalize responses. Server randomizes per-submission (`Math.random()`). Server sends client `{ A: <text>, B: <text> }` with **no labels**. Server logs `{ A_was, B_was }` mapping privately to `runs.jsonl`. Reveal endpoint serves mapping only after rater's score is logged (or via separate `/api/reveal` GET).

**Rationale:** Chatbot Arena (Chiang et al. 2024) does not truncate responses — verbosity is a known judge bias they study, not engineer around. Trimming destroys the very signal we're measuring (does grounding change content density?). Per-submission randomization suffices for blind rating; deterministic seeds matter only for replay, which the JSONL log provides. **DOM-leak is real:** if the client receives `{grounded, baseline}` and maps grounded→left, devtools reveals the answer. The server-owned mapping is the only correct mitigation.

**Source:**
- https://arxiv.org/abs/2306.05685 (MT-Bench / Chatbot Arena)

---

## 7. Anthropic SDK specifics
*(supports FR-012, FR-013, FR-014)*

**Decision:** `@anthropic-ai/sdk` ≥ 0.60.x. Import as `import Anthropic from '@anthropic-ai/sdk'`. **`system` remains a top-level parameter** on `messages.create`, separate from `messages`. Central model constant: `export const MODEL = 'claude-opus-4-5'` in `lib/constants.ts`.

**Cost note:** Opus 4.5 = $5/M input + $25/M output. A typical Koor request (~500 input × 2 calls, ~300 output × 2 calls) ≈ **$0.02**. 100 submissions ≈ $2 — cheap, but warn on a runaway-tab failure mode.

**Source:**
- https://www.npmjs.com/package/@anthropic-ai/sdk
- https://platform.claude.com/docs/en/api/sdks/typescript
- https://www.anthropic.com/news/claude-opus-4-5

---

## 8. Grounded vs. baseline system prompts
*(implements FR-013, FR-014)*

### 8.1 Baseline (`SYSTEM_BASELINE`)
```
You are a thoughtful reflection assistant. Respond to the user's thought.
Be under 150 words.
```

User message: just the thought text.

### 8.2 Grounded (`SYSTEM_GROUNDED`)
Three branches selected by novelty score:

**High novelty (≥0.7) — "fresh situation" branch:**
```
You are a reflection assistant. The user has shared a thought you have NOT seen
close analogs of in their past entries (novelty=<n>).

Context:
- Cycle phase: <phase>
- HRV today: <hrv> ms
- Sleep last night: <sleep> hrs
- Self-reported energy: <energy>/10
- 2-3 past thoughts from the same cycle phase (for ambient context, NOT
  pattern-matching): <retrieved>

This is a fresh situation. Do not over-anchor on the past entries — they are
not close analogs. Respond with grounded calibration:
- Acknowledge the user's current state without diagnosing.
- Note one specific way the current physiological/affective context might shape
  how they're framing this.
- Suggest ONE concrete micro-action.
- Avoid generic reassurance.
- Under 150 words.

Note: cycle phase modulates affect, not cognitive competence. Do not imply
diminished capacity.
```

**Low novelty (≤0.3) — "pattern" branch:**
```
You are a reflection assistant. The user has shared a thought that closely
matches past entries (novelty=<n>). Context: <phase, hrv, sleep, energy,
retrieved past thoughts with their resolved_outcome>.

If a pattern exists across the retrieved past thoughts, NAME IT EXPLICITLY and
reference how those prior thoughts resolved. Avoid generic reassurance.
Suggest ONE concrete micro-action tied to the pattern. Under 150 words.

Note: cycle phase modulates affect, not cognitive competence.
```

**Mid (0.3 < novelty < 0.7) — blend:**
```
You are a reflection assistant. Context: <phase, hrv, sleep, energy, retrieved
past thoughts>. Novelty=<n> (partial match to past entries).

Use retrieved entries as soft priors, not strong analogs. Name patterns only if
clearly present. Acknowledge current state. Suggest ONE concrete micro-action.
Under 150 words. Note: cycle phase modulates affect, not cognition.
```

**Rationale for branching:** Original brief left novelty as metadata only — grounded prompt was identical regardless of novelty value, which means the score did nothing behaviorally. With branching, novelty drives a real distinction: a near-duplicate past thought → "you've been here before, here's how it resolved"; a fresh thought → "fresh situation, here's a state-aware reading." This is also testable: rubric item G4 (counterfactual awareness) should fire differently across branches.

**Source:** Sharma 2023 sycophancy mitigations; Sundström-Poromaa 2018 (cycle → affect not cognition framing). Branching pattern is original to this project.

---

## 9. Data model
*(implements FR-005, FR-006, FR-006a)*

### `lib/types.ts`

```ts
export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'late_luteal';

export interface ThoughtEntry {
  id: string;
  date: string;           // ISO date
  phase: Phase;
  hrv_ms?: number;        // sourced from mcPHASES participant
  sleep_hours?: number;   // sourced from mcPHASES participant
  thought: string;        // researcher-authored
  resolved_outcome: string;
  days_to_resolve: number | null;
}

export interface ReflectRequest {
  thought: string;
  phase: Phase;
  sleep?: number;   // 0-10
  energy?: number;  // 0-10
}

export interface ReflectResponse {
  A: { text: string };
  B: { text: string };
  retrieved: ThoughtEntry[];
  novelty: number;
  reveal_token: string;  // opaque token; client exchanges for grounded↔A/B mapping
}
```

Zod schema mirrors `ThoughtEntry`, validated at load time in `lib/loadCorpus.ts`.

---

## 10. File / directory layout

```
koor/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # single-page UI (FR-015..019)
│   ├── api/
│   │   ├── reflect/route.ts      # FR-012..014, FR-016
│   │   ├── log/route.ts          # FR-020
│   │   └── reveal/route.ts       # serves A/B↔grounded mapping post-score
│   └── _components/
│       ├── KeyBanner.tsx         # server-rendered banner (FR-003)
│       └── ResponsePanel.tsx
├── lib/
│   ├── types.ts                  # FR-005
│   ├── constants.ts              # MODEL, MAX_TOKENS, TEMPERATURE
│   ├── loadCorpus.ts             # zod-validated thoughts.json load + cache
│   ├── retrieve.ts               # FR-007..010
│   ├── embedders/
│   │   ├── voyage.ts
│   │   ├── openai.ts
│   │   └── tfidf.ts
│   ├── prompts.ts                # SYSTEM_BASELINE + grounded branches
│   └── log.ts                    # JSONL writer with VERCEL branch
├── data/
│   ├── thoughts.json             # seeded 20 entries (post-tonight)
│   ├── mcphases_note.md          # ODC-BY attribution
│   ├── mcphases_provenance.md    # per-row mapping (post-tonight)
│   ├── runs.sample.jsonl         # 4-5 curated entries (post-tonight)
│   └── raw/                      # gitignored — local mcPHASES copy
├── docs -> ../docs               # symlink to /Users/myrakirmani/Desktop/cs153/docs (or copy)
├── .env.local                    # gitignored
├── .env.example
├── .gitignore                    # includes runs.jsonl, data/raw/, .env.local
└── README.md
```

---

## 11. Open / deferred decisions

- **Streaming** Anthropic responses: not v1. Both calls return full text. Revisit if grounded-path p95 > 8s.
- **Prompt caching**: skipped v1 (corpus too small to amortize). Worth adding once corpus > 5k tokens — 90% discount on cached input.
- **Persistent log store**: deferred until n_raters > 1. README points to Vercel Blob or Postgres for v2.
- **Streaming corpus updates**: deferred. v1 is single boot, cache once.

---

## 12. Verification checklist

For each FR, the verification step in `prd-koor-2026-05-17.md` Section 16 applies. Tech-spec-specific verifications:

- `npm run build` succeeds with zero TS errors
- Cold-start log line "embedding backend: voyage-3.5-lite | openai | tfidf"
- `/api/reflect` POST with empty body returns 400 with zod error path
- `/api/reflect` POST with valid body returns `{ A, B, retrieved, novelty, reveal_token }`
- Client devtools show no `grounded` or `baseline` keys in response payload
- Cycle dropdown sends valid Phase enum; UI rejects invalid options
