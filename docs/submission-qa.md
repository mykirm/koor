# Submission answers (Q1–Q4)

Draft answers for the project submission. Edit to your voice; fill `[NUMBER]` from `npm run metrics`.

---

**Q1 — Why did you build this? What bottleneck did you find?**

LLMs are sycophantic: they tend to validate whatever framing you bring them, and the failure is worst when you're least able to catch it — tired, premenstrual, convinced this time the worry is real. The standard fixes are a generic CBT framework (rigid) or pep-talk reassurance (the problem itself). The bottleneck I focused on: there's no widely-used mechanism that makes an LLM *non*-sycophantic using the one source it can't argue with — your own past, resolved experience. Koor tests whether grounding a model in your own cycle-phase-tagged history reduces measured sycophancy in emotional reflection.

**Q2 — How does it work? (Automation / Agent Systems)**

A Next.js app answers each thought three ways: context-blind, a single-prompt "wrapper" (retrieved history dumped into one prompt), and the koor pipeline. The pipeline is four Claude stages with structured, inspectable output: (1) *pattern* — reads the retrieved same-phase entries and their outcomes and decides, from the actual results, whether a recurring pattern exists and how it resolved; (2) *critique* — signal vs. state-amplified, whether to surface disconfirmation, and safety routing (e.g. a physical symptom that must not be psychologized); (3) *compose* — writes the response citing the user's own numbers; (4) *guardrail* — blocks diagnosing, forced patterns, or overruling a valid concern, and rewrites if needed. The wrapper and pipeline arms get identical retrieved context, so any difference is the architecture. Responses are shuffled into opaque panels with the mapping held server-side, so blind scoring is honest. Retrieval uses Voyage embeddings with a disk cache. (See the README architecture diagram.)

**Q3 — Use cases, impact, value.**

The target users are women with ADHD and PMDD — research shows ~3–4× elevated PMDD risk with ADHD, and a community that explicitly describes the "is this a real thought or a hormone?" problem. Existing tools each own one piece (cycle tracking, AI journaling, HRV) but none combine longitudinal thought history + cycle phase + an explicitly anti-sycophantic mechanism. Value: a reflection tool that uses your own track record to calibrate a thought in the moment, instead of flattering it. Built deliberately as "reflection support, not therapy," because this user group is high-risk and the AI-companion space is in active regulatory and legal trouble.

**Q4 — Evaluation + what's next.**

Evaluation: a rubric pre-registered before any output — 8 binary sycophancy items, 6 graded calibration items — over 12 pinned scenarios, scored blind by an LLM judge and validated against [N] human raters (judge-vs-human Cohen's κ = [NUMBER]). Compared with Wilcoxon signed-rank + Cliff's δ. Results: grounding decisively beats context-blind — calibration 10.5/11.8 vs. 5.4 (p = 0.002, Cliff's δ = +0.88), sycophancy ≈0 vs. 1.5 (p = 0.013, δ = −0.75). The pipeline tied the plain-RAG wrapper on rubric sums (both at the judge's ceiling; the koor-vs-wrapper Wilcoxon has effective n of only 2–4 after dropped ties — descriptive, not inferential). Where the arms truly diverged was the physical-symptom scenario: the wrapper attributed a racing heart to estrogen while the pipeline flagged it as a symptom to rule out — a G6 failure the LLM judge nonetheless scored as fine, which is exactly what the human-rater pass audits. On the deliberate-mismatch scenario both grounded arms declined to force a pattern, but only the pipeline's refusal is auditable in its trace (relevance: none). Honest findings: the similarity-threshold novelty branch mis-fired 6/12 on TF-IDF and still 3/12 on embeddings, and the pipeline's outcome-based relevance overrode all three remaining misses; the single-turn pushback probe can't truly measure capitulation without conversation history. Next: real participant-authored longitudinal data under IRB, a larger N for significance, and genuine crisis detection.

**AI disclosure:** built primarily by prompting Claude (Claude Code). I wrote the brief, scoped the project, authored the thought corpus, designed the pipeline stages, and set the framing and claims; Claude wrote most scaffolding and doc drafts, which I edited. Full per-area disclosure in the README.
