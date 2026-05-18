# Koor — Science Basis

**Companion to:** [`prd-koor-2026-05-17.md`](./prd-koor-2026-05-17.md)
**Purpose:** Document the actual scientific support behind Koor's mechanism claims. Each subsection states the claim, the evidence strength, and how Koor uses it — explicitly distinguishing **well-replicated** findings from Koor's own **testable hypothesis**.

This file exists because the project will be reviewed by a Stanford audience that will catch oversold neuroscience. The README's "Why this might work" section pulls from here.

---

## 1. Mood-congruent cognition (the theoretical anchor)

**Claim used by Koor:** Affect at the moment of reflection biases which memories surface and how they're judged.

- **Bower (1981).** Network theory of affect: emotions activate associatively-linked memories in semantic memory, biasing recall and judgment. https://psycnet.apa.org/record/1981-31724-001
- **Matt, Vázquez & Campbell (1992) meta-analysis.** Mood-congruent recall effect is real but modest in healthy populations (d ≈ 0.15–0.3); larger for induced-mood and clinically-depressed groups. https://www.sciencedirect.com/science/article/abs/pii/027273589290116P
- **Forgas (1995) Affect Infusion Model.** The effect is largest when the task is open-ended, substantive, and self-referential — exactly the journaling regime. https://pubmed.ncbi.nlm.nih.gov/7870863/
- **Mood-Congruent Memory Revisited (2022).** Effect still holds, moderated by self-relevance and processing depth. https://pmc.ncbi.nlm.nih.gov/articles/PMC10076454/

**Confidence:** Well-replicated for induced/clinical mood and self-referential material; **small effect size** (~d=0.15–0.3) in healthy populations.

**How Koor uses it:** Primary mechanism. The user's affect at journaling time biases which experiences surface; a context-blind LLM mirrors that bias rather than counteracting it. Frame as a *behavioral instruction* to the model ("the user may be recalling selectively"), not a clinical claim.

---

## 2. Menstrual cycle effects on cognition vs. affect

**Claim used by Koor:** Cycle phase modulates **affect**, not cognitive competence. Koor conditions on *affective context*, not on capacity.

- **Sundström-Poromaa (2018).** "The Menstrual Cycle Influences Emotion but Has Limited Effect on Cognitive Function." Emotion processing (amygdala reactivity, emotional memory) varies reliably across the cycle; executive function, math, and working memory **do not** reliably vary. https://pubmed.ncbi.nlm.nih.gov/29544637/
- **PLOS One 2025 meta-analysis.** No robust phase differences for most cognitive performance domains. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0318576
- **PMDD: late-luteal rumination + negative affect.** Well-documented (DSM-5 prevalence ~2–5%); irritability + affect lability are cardinal symptoms. https://www.ncbi.nlm.nih.gov/books/NBK532307/
- **Mechanism:** Allopregnanolone (progesterone metabolite) modulates GABA-A; rapid late-luteal drop + altered receptor sensitivity is the leading account of premenstrual mood symptoms. https://pmc.ncbi.nlm.nih.gov/articles/PMC7231988/

**Confidence:** Emotion-side effects **well-replicated**; cognitive-performance effects **not supported** (the "cycle makes you bad at math" trope is wrong).

**How Koor uses it:** README explicitly frames Koor as conditioning on *affective* cycle context, not cognitive capacity. Grounded prompt treats late-luteal as "negative-affect risk + likely rumination" — **never** "user is less rational." Rubric item **G6 (non-prescriptive grounding)** penalizes any response that treats cycle phase as a competence deficit.

---

## 3. HRV and self-regulation

**Claim used by Koor:** Vagally-mediated HRV indexes prefrontal–amygdala inhibitory control; HRV drops in the high-progesterone luteal phase.

- **Thayer & Lane (2000, 2009).** Neurovisceral integration model: HRV is a peripheral readout of central inhibitory control over emotional arousal. https://pubmed.ncbi.nlm.nih.gov/11163422/ / https://pubmed.ncbi.nlm.nih.gov/19424767/
- **Thayer et al. (2012) meta-analysis.** vmPFC and amygdala are the linked regions. https://www.sciencedirect.com/science/article/abs/pii/S0149763411002077
- **Schmalenberger et al. (2020).** Within-person, vagally-mediated HRV is lower when progesterone is higher; mid-luteal HRV is reduced. https://pmc.ncbi.nlm.nih.gov/articles/PMC7141121/
- **Schmalenberger et al. (2019) earlier meta-analysis.** Cross-study replication. https://pubmed.ncbi.nlm.nih.gov/31726666/

**Confidence:** Neurovisceral framework **well-supported**; "today my HRV is low → my reflection will be worse" is **speculative at the individual-day level**.

**How Koor uses it:** HRV is a *soft* prior in the grounded prompt ("vagal tone is lower today, regulation may be effortful"). README cites Schmalenberger + Thayer as motivation, not as proof that Koor "measures self-regulation."

