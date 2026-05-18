// Hand-rolled TF-IDF — used only when no embedding API key is present.
// Rationale (docs/tech-spec-koor-2026-05-17.md §3): 20-entry corpus, short
// reflection text — library polish would obscure auditability.
// Tokenization: lowercase + /\W+/ split. No stemming, no stopword removal —
// affect-laden first-person words (pronouns, "feeling", verb-tense variants)
// carry signal we want to preserve.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 0);
}

function termFreq(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

export class TfIdf {
  private vocab: Map<string, number> = new Map(); // term -> idx
  private idf: number[] = [];
  private docVectors: number[][] = [];

  fit(documents: string[]): void {
    const docTokenSets = documents.map((d) => new Set(tokenize(d)));
    const df = new Map<string, number>();
    for (const set of docTokenSets) {
      for (const term of set) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    let idx = 0;
    const N = documents.length;
    for (const [term, dfCount] of df) {
      this.vocab.set(term, idx++);
      this.idf.push(Math.log((N + 1) / (dfCount + 1)) + 1); // smooth IDF
    }
    this.docVectors = documents.map((d) => this.transform(d));
  }

  transform(text: string): number[] {
    const tokens = tokenize(text);
    const tf = termFreq(tokens);
    const vec = new Array(this.vocab.size).fill(0);
    for (const [term, count] of tf) {
      const idx = this.vocab.get(term);
      if (idx === undefined) continue;
      vec[idx] = count * this.idf[idx];
    }
    return l2normalize(vec);
  }

  vectors(): number[][] {
    return this.docVectors;
  }
}

function l2normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  if (sum === 0) return v;
  const norm = Math.sqrt(sum);
  return v.map((x) => x / norm);
}
