import { OPENAI_EMBED_MODEL } from '../constants';

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function openaiEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: texts, model: OPENAI_EMBED_MODEL }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embed failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}