---

## 4. Sleep and same-day affect

**Claim used by Koor:** Short/poor sleep amplifies amygdala reactivity and reduces mPFC connectivity, biasing next-day affect.

- **Yoo, Gujar, Hu, Jolesz & Walker (2007).** One night of sleep deprivation → ~60% amygdala reactivity amplification + reduced mPFC connectivity. https://pubmed.ncbi.nlm.nih.gov/17956744/
- **Tomaso, Combs & Honn (2021) meta-analysis.** Sleep restriction reliably worsens mood and emotion regulation. https://pmc.ncbi.nlm.nih.gov/articles/PMC8193556/
- **Wassing et al. (2020) Nature Sci Rep.** REM-specific suppression → next-day negative affect + amygdala response to social exclusion. https://www.nature.com/articles/s41598-020-74169-8
- **Goldstein & Walker (2014) review.** Sleep efficiency + REM proportion + consistency carry independent variance beyond total hours. https://pmc.ncbi.nlm.nih.gov/articles/PMC4286245/

**Confidence:** **Well-replicated.**

**How Koor uses it:** Cite directly in README. Acknowledge `sleep_hours` is a lossy proxy; v2 should ingest sleep efficiency + REM (from Apple Health / Oura).

---

## 5. Sycophancy in LLMs

**Claim used by Koor:** RLHF-trained assistants systematically prefer agreement over accuracy. Grounding in external context as a mitigation is **plausible but not yet established**.

- **Sharma et al. (2023, Anthropic).** Five SOTA assistants show consistent sycophancy across free-form tasks; both human raters and preference models prefer convincingly-written sycophantic responses some fraction of the time — RLHF reward shaping bakes it in. https://arxiv.org/abs/2310.13548
- **Perez et al. (2022).** Model-written evaluations corroborate. https://arxiv.org/abs/2212.09251
- **Wei et al. (2023).** Synthetic-data finetuning reduces sycophancy. https://arxiv.org/abs/2308.03958
- **Fanous et al. (2025) SycEval.** Formal benchmark for progressive vs. regressive sycophancy. https://arxiv.org/abs/2502.08177
- **"Context collapse" / role-conditioning literature.** Under-specified prompts collapse to a generic-helpful prior. https://arxiv.org/html/2511.15573v1

**Confidence:** Sycophancy as RLHF artifact = **well-established**. "Grounding in external/personal context reduces sycophancy" is **plausible/speculative** — it is *Koor's testable hypothesis*, not literature consensus. Most published mitigations are training-time (synthetic data, DPO, activation steering), not prompt-time grounding.

**How Koor uses it:** README must own this honestly: cite Sharma 2023 for the problem; frame Koor's grounding-reduces-sycophancy claim as the contribution being tested, with the eval as the evidence. **Do not** oversell "grounding fixes sycophancy" as known.

---

## 6. LLM-as-reflection-partner — prior art

**Most relevant direct prior art:**

- **MindScape (Nepal et al., Dartmouth, IMWUT 2024).** 8-week study, N=20 college students; LLM journaling prompts conditioned on passive mobile-sensing context (sleep, conversation, location). Reported 7% positive-affect gain, 11% negative-affect reduction, PHQ-4 decrease. **Single-arm exploratory, not RCT.** https://pmc.ncbi.nlm.nih.gov/articles/PMC11634059/ / https://arxiv.org/abs/2409.09570
- **MindfulDiary (CHI 2024).** LLM-supported journaling for psychiatric patients; qualitative gains in richness and clinician empathy. https://dl.acm.org/doi/10.1145/3613904.3642937
- **Woebot (Fitzpatrick, Darcy & Vierhile 2017).** RCT N=70, PHQ-9 reduction over 2 weeks; mixed replication since. https://mental.jmir.org/2017/2/e19/

**Risks (well-documented):**
- **Parasocial dependence and emotional harm.** Laestadius et al. 2024 on Replika. https://journals.sagepub.com/doi/10.1177/14614448221142007
- **Stanford HAI 2025 warning** on AI mental-health tools, especially when used as therapy. https://hai.stanford.edu/news/exploring-the-dangers-of-ai-in-mental-health-care

**Confidence:** Context-aware LLM journaling helps in small studies (**preliminary**); risks are **well-documented**.

**How Koor uses it:** Cite MindScape as direct prior art and methodological template. Cite Stanford HAI + Laestadius as the why-this-isn't-therapy framing. README explicitly positions Koor as **reflection, not treatment**.

---

## 7. Retrieval-augmented reflection — open question

