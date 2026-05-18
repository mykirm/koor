# Data — mcPHASES disclosure

Physiological values (`hrv_ms`, `sleep_hours`) and cycle phase labels paired into `thoughts.json` are sourced from:

**Lin, B., Li, J. Y., Kalani, K., Truong, K., & Mariakakis, A. (2025).** *mcPHASES: A Dataset of Physiological, Hormonal, and Self-reported Events and Symptoms for Menstrual Health Tracking with Wearables* (v1.0.0). PhysioNet. https://physionet.org/content/mcphases/1.0.0/

**License:** Open Data Commons Attribution License v1.0 (ODC-BY). Free use including commercial use, with attribution required. License text: https://physionet.org/about/licenses/open-data-commons-attribution-license-v10/

**What is from mcPHASES:** Numeric tuples `(hrv_ms, sleep_hours, phase)` paired per-row into `thoughts.json`. Each row's source participant + study day is documented in `mcphases_provenance.md`.

**What is NOT from mcPHASES:** Thought narrative content. All `thought` and `resolved_outcome` fields in `thoughts.json` are researcher-authored (Myra Kirmani) based on personal introspection.

**Why this hybrid is appropriate:** mcPHASES *does* contain daily diary fields (mood, stress, cramps, sleep quality, menstrual flow) that could in principle be used as thought content. We deliberately chose not to: diary entries in mcPHASES are typically terse 1–2-word annotations not suited to a reflection-grounding corpus. Researcher-authored narrative provides the richness needed to demonstrate the grounding mechanism while the physiological values stay tied to real human data. README's "Data disclosure" section explains this in full.

**What real longitudinal data would change (v2):** With participant-authored journal entries paired to their own physiology (under IRB), the grounding would be authentically end-to-end. v2 needs HealthKit live integration + IRB.

**Companion documents:**
- mcPHASES v1.0.0 paper (Nature Sci Data): https://www.nature.com/articles/s41597-026-06805-3
- Phase classification methodology: https://www.medrxiv.org/content/10.64898/2026.03.31.26349766v2.full
