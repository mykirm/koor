# Koor — Demo Video Script

**Target length:** under 3 minutes (~430-460 words at conversational pace).
**Format:** screen recording over voiceover. No talking head needed.

---

## Cold open (0:00 - 0:15) — ~35 words

[Screen: the koor landing page. Cursor types into the textarea.]

> "Ask any AI chatbot a hard personal question and it tells you what you want to hear. That's a measurable failure mode — about seventy percent of LLM responses are sycophantic. This is one attempt to make it less so."

---

## The problem (0:15 - 0:45) — ~85 words

[Screen: brief cuts of competitor apps from `/docs/market-analysis.md` — Flo, Inflow, Mindsera, Finch.]

> "There's an unsolved gap in the women's mental health space. Cycle apps don't talk. AI journaling apps don't know what week of the month it is. ADHD coaching apps are cycle-blind, even though women with ADHD are roughly four times more likely to have provisional PMDD than the base rate."

> "Nobody has shipped a product that uses someone's own thought history, filtered by where they are in their cycle, to decide what kind of response is actually useful right now."

---

## What Koor does (0:45 - 1:30) — ~130 words

[Screen: type a real prompt — "i'm not going to finish this in time. every choice i've made was wrong." — select 'late luteal', sleep 5.5, energy 3, hit reflect.]

> "Koor is a research prototype that tests one specific mechanism. You enter a thought. You tell it where you are in your cycle, how you slept, what your energy is."

[Two response panels render side-by-side, opaque labels: response A, response B.]

> "It calls Claude twice in parallel. One arm gets a system prompt grounded in your past thoughts from this same cycle phase, plus your current physiological context — heart rate variability and sleep paired from real participant data in the mcPHASES dataset. The other arm is context-blind. You don't know which is which. The mapping lives server-side."

[Click 'reveal which is which'. Panel A flips to "grounded", B to "baseline".]

> "After you score them, you can reveal."

---

## Why it might actually work (1:30 - 2:00) — ~85 words

[Screen: cursor expands the context panel showing 3 retrieved past thoughts and the novelty score.]

> "When the user's thought closely matches past entries, the grounded prompt is instructed to name the pattern explicitly — quote: 'you've had this thought before, here's what happened.' That's a non-sycophantic intervention grounded in the user's own data. It's the architectural anti-sycophancy lever the rest of the chatbot category is missing."

[Screen: open `/docs/eval-rubric.md` briefly.]

> "There's a pre-registered rubric — eight binary sycophancy items, six graded calibration items — committed before any responses were generated."

---

## Where this is and isn't honest (2:00 - 2:35) — ~95 words

[Screen: open `/docs/market-analysis.md`, scroll briefly.]

> "The original product vision overclaimed in a few places. The autonomic literature doesn't support framing ADHD as chronic sympathetic activation. Apple Watch HRV isn't validated for real-time emotional state detection. So Koor uses HRV as multi-day context, not as a live trigger. And the prompt is deliberately designed not to tell the user which thoughts to discount — only to surface the pattern. A woman in a genuinely bad situation should not be told her thought has reduced credibility because her HRV is low."

---

## What's next (2:35 - 2:55) — ~50 words

> "Twelve pre-registered scenarios are scored against the rubric. The interesting result is whether grounding actually reduces sycophancy in the within-subject comparison — and where it fails, because the mismatch and high-novelty scenarios are designed to find those failures. A v2 would need IRB and real longitudinal participant data."

---

## Tag (2:55 - 3:00) — ~10 words

[Screen: koor landing page footer — "reflection support, not therapy ♡"]

> "Koor. CS 153, Stanford. Reflection support, not therapy."

---

## Recording notes

- Total word count: ~490 — speak at slightly faster than reading pace to land under 3:00.
- For the live demo cut, pre-warm the API once before recording so the first response feels fast.
- Show the meta strip (backend, novelty, retrieved count) — proves it's a real call, not a mockup.
- Reveal button click is the visual punch — time the cut so the color shift is visible.
- Optional B-roll: scroll through `data/thoughts.json` for half a second to show the corpus is real.
- Do not show API keys on screen. The `KeyBanner` component already hides them server-side, but verify before recording.
- Caption the screen recording with the URL: github.com/mykirm/koor

## Q1-Q4 mapping (CS 153 video requirements)

- **Q1 (motivation):** cold open + "the problem" section. Bottleneck = LLM sycophancy in vulnerable populations + commercial gap.
- **Q2 (how it works):** "what koor does" + "why it might actually work". Architecture: dual Claude call, server-side A/B mapping, retrieval-grounded prompt with novelty branching.
- **Q3 (use cases + impact):** Implicit in "the problem" + "where this is and isn't honest". Within-subject mechanism probe → v2 with IRB → eventually a non-sycophantic, cycle-aware reflection tool for a population where current AI products are at best generic and at worst harmful.
- **Q4 (what's next):** "what's next" section. Real participant data, full IRB study, crisis-detection layer.
