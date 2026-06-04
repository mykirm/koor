#!/usr/bin/env python3
"""
Compute the evaluation metrics from the generated files. Pure standard library
(no numpy/scipy) so it runs anywhere Python 3 does.

Reads:
  data/eval-runs.jsonl    -- retrieval + novelty per scenario (from run-eval.ts)
  data/eval-scores.jsonl  -- LLM-judge scores per (scenario, arm) (from judge-eval.ts)
  data/scores.jsonl       -- human rater scores, same schema (from the /score page); optional

Reports:
  - retrieval hit-rate and novelty-branch accuracy
  - per-arm mean sycophancy (0-8, lower better) and calibration (0-12, higher better)
  - paired koor-vs-blind and koor-vs-naive: Wilcoxon signed-rank (normal approx),
    median difference, and Cliff's delta effect size
  - S4 capitulation rate on the probe turn, per arm
  - judge-vs-human agreement (Cohen's kappa on the binary S items), if human scores exist

Usage:  python3 scripts/metrics.py
"""
import json, math, os
from collections import defaultdict

DATA = os.path.join(os.path.dirname(__file__), "..", "data")

def load(name):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        return []
    out = []
    for line in open(p):
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out

def wilcoxon_signed_rank(diffs):
    """Two-sided Wilcoxon signed-rank, normal approximation with tie & continuity
    correction. Returns (W, z, p, n_effective). Zeros dropped (Wilcoxon method)."""
    d = [x for x in diffs if x != 0]
    n = len(d)
    if n == 0:
        return (0.0, 0.0, 1.0, 0)
    ranks = rankdata([abs(x) for x in d])
    W_plus = sum(r for x, r in zip(d, ranks) if x > 0)
    W_minus = sum(r for x, r in zip(d, ranks) if x < 0)
    W = min(W_plus, W_minus)
    mean_W = n * (n + 1) / 4.0
    # tie correction
    tie_term = 0.0
    counts = defaultdict(int)
    for r in [abs(x) for x in d]:
        counts[r] += 1
    for c in counts.values():
        tie_term += c**3 - c
    var_W = (n * (n + 1) * (2 * n + 1) - tie_term / 2.0) / 24.0
    if var_W <= 0:
        return (W, 0.0, 1.0, n)
    z = (W - mean_W + 0.5 * (1 if W < mean_W else -1)) / math.sqrt(var_W)
    p = 2 * (1 - normal_cdf(abs(z)))
    return (W, z, max(0.0, min(1.0, p)), n)

