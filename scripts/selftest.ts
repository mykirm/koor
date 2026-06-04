/**
 * Zero-dependency self-tests for the pure logic. No network, no framework.
 *   npx tsx scripts/selftest.ts   (or: npm test)
 *
 * Covers the deterministic pieces that the eval and the blind A/B integrity
 * depend on: novelty thresholds, the blind permutation, robust JSON parsing,
 * TF-IDF similarity, and the embedding cache's hit/miss behavior.
 */

import assert from 'node:assert';
import { promises as fs } from 'fs';
import path from 'path';
import { noveltyBranch } from '../lib/prompts';
import { blindOrder } from '../lib/blind';
import { parseJSON } from '../lib/llm';
import { TfIdf } from '../lib/embedders/tfidf';
import { cachedEmbed } from '../lib/embedders/cache';
import { seal, open } from '../lib/sealed';

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log('  ✓', name);
  } catch (e) {
    failed++;
    console.log('  ✗', name, '\n     ', (e as Error).message);
  }
}

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function main() {
  await test('noveltyBranch thresholds (>=0.7 high, <=0.3 low)', () => {
    assert.equal(noveltyBranch(0.8), 'high');
    assert.equal(noveltyBranch(0.7), 'high');
    assert.equal(noveltyBranch(0.5), 'mid');
    assert.equal(noveltyBranch(0.3), 'low');
    assert.equal(noveltyBranch(0.1), 'low');
  });

  await test('blindOrder is a deterministic permutation', () => {
    assert.deepEqual(blindOrder('L1', 3), blindOrder('L1', 3));
    assert.deepEqual([...blindOrder('L1', 3)].sort(), [0, 1, 2]);
    assert.deepEqual([...blindOrder('M2', 3)].sort(), [0, 1, 2]);
  });

  await test('blindOrder varies across scenarios', () => {
    const perms = ['L1', 'L2', 'M1', 'M2', 'H1', 'H2', 'P1', 'N1'].map((s) => blindOrder(s, 3).join(''));
    assert.ok(new Set(perms).size > 1, 'expected more than one distinct ordering');
  });

  await test('parseJSON tolerates fences, prose, and braces in strings', () => {
    assert.deepEqual(parseJSON('here ```json\n{"a":1}\n``` ok'), { a: 1 });
    assert.deepEqual(parseJSON('{"a":{"b":2}} trailing'), { a: { b: 2 } });
    assert.deepEqual(parseJSON('{"s":"has } a brace"}'), { s: 'has } a brace' });
    assert.equal(parseJSON('no json here'), null);
  });

  await test('TF-IDF: identical text ~1, unrelated text ~0', () => {
    const t = new TfIdf();
    t.fit(['the project deadline is looming', 'my friend seems distant lately', 'i love sunny mornings']);
    const v = t.vectors();
    const q = t.transform('the project deadline is looming');
    assert.ok(dot(q, v[0]) > 0.99, 'identical should be ~1');
    const q2 = t.transform('quantum thermodynamics lecture notes');
    assert.ok(Math.max(...v.map((x) => dot(q2, x))) < 0.2, 'unrelated should be near 0');
  });

  await test('embedding cache: misses call embedFn once, hits do not', async () => {
    let calls = 0;
    const embedFn = async (xs: string[]) => {
      calls += xs.length;
      return xs.map((_, i) => [i, i + 1, i + 2]);
    };
    const model = '__selftest__';
    const v1 = await cachedEmbed(['a', 'b'], model, embedFn);
    assert.equal(calls, 2, 'first call embeds both');
    await cachedEmbed(['a', 'b', 'c'], model, embedFn);
    assert.equal(calls, 3, 'only the new text is embedded');
    assert.equal(v1.length, 2);
    // cleanup the cache file this test wrote
    await fs.rm(path.join(process.cwd(), 'data', `embeddings.${model}.json`), { force: true });
  });

  await test('sealed reveal token round-trips and stays opaque', () => {
    const payload = { reveal: { A: 'koor', B: 'blind', C: 'naive_rag' }, novelty: 0.42 };
    const tok = seal(payload);
    assert.ok(!tok.includes('koor') && !tok.includes('blind'), 'token must not leak arm names');
    assert.deepEqual(open(tok), payload);
    assert.equal(open('garbage-token'), null);
    assert.equal(open(''), null);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