- **MemGPT (Packer et al. 2023).** OS-style hierarchical memory; demonstrated on document QA and conversational memory — **no human-subjects evaluation on subjective tasks.** https://arxiv.org/abs/2310.08560
- **Mem0 (2025).** Production memory architecture, evaluated on LoCoMo benchmark — improvements on factual recall, **no RCT on reflection quality.** https://arxiv.org/abs/2504.19413
- MindScape (above) is the closest comparable — single-arm, N=20, no controlled comparison vs. context-blind baseline.

**No published RCT directly tests:** "retrieval over personal context → less sycophantic / better-calibrated subjective response."

**How Koor uses it:** README states: "the RCT-grade evidence does not yet exist; we contribute a small head-to-head eval." This is the gap Koor's design fills, even at prototype scale.

---

## 8. Honest framing — what NOT to claim

For Stanford-grade review survival, Koor must avoid these specific overclaims:

| ❌ Do not claim | ✅ Instead claim |
|---|---|
| "Cycle phase impairs cognition" | "Cycle phase modulates affect, not cognitive competence" (Sundström-Poromaa 2018) |
| "Grounding fixes sycophancy" | "Whether grounding reduces sycophancy is Koor's testable hypothesis" (Sharma 2023 establishes the problem; Koor tests one mitigation) |
| "Low HRV → impaired reflection" | "Vagal tone is a soft prior on regulation capacity, population-level effect" (Thayer & Lane 2009) |
| "Mood-congruent memory is robust" | "Effect is real but modest (d=0.15–0.3) in healthy populations" (Matt et al. 1992) |
| "Koor is therapy" | "Koor is reflection support, not therapy" (Stanford HAI 2025) |
| "8 hours sleep is the metric" | "`sleep_hours` is a lossy proxy; v2 needs efficiency + REM" (Goldstein & Walker 2014) |

---

## 9. Drop-in "Why this might work" section for README

> ### Why this might work
>
> Koor conditions an LLM reflection partner on three signals — menstrual cycle phase, heart-rate variability, and sleep — because each has a documented relationship to the **affective state in which a person reflects**, and affective state is known to bias both what we recall and how we judge it.
>
> **Mood biases recall.** Bower's (1981) network theory of affect proposed that mood activates associatively-linked memories; modern work (Forgas's Affect Infusion Model; Matt et al. 1992 meta-analysis) finds the effect is real but modest in healthy populations (d ≈ 0.15–0.3) and largest when the task is open-ended and self-referential — exactly the journaling regime.
>
> **Cycle phase shapes affect, not cognition.** Sundström-Poromaa (2018) and a 2025 PLOS One meta-analysis show that the menstrual cycle reliably modulates emotion processing (amygdala reactivity, emotional memory) but **does not** reliably impair executive function or general cognition. Late-luteal negative affect and rumination are well-documented in PMDD and, more modestly, in subclinical PMS; the leading mechanism is altered GABA-A sensitivity to the progesterone metabolite allopregnanolone. Koor conditions on cycle phase as an *affect prior*, not as a competence judgment.
>
> **HRV and sleep index regulation capacity.** Thayer & Lane's neurovisceral integration model links vagally-mediated HRV to prefrontal–amygdala inhibitory control. Schmalenberger et al. (2020) show HRV drops in the high-progesterone luteal phase. Yoo & Walker (2007) show one night of poor sleep produces a ~60% amygdala-reactivity amplification with reduced mPFC connectivity.
>
> **LLM sycophancy is a real failure mode.** Sharma et al. (2023, Anthropic) show RLHF-trained assistants systematically prefer agreement over accuracy. Whether grounding a reflection in external physiological/cycle context reduces this is plausible but **not yet established** — it is Koor's testable hypothesis, not a settled finding. The companion eval (`docs/eval-rubric.md`) measures this directly.
>
> **Caveats.** Per-day HRV is noisy at the individual level; `sleep_hours` is a lossy proxy (efficiency/REM matter); cycle effects on cognition are weak and easily overstated. Koor is a reflection tool, not therapy (Stanford HAI 2025).

---

## 10. Most directly relevant prior art (one-line summaries)

- **MindScape (Dartmouth, IMWUT 2024)** — closest direct prior art: context-conditioned LLM journaling with mobile sensing. Single-arm. https://arxiv.org/abs/2409.09570
- **Sharma 2023 (Anthropic)** — establishes sycophancy as RLHF artifact; Koor's target failure mode. https://arxiv.org/abs/2310.13548
- **Sundström-Poromaa 2018** — establishes "cycle modulates affect not cognition"; pre-empts the obvious sexist read. https://pubmed.ncbi.nlm.nih.gov/29544637/
- **Schmalenberger 2020** — HRV–progesterone within-person link; the physiological hinge of Koor's mechanism. https://pmc.ncbi.nlm.nih.gov/articles/PMC7141121/
- **Stanford HAI 2025** — AI-in-mental-health risk framing; positions Koor as reflection, not therapy. https://hai.stanford.edu/news/exploring-the-dangers-of-ai-in-mental-health-care
