// Client-facing wording check over the built site (run after `pnpm build`): no language that
// reads as correcting earlier work, and no references to material that is no longer on the site.
import fs from 'node:fs';
import path from 'node:path';
import { fromHtml } from 'hast-util-from-html';

const TERMS = [
  { pattern: /\breject(ed|s|ion)?\b/i, why: 'terminology rule: say "not taken", "unified", "kept distinct" or "structural"' },
  { pattern: /\breclassif(y|ied|ication)\b/i, why: 'terminology rule' },
  { pattern: /\bbacklog\b/i, why: 'the backlog is not on the site' },
  { pattern: /\buser stor(y|ies)\b/i, why: 'the user stories are not on the site' },
  { pattern: /\bpilot scoping document\b/i, why: 'the scoping document is not on the site' },
  // Content types and fields that are not in the model (proofPoint / proofPointVariant / channelProfile,
  // in the proofPoints space).
  { pattern: /\b(opportunityType|channelRendering|messageVariant|parameterSchema|nbaSignalSource)\b/, why: 'retired content type or field: the model is proofPoint / proofPointVariant / channelProfile' },
  { pattern: /\bregister (belongs|is fixed|carries|≠)|\bsurface voice\b/i, why: 'register is unified into tone; the channel profile only constrains shape and audience' },
  { pattern: /\b(brand refresh|rebrand(ed)?|new brand)\b/i, why: 'the concept is "non-parity enhancements": what partner web gains beyond parity with today\'s site' },
];
// Approval-workflow vocabulary (an author or a validator rejecting a draft) is not a verdict
// on earlier work, so these exact phrases are allowed.
const ALLOWED = [
  'accepts, edits or rejects',
  'accept, edit or reject',
  'Generated copy is rejected automatically',
  'the placeholder check rejects any output',
  'including one rejection at each gate',
  'a rejection returns the item to draft',
];
const SKIP = new Set(['script', 'style', 'head']);

function* pages(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== 'pagefind' && entry.name !== '_astro') yield* pages(full); }
    else if (entry.name.endsWith('.html')) yield full;
  }
}
function visibleText(node, out = []) {
  if (node.type === 'text') out.push(node.value);
  else if (node.type !== 'element' || !SKIP.has(node.tagName)) (node.children ?? []).forEach((c) => visibleText(c, out));
  return out;
}

let hits = 0;
for (const file of pages('dist')) {
  const text = visibleText(fromHtml(fs.readFileSync(file, 'utf8'))).join(' ').replace(/\s+/g, ' ');
  for (const { pattern, why } of TERMS) {
    for (const m of text.matchAll(new RegExp(pattern.source, 'gi'))) {
      const around = text.slice(Math.max(0, m.index - 60), m.index + 60);
      if (ALLOWED.some((phrase) => around.includes(phrase))) continue;
      hits += 1;
      console.error(`✗ ${path.relative('dist', file)}: "…${text.slice(Math.max(0, m.index - 50), m.index + 60)}…" (${why})`);
    }
  }
}
console.log(`terms: ${hits} problem(s)`);
process.exit(hits > 0 ? 1 : 0);
