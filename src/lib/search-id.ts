/** Exact ID match, ignoring case and surrounding whitespace; Pagefind tokenises "DQ-9" into noise. */
export function matchId(query: string, ids: Iterable<string>): string | null {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return null;
  for (const id of ids) if (id.toLowerCase() === wanted) return id;
  return null;
}

export interface SubResult {
  url: string;
  title: string;
  excerpt: string;
  locations?: number[];
}

/** The section of a page with the most matches; ties keep page order. */
export function bestSubResult(subs: SubResult[]): SubResult | undefined {
  let best: SubResult | undefined;
  for (const sub of subs) if (!best || (sub.locations?.length ?? 0) > (best.locations?.length ?? 0)) best = sub;
  return best;
}
