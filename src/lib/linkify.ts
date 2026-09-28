export type Segment = string | { id: string };

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Only registered IDs match. Longest first, so DQ-10 wins over DQ-1; the boundaries
 * exclude letters, digits, "_" and "-", so Q12 or XQ1 never match Q1.
 */
export function createLinkifier(ids: Iterable<string>): (text: string) => Segment[] {
  const alternatives = [...ids].sort((a, b) => b.length - a.length).map(escapeRegExp);
  if (alternatives.length === 0) return (text) => [text];
  const pattern = new RegExp(`(?<![\\w-])(${alternatives.join('|')})(?![\\w-])`, 'g');
  return (text) => {
    const out: Segment[] = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > last) out.push(text.slice(last, index));
      out.push({ id: match[1] });
      last = index + match[1].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out.length > 0 ? out : [text];
  };
}
