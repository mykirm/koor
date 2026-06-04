/**
 * Deterministic blind ordering for the rater scoring page.
 *
 * The /score page must show the arms in a randomized order with no labels, but
 * we don't want to store a per-rater mapping. Instead both /api/eval-set and
 * /api/score derive the SAME panel->arm permutation from the scenario id, so
 * the client only ever sees opaque panels (A/B/C) and the server can always
 * recover which arm a panel was when a score comes back.
 */

export const PANEL_IDS = ['A', 'B', 'C', 'D'];

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Returns a permutation `perm` where panel position k shows canonical arm index perm[k]. */
export function blindOrder(seed: string, n: number): number[] {
  let a = hashSeed(seed);
  const rng = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}
