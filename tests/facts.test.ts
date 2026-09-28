import { describe, expect, it } from 'vitest';
import { computeFacts, interpolateFacts } from '../src/lib/facts';
import { question, siteData } from './fixtures';

describe('computeFacts', () => {
  const facts = computeFacts(siteData({
    questions: [
      question({ id: 'Q1', status: 'answered', answer: 'x' }), question({ id: 'Q6b' }),
      question({ id: 'DQ-4', group: 'uc1-design', status: 'assumed', position: 'yes' }),
      question({ id: 'U3', group: 'uc2-model', status: 'closed' }),
    ],
  }));
  it('counts questions by family and status', () => {
    expect(facts).toMatchObject({ egQuestions: 2, designQuestions: 1, uc2Questions: 1, questionsTotal: 4, questionsOpen: 1, questionsAssumed: 1, questionsAnswered: 1, questionsClosed: 1 });
  });
  it('counts the agenda', () => {
    expect(facts).toMatchObject({ agendaToConfirm: 2, agendaToDecide: 1 });
  });
  it('counts the content model', () => {
    expect(facts).toMatchObject({ contentTypes: 1, authorableBlocks: 0, properties: 11, keptDistinct: 1, inventoryComponents: 1, decisions: 1 });
  });
});

describe('interpolateFacts', () => {
  const facts = computeFacts(siteData());
  it('replaces {{key}} tokens', () => {
    expect(interpolateFacts('The {{contentTypes}} content types', facts)).toBe('The 1 content types');
  });
  it('leaves text without tokens alone', () => {
    expect(interpolateFacts('No numbers here', facts)).toBe('No numbers here');
  });
  it('fails on an unknown key', () => {
    expect(() => interpolateFacts('{{contentTypez}}', facts)).toThrow('unknown fact "contentTypez"');
  });
});
