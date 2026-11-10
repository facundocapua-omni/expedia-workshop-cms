import type { Question, SessionMeta, SiteData, TopicMeta } from '../src/lib/types';

export function question(overrides: Partial<Question> & Pick<Question, 'id'>): Question {
  return { group: 'scope', question: `Question ${overrides.id}?`, status: 'open', confirmedByEG: false, ...overrides };
}

export function topic(overrides: Partial<TopicMeta> & Pick<TopicMeta, 'id'>): TopicMeta {
  return { agenda: `Topic ${overrides.id}`, nav: `Topic ${overrides.id}`, settles: [], prompt: false, hidden: false, ...overrides };
}

export function session(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    slug: 'proof-point-delivery', title: 'Proof point delivery', short: 'Delivery',
    order: 1,
    topics: [
      topic({ id: 'ownership', nav: 'Ownership', settles: ['DQ-9'] }),
      topic({ id: 'reference-implementations', prompt: true }),
    ],
    ...overrides,
  };
}

export function siteData(overrides: Partial<SiteData> = {}): SiteData {
  return {
    ideas: [{ slug: 'uc1-solution-architecture', title: 'Use Case 1', short: 'UC1', order: 1 }],
    questions: [question({ id: 'Q1', group: 'blocking' }), question({ id: 'DQ-9', group: 'uc1-design' }), question({ id: 'U1', group: 'uc2-model' })],
    decisions: [{ id: 'D-05', title: 'Tone belongs to the partner', useCase: 'uc1', resolves: [] }],
    contentTypes: [{
      id: 'CT01', name: 'section', layer: 'Structural', purpose: 'Container', summary: 'Container',
      complexity: 'M', reuse: 34, propertyCount: 11, consolidates: ['C019 Background Section'],
    }],
    consolidation: [{ candidates: 'A, B', decision: 'Kept distinct', test: 't', result: 'r' }],
    inventory: [{
      id: 'C019', name: 'Background Section', type: 'Component', variationOf: null,
      matrixStatus: 'Existing', reference: 'ID 85', screens: ['P01'], contentTypes: ['CT01'],
    }],
    sessions: [session()],
    materials: ['proof-point-delivery/ownership'],
    ...overrides,
  };
}
