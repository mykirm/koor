# HRV donor analysis — why Koor grounds on phase + sleep, not HRV

The subject (self-tracked) has cycle phase and sleep but **no HRV device**. We
evaluated borrowing HRV from a matched mcPHASES donor before deciding to drop it.

## Method

Deterministic nearest-neighbor hot-deck donor selection (Andridge & Little 2010,
https://pmc.ncbi.nlm.nih.gov/articles/PMC3130338/; cf. Statistics Canada GEIS
standardized-rank NN). The subject is missing one field (HRV); we rank mcPHASES
participants by standardized-Euclidean distance on the **shared** observable —
mean sleep_hours per cycle phase — and take the nearest. Closest donor:
**participant 24** (see `scripts/match-participant.ts` for the full ranking).

## Sensitivity check (the reason we dropped HRV)

For each subject day, the RMSSD borrowed from the top-3 sleep-matched donors
(participants 24, 11, 46) diverges sharply across donors — for several days the
three candidate values span 40+ ms, i.e. the borrowed number is dominated by
**between-person trait variance**, not the subject's phase or sleep. A
donor-arbitrary number is not a defensible physiological input.

> The per-day donor RMSSD table is **not reproduced here**: those values are
> restricted mcPHASES data (PhysioNet Restricted Health Data DUA 1.5.0).
> Regenerate the full sensitivity table locally — under your own credential —
> with `npx tsx scripts/match-participant.ts` against `data/raw/mcphases/`.

## Decision

**HRV dropped.** Koor grounds on the subject's real **cycle phase** + real **sleep**
+ real **retrieved past thoughts**. Sleep as an affect prior is supported directly
(Yoo et al. 2007, sleep loss → amygdala reactivity); phase is user-reported, not
inferred from HRV. The matched-donor machinery (`scripts/match-participant.ts`)
remains in the repo as the reproducible audit trail for the decision; the donor
values themselves are regenerated locally, never committed.

## Corpus sleep provenance

- **Tier 1:** subject's own real sleep (the 13 self-tracked May 2026 nights).
- **Tier 2:** donor 24's real sleep for additional days in thin phases, paired
  with subject-authored reflections; disclosed as matched-donor, not the subject's.
