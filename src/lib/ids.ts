/** Anchor for an ID: the lower-cased ID ("DQ-9" -> "dq-9"). */
export const anchorFor = (id: string): string => id.toLowerCase();

const FAMILY_ORDER = ['Q', 'DQ', 'U', 'D', 'CT', 'C'];

function parse(id: string) {
  const m = id.match(/^(DQ|CT|Q|U|D|C)-?(\d+)([a-z]*)$/);
  if (!m) throw new Error(`not a known ID: ${id}`);
  return { family: m[1], num: Number(m[2]), suffix: m[3] };
}

/** Q before DQ before U before D before CT before C; numeric within a family; Q6 < Q6b < Q7. */
export function compareIds(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  return FAMILY_ORDER.indexOf(pa.family) - FAMILY_ORDER.indexOf(pb.family) || pa.num - pb.num || pa.suffix.localeCompare(pb.suffix);
}
