import { buildAgenda } from './agenda';
import type { Question, SiteData } from './types';

export const FACT_KEYS = [
  'egQuestions', 'designQuestions', 'uc2Questions', 'questionsTotal',
  'questionsOpen', 'questionsAssumed', 'questionsAnswered', 'questionsClosed',
  'agendaToConfirm', 'agendaToDecide', 'decisions',
  'contentTypes', 'authorableBlocks', 'properties', 'keptDistinct', 'inventoryComponents',
] as const;
export type FactKey = (typeof FACT_KEYS)[number];
export type Facts = Record<FactKey, number>;

/** Layers an author places on a page; Structural, Chrome and Utility are not blocks. */
const BLOCK_LAYERS = new Set(['Content', 'Collection', 'Integration']);

export function computeFacts(data: SiteData): Facts {
  const qs = data.questions;
  const count = (keep: (q: Question) => boolean) => qs.filter(keep).length;
  const agenda = buildAgenda(qs);
  return {
    egQuestions: count((q) => /^Q/.test(q.id)),
    designQuestions: count((q) => q.id.startsWith('DQ-')),
    uc2Questions: count((q) => q.id.startsWith('U')),
    questionsTotal: qs.length,
    questionsOpen: count((q) => q.status === 'open'),
    questionsAssumed: count((q) => q.status === 'assumed'),
    questionsAnswered: count((q) => q.status === 'answered'),
    questionsClosed: count((q) => q.status === 'closed'),
    agendaToConfirm: agenda.reduce((n, g) => n + g.toConfirm.length, 0),
    agendaToDecide: agenda.reduce((n, g) => n + g.toDecide.length, 0),
    decisions: data.decisions.length,
    contentTypes: data.contentTypes.length,
    authorableBlocks: data.contentTypes.filter((c) => BLOCK_LAYERS.has(c.layer)).length,
    properties: data.contentTypes.reduce((n, c) => n + c.propertyCount, 0),
    keptDistinct: data.consolidation.filter((c) => c.decision === 'Kept distinct').length,
    inventoryComponents: data.inventory.length,
  };
}

/** Replaces {{key}} tokens in frontmatter strings and section titles, where components can't go. */
export function interpolateFacts(text: string, facts: Facts): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in facts)) throw new Error(`unknown fact "${key}" in "${text}"`);
    return String(facts[key as FactKey]);
  });
}
