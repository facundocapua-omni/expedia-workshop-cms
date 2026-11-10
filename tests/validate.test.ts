import { describe, expect, it } from 'vitest';
import { assertValid, findProblems } from '../src/lib/validate';
import { question, session, siteData, topic } from './fixtures';

describe('findProblems', () => {
  it('finds nothing wrong with consistent data', () => {
    expect(findProblems(siteData())).toEqual([]);
  });
  it('reports the same decision ID in two files', () => {
    const data = siteData({ decisions: [
      { id: 'D-26', title: 'A', useCase: 'uc1', resolves: [] },
      { id: 'D-26', title: 'B', useCase: 'uc1', resolves: [] },
    ] });
    expect(findProblems(data)).toContain('duplicate ID D-26 (decisions and decisions)');
  });
  it('reports a question pointing at an idea that does not exist', () => {
    const data = siteData({ questions: [question({ id: 'Q7', idea: 'uc9-nothing' })] });
    expect(findProblems(data)).toContain('Q7: unknown idea "uc9-nothing"');
  });
  it('reports a section without an idea', () => {
    const data = siteData({ questions: [question({ id: 'Q7', section: 'open' })] });
    expect(findProblems(data)).toContain('Q7: section "open" without an idea');
  });
  it('reports a decision resolving an unknown question', () => {
    const data = siteData({ decisions: [{ id: 'D-26', title: 'A', useCase: 'uc1', resolves: ['Q27'] }] });
    expect(findProblems(data)).toContain('D-26: resolves unknown question Q27');
  });
});

describe('findProblems: every source loaded something', () => {
  it('reports when data/questions.yaml produced no questions', () => {
    const data = siteData({ questions: [question({ id: 'U1', group: 'uc2-model' })] });
    expect(findProblems(data)).toContain('no Q or DQ questions loaded from data/questions.yaml');
  });
  it('reports when the matrix produced no UC2 questions', () => {
    const data = siteData({ questions: [question({ id: 'Q1', group: 'blocking' })] });
    expect(findProblems(data)).toContain('no UC2 questions loaded from model/uc2-matrix.json');
  });
  it('reports every other empty source', () => {
    const problems = findProblems(siteData({ decisions: [], contentTypes: [], inventory: [], ideas: [], sessions: [] }));
    expect(problems).toEqual(expect.arrayContaining([
      'no decisions loaded from decisions/',
      'no content types loaded from model/uc2-matrix.json',
      'no components loaded from sources/component-inventory.md',
      'no ideas loaded from src/content/ideas/',
      'no sessions loaded from src/content/sessions/',
    ]));
  });
});

describe('assertValid', () => {
  it('throws one error listing every problem', () => {
    const data = siteData({ decisions: [{ id: 'D-26', title: 'A', useCase: 'uc1', resolves: ['Q27', 'Q28'] }] });
    expect(() => assertValid(data)).toThrow(/Q27[\s\S]*Q28/);
  });
});

describe('findProblems: sessions', () => {
  const withTopics = (topics: ReturnType<typeof topic>[], materials: string[]) =>
    siteData({ sessions: [session({ topics })], materials });

  it('reports a topic settling an unknown question', () => {
    const data = withTopics([topic({ id: 'ownership', settles: ['Q99'] })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery/ownership: settles unknown question Q99');
  });
  it('reports a question settled in two topics', () => {
    const data = withTopics(
      [topic({ id: 'ownership', settles: ['DQ-9'] }), topic({ id: 'performance', settles: ['DQ-9'] })],
      ['proof-point-delivery/ownership', 'proof-point-delivery/performance'],
    );
    expect(findProblems(data)).toContain('DQ-9: settled in both proof-point-delivery/ownership and proof-point-delivery/performance');
  });
  it('reports a settled question that still points at an idea', () => {
    const data = siteData({ questions: [
      question({ id: 'Q1', group: 'blocking' }), question({ id: 'U1', group: 'uc2-model' }),
      question({ id: 'DQ-9', group: 'uc1-design', idea: 'uc1-solution-architecture', section: 'open' }),
    ] });
    expect(findProblems(data)).toContain('DQ-9: settled in proof-point-delivery/ownership, so it must not also set idea/section');
  });
  it('reports a topic with no material file', () => {
    expect(findProblems(siteData({ materials: [] }))).toContain(
      'proof-point-delivery/ownership: no material — add src/content/topics/proof-point-delivery/ownership.mdx or mark the topic prompt: true',
    );
  });
  it('reports a material file behind a discussion prompt', () => {
    const data = siteData({ materials: ['proof-point-delivery/ownership', 'proof-point-delivery/reference-implementations'] });
    expect(findProblems(data)).toContain(
      'proof-point-delivery/reference-implementations: a discussion prompt has no material, but src/content/topics/proof-point-delivery/reference-implementations.mdx exists',
    );
  });
  it('reports a hidden topic that settles a question', () => {
    const data = withTopics([topic({ id: 'ownership', settles: ['DQ-9'], hidden: true })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery/ownership: a hidden topic is not on the page, so it cannot settle DQ-9');
  });
  it('reports a material file no session declares', () => {
    const data = siteData({ materials: ['proof-point-delivery/ownership', 'proof-point-delivery/fallback'] });
    expect(findProblems(data)).toContain('src/content/topics/proof-point-delivery/fallback.mdx: no session declares topic proof-point-delivery/fallback');
  });
  it('reports a repeated topic id', () => {
    const data = withTopics([topic({ id: 'ownership' }), topic({ id: 'ownership' })], ['proof-point-delivery/ownership']);
    expect(findProblems(data)).toContain('proof-point-delivery: duplicate topic ownership');
  });
  it('reports two sessions sharing an order or a short label', () => {
    const second = session({ slug: 'nba-hand-off', topics: [topic({ id: 'payload', prompt: true })] });
    const problems = findProblems(siteData({ sessions: [session(), second] }));
    expect(problems).toContain('sessions proof-point-delivery and nba-hand-off share order 1');
    expect(problems).toContain('sessions proof-point-delivery and nba-hand-off share the short label "Delivery"');
  });
});
