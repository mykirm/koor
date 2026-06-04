# Koor — UX / Visual Design Note

**Date:** 2026-06-02 · **Scope:** presentation layer only (no behavioral/API change) · **Target:** WCAG 2.1 AA

This is a lean design-rationale and AI-disclosure artifact for the visual overhaul of the live web prototype. It documents *why* the interface looks the way it does and records the AI-assisted process. Functional requirements live in [`prd-koor-2026-05-17.md`](./prd-koor-2026-05-17.md); the mechanism in [`tech-spec-koor-2026-05-17.md`](./tech-spec-koor-2026-05-17.md) and [`architecture-koor-2026-05-17.md`](./architecture-koor-2026-05-17.md).

---

## 1. Design rationale

**Direction: "soft-luxe editorial with a celestial cycle motif" — bold polish, signature pink kept.**

The prototype's primary audience is a reviewer watching a <3-minute screen-recorded demo (see [`video-script.md`](./video-script.md)). The design therefore optimizes for *legibility and impact on camera* while staying recognizably Koor. Decisions:

- **Cycle ↔ lunar motif as the through-line.** The menstrual cycle maps naturally onto a lunar cycle. This becomes the one memorable visual idea, carried through three places: the Fraunces wordmark dot (a "moon"), the **phase selector rendered as a cycle track with moon-phase nodes** (new → half → full → waning), and a faint concentric **orbit** in the backdrop. It makes the core concept ("where are you in your cycle?") legible *visually*, not just as a label.
- **Reveal as the centerpiece.** The grounded-vs-baseline reveal is the demo's "visual punch." On reveal the grounded card lifts with a warm pink halo and an italic-Fraunces **"grounded" / "baseline" badge** stamps in — so the distinction reads in a single video frame, not just as a border-color change.
- **Atmosphere over flat white.** Layered pink gradient blooms + a slow-rotating orbit + a subtle grain overlay give depth and a designed feel, while content sits on translucent blurred cards so text contrast holds.
- **Receipts.** The novelty score becomes a small **radial gauge**, retrieved entries become **evidence cards** with a "resolved" chip, and the backend/novelty/retrieved meta strip is a tasteful badge row — reinforcing that responses come from a real call, not a mockup.

---

## 2. Visual system (design tokens)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--koor-pink` | `#ff3d8a` | display type, decorative borders, slider, focus rings, glows | 3.3:1 (large/UI only) |
| `--koor-pink-deep` | `#c2185b` | **all body-size pink text**, white-on-pink fills (selected pill, button hover) | **5.87:1 on white ✓ AA** |
| `--koor-pink-soft` | `#ffd6e8` | tracks, borders, evidence cards |  |
| `--koor-pink-mist` | `#fff0f6` | tinted fills, grounded panel bg |  |
| `--koor-blush` | `#ffe6f1` | atmosphere blooms, shimmer |  |
| `--koor-ink` | `#14080e` | primary text (near-black, warm) | >12:1 on white |

- **Type:** Fraunces (variable; `SOFT`/`WONK`/`opsz` axes pushed on the wordmark) for display; DM Sans for body; system mono for receipts.
- **Motion:** one orchestrated entrance (staggered `koor-rise`), a glow/badge reveal, a shimmer skeleton, and a 120s ambient orbit — all disabled under `prefers-reduced-motion`.
- **Contrast rule:** signature `#ff3d8a` is used only where ≥3:1 suffices (large display text, UI-component borders/fills, focus rings); anything at body text size uses `#c2185b`.

---

## 3. Key states (single-page flow)

- **Empty form** — header, glassy form card: thought textarea, cycle-phase track, sleep/energy sliders, disabled "reflect →".
- **Loading** — twin pink shimmer skeleton panels, `aria-busy`.
- **Results (opaque)** — `<h2>` "two responses · same thought", panels labeled *response A/B*, reveal button, meta badge row.
- **Revealed** — grounded panel glows + badges stamp in; live region announces which is which; context `<details>` opens with the novelty gauge, current-input stats, and evidence cards (or the "fresh situation" empty state when nothing was retrieved).
- **Error** — `role="alert"` card with status + message; one failed arm renders inline ("arm failed: …") while the other still shows (`Promise.allSettled`).

---

## 4. Accessibility (WCAG 2.1 AA)

- Landmarks: `<main id="main">`, `<header>`, `<footer>`; visible-on-focus **skip link**; `lang="en"`.
- Controls: textarea label via `htmlFor`; phase selector is a labeled `role="group"` with `aria-pressed` pills (≥44px targets); sliders carry `aria-label` + `aria-valuetext` ("6 hrs"); all interactives have visible `:focus-visible` rings.
- Live regions: errors are `role="alert"`; the reveal outcome is announced via an `sr-only` `aria-live` region. Grounded/baseline is conveyed by **text badge**, never color alone.
- Motion: full `prefers-reduced-motion` honoring.
- Contrast: text meets ≥4.5:1 via `--koor-pink-deep` (verified 5.87:1).

---

## 5. AI-usage disclosure

The visual redesign in this iteration (CSS design system, motion, the cycle-track / novelty-gauge / reveal components, and this note) was produced with **Claude (Anthropic), via Claude Code and its `frontend-design` skill**, directed and reviewed by the author. No application logic, retrieval, prompts, A/B mapping, or evaluation code was changed — those remain as pre-registered. Per the CS 153 AI policy, this is also summarized in the project `README`.