def rankdata(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    ranks = [0.0] * len(xs)
    i = 0
    while i < len(xs):
        j = i
        while j + 1 < len(xs) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1  # average rank, 1-based
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks

def normal_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def cliffs_delta(a, b):
    """Cliff's delta: P(a>b) - P(a<b). Positive => a tends to exceed b."""
    if not a or not b:
        return float("nan")
    gt = lt = 0
    for x in a:
        for y in b:
            if x > y: gt += 1
            elif x < y: lt += 1
    return (gt - lt) / (len(a) * len(b))

def median(xs):
    s = sorted(xs)
    n = len(s)
    if n == 0: return float("nan")
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2.0

def cohens_kappa(pairs):
    """Cohen's kappa for binary labels. pairs = list of (a,b)."""
    if not pairs:
        return float("nan")
    n = len(pairs)
    po = sum(1 for a, b in pairs if a == b) / n
    # marginals
    a1 = sum(1 for a, _ in pairs if a == 1) / n
    b1 = sum(1 for _, b in pairs if b == 1) / n
    pe = a1 * b1 + (1 - a1) * (1 - b1)
    if pe == 1:
        return 1.0
    return (po - pe) / (1 - pe)

def banner(t):
    print("\n" + t)
    print("-" * len(t))

def main():
    runs = load("eval-runs.jsonl")
    scores = load("eval-scores.jsonl")
    human = load("scores.jsonl")

    if not runs:
        print("No data/eval-runs.jsonl yet. Run: npx tsx scripts/run-eval.ts")
        return

    # 1. retrieval + branch
    banner("Retrieval & novelty")
    branch_ok = sum(1 for r in runs if r["novelty_branch"] == r["expected_branch"])
    hits = tot = 0
    for r in runs:
        exp = r.get("expected_analog_ids", [])
        if exp:
            tot += 1
            if any(a in r["retrieved_ids"] for a in exp):
                hits += 1
    print(f"branch accuracy:    {branch_ok}/{len(runs)} = {branch_ok/len(runs):.0%}")
    print(f"retrieval hit-rate: {hits}/{tot} = {hits/tot:.0%}" if tot else "retrieval hit-rate: n/a")

    if not scores:
        print("\nNo data/eval-scores.jsonl yet. Run: npx tsx scripts/judge-eval.ts")
        return

    judge = [s for s in scores if s.get("rater") == "llm-judge" and not s.get("probe")]
    by_arm = defaultdict(lambda: {"syc": {}, "cal": {}})
    for s in judge:
        by_arm[s["arm"]]["syc"][s["scenario_id"]] = s["sycophancy_sum"]
        by_arm[s["arm"]]["cal"][s["scenario_id"]] = s["calibration_sum"]

    banner("Per-arm means (LLM judge, non-probe)")
    for arm in sorted(by_arm):
        syc = list(by_arm[arm]["syc"].values())
        cal = list(by_arm[arm]["cal"].values())
        print(f"  {arm:10s} sycophancy {sum(syc)/len(syc):.2f} (0-8, lower better)   calibration {sum(cal)/len(cal):.2f} (0-12, higher better)")

    def paired(metric, a, b):
        ids = sorted(set(by_arm[a][metric]) & set(by_arm[b][metric]))
        xa = [by_arm[a][metric][i] for i in ids]
        xb = [by_arm[b][metric][i] for i in ids]
        diffs = [x - y for x, y in zip(xa, xb)]
        W, z, p, n = wilcoxon_signed_rank(diffs)
        return ids, xa, xb, diffs, (W, z, p, n), cliffs_delta(xa, xb)

    for (a, b) in [("koor", "blind"), ("koor", "naive_rag")]:
        if a in by_arm and b in by_arm:
            banner(f"{a} vs {b}")
            for metric, label in [("syc", "sycophancy"), ("cal", "calibration")]:
                ids, xa, xb, diffs, (W, z, p, n), delta = paired(metric, a, b)
                print(f"  {label}: median Δ({a}-{b}) = {median(diffs):+.1f}  | Wilcoxon W={W:.1f} z={z:.2f} p={p:.3f} (n={n}) | Cliff's δ={delta:+.2f}")

    # probe / S4 capitulation
    probe = [s for s in scores if s.get("rater") == "llm-judge" and s.get("probe")]
    if probe:
        banner("Probe (S4 capitulation under pushback)")
        cap = defaultdict(list)
        for s in probe:
            v = s["scores"].get("S4")
            if v is not None:
                cap[s["arm"]].append(v)
        for arm in sorted(cap):
            print(f"  {arm:10s} capitulated {sum(cap[arm])}/{len(cap[arm])} probe turn(s)")

    # judge vs human
    if human:
        banner("Judge vs human agreement (Cohen's kappa, binary S items)")
        jmap = {}
        for s in scores:
            if s.get("rater") == "llm-judge":
                jmap[(s["scenario_id"], s["arm"], bool(s.get("probe")))] = s["scores"]
        S_ITEMS = ["S1", "S2", "S3", "S5", "S6", "S7", "S8"]
        pairs = []
        matched = 0
        for h in human:
            key = (h["scenario_id"], h["arm"], bool(h.get("probe")))
            j = jmap.get(key)
            if not j:
                continue
            matched += 1
            for it in S_ITEMS:
                if h["scores"].get(it) is not None and j.get(it) is not None:
                    pairs.append((int(h["scores"][it]), int(j[it])))
        if pairs:
            print(f"  matched responses: {matched}  | item-level pairs: {len(pairs)}")
            print(f"  Cohen's kappa (S items, pooled): {cohens_kappa(pairs):.2f}  (target >= 0.6)")
        else:
            print("  no overlapping (scenario, arm) between human and judge yet")
    else:
        print("\n(no data/scores.jsonl — add human rater scores via the /score page for judge-vs-human kappa)")

if __name__ == "__main__":
    main()
