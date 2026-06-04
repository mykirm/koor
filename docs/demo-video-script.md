# Koor — demo video script (target 3–5 min)

Read-aloud script. `[NUMBER]` = fill from `npm run metrics` output. Scene directions in *italics*.
The four headers map to the four required video questions.

---

## Q1 · Why I built this (≈45 sec)

*On screen: the koor landing page.*

"There's a question that comes up constantly in communities like r/ADHDWomen and r/PMDD: 'is this a real thought, or is it hormones?' A thought shows up at 11pm — the project is failing, every choice was wrong — it feels completely true, and two days into the next phase it's gone. Women with ADHD live this at scale: about a third meet criteria for PMDD, against a ten percent base rate. And the answers they get fail in both directions — 'it's just hormones' dismisses thoughts that are sometimes right, and ignoring state entirely abandons them to the 2am certainty.

Now stack the second problem on top: the place people increasingly take these thoughts is a chatbot, and chatbots flatter. They validate the spiral back to you — that's the documented sycophancy problem, and it's most dangerous for exactly this group at exactly this moment.

Koor's bet sits at the intersection: your own track record. If a model can show you that you've had this exact thought three times this phase and it resolved in two days each time without you acting, it can't flatter you and tell you the truth at the same time — and you're not being dismissed, you're seeing your own evidence. I built Koor to test whether that actually works."

## Q2 · How it works (≈90 sec — the core)

*On screen: type a late-luteal thought, hit reflect, three panels appear.*

"Every thought gets answered three ways. One arm is context-blind — just the thought. One is a plain wrapper — it dumps your past entries into a single prompt. The third is the koor pipeline.

*Click reveal. The pipeline trace expands.*

The pipeline is four stages, and you can see them here. First it reads my past entries from this phase and counts the outcomes — [N] priors, acted on [N], resolved without acting [X]%. Then it decides: is this a real signal, or is it amplified by low sleep and late luteal — and is there a disconfirming pattern worth surfacing. Then it writes the response citing those actual numbers. Then a guardrail checks it isn't diagnosing me or forcing a pattern that isn't there.

That's the whole point: the wrapper arm and the pipeline arm get the *identical* retrieved context. So when they differ, it's the architecture doing the work, not just 'having context.' And the responses are blind and shuffled server-side — even with devtools open you can't tell which is which until you've scored.

One thing to be clear about: this comparison view is the experiment, not the product. Nobody journals in three panels. The product this points at is a journal that knows your cycle — you write, you get one grounded answer. I built the three-panel version to prove the grounded answer is actually better before that app deserves to exist."

## Q3 · Why it matters (≈45 sec)

*On screen: the /score page, then the metrics output.*

"I evaluated this against a rubric I committed *before* generating any output — eight sycophancy items, six calibration items, twelve scenarios. An LLM judge scored everything blind, and [N] human raters scored a subset so I could check the judge against people.

*Show metrics.*

Three results. First, grounding works: the context-blind arm scored 1.5 on sycophancy and 5.4 on calibration; both grounded arms scored near zero and near eleven — that's p = 0.002 with a near-maximal effect size, Cliff's δ of plus 0.88. Second — honestly — the pipeline did *not* beat the plain wrapper on rubric sums. Both hit the judge's ceiling. Third, and this is the interesting part: on the racing-heart scenario, the wrapper blamed estrogen — exactly the 'it's just hormones' failure this project exists to prevent — while the pipeline flagged it as a physical symptom worth ruling out. The automated judge scored the wrapper's answer as *fine*, which is a real LLM-judge blind spot, and exactly why I had human raters check it — their agreement with the judge came out at κ = [N]. And on the trick scenario, the pipeline's refusal to force a pattern is right there in its trace — relevance: none — where the wrapper's correct behavior is just prose you have to trust.

For who this is for: women with ADHD and PMDD — a group the research says is hit hardest by exactly this 'is it real or is it hormones' confusion — and who are badly served by chatbots that just agree with them."

## Q4 · What I'd add (≈30 sec)

"Three things. Real longitudinal data — a person's own journal paired to their own physiology under IRB, instead of my hand-written corpus. A bigger N — twelve scenarios shows direction, not significance. And real crisis detection, because the target users include people in genuine distress and a liability footer isn't enough.

But the core question — does grounding a model in your own history make it less of a yes-man — that's what this version answers, honestly, with the numbers on screen."

---

### Recording checklist
- [ ] App running (`npm run dev`), a good late-luteal example ready to type
- [ ] Eval already run so the trace + numbers are real
- [ ] One clean take of: reflect → reveal → trace → /score → metrics terminal
- [ ] Under 5 min. Numbers filled in. Repo link in the description.
