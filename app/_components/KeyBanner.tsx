// Server Component — runs at request time on Vercel, so the banner reflects
// the *current* env state without requiring a redeploy.
// Never expose actual key values; emit booleans only.

export default function KeyBanner() {
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasVoyage = !!process.env.VOYAGE_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasAnthropic && (hasVoyage || hasOpenAI)) return null;

  return (
    <div className="w-full bg-black text-white">
      <div className="mx-auto max-w-3xl px-4 py-2 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rounded-full bg-koor-pink px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider">
          demo
        </span>
        {!hasAnthropic && (
          <span className="text-white/80">no anthropic key — /api/reflect returns 503 until ANTHROPIC_API_KEY is set</span>
        )}
        {!hasVoyage && !hasOpenAI && hasAnthropic && (
          <span className="text-white/80">no embedding key — retrieval falls back to tf-idf</span>
        )}
      </div>
    </div>
  );
}
