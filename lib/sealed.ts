import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * Stateless sealed tokens for /api/reveal.
 *
 * On Vercel, runs.jsonl lives in /tmp, which is per-instance: the reflect call
 * can land on one serverless instance and the reveal call on another, where the
 * log file doesn't exist. So the panel->arm mapping is encrypted INTO the
 * reveal token itself (AES-256-GCM). The client still can't read it — only the
 * server holds the key — so blinding is preserved, and reveal needs no shared
 * storage. The pipeline trace is too large to seal; it stays in the log and is
 * returned best-effort.
 *
 * Key: REVEAL_SECRET if set, else derived from ANTHROPIC_API_KEY, else a dev
 * fallback (fine locally; set REVEAL_SECRET in production if you rotate keys).
 */

function key(): Buffer {
  const secret = process.env.REVEAL_SECRET || process.env.ANTHROPIC_API_KEY || 'koor-dev-secret';
  return createHash('sha256').update(secret).digest();
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64url');
}

export function open<T>(token: string): T | null {
  try {
    const raw = Buffer.from(token, 'base64url');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ct = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(pt.toString('utf8')) as T;
  } catch {
    return null;
  }
}
