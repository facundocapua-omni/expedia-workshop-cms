/** Exact ID match, ignoring case and surrounding whitespace; Pagefind tokenises "DQ-9" into noise. */
export function matchId(query: string, ids: Iterable<string>): string | null {
  const wanted = query.trim().toLowerCase();
  if (!wanted) return null;
  for (const id of ids) if (id.toLowerCase() === wanted) return id;
  return null;
}
