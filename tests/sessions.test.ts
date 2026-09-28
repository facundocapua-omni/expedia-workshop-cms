import { describe, expect, it } from 'vitest';
import { discussedIn, placementOf, stillOpen, topicHref } from '../src/lib/sessions';
import { question, session, siteData, topic } from './fixtures';

describe('placementOf', () => {
  const { sessions } = siteData();
  it('finds the topic that settles a question', () => {
    expect(placementOf('DQ-9', sessions)).toMatchObject({ session: { slug: 'proof-point-delivery' }, topic: { id: 'ownership' } });
  });
  it('has nothing for a question no session settles', () => {
    expect(placementOf('Q1', sessions)).toBeUndefined();
  });
});

describe('topicHref', () => {
  it('links to the topic section, or to the top of the session', () => {
    const s = session();
    expect(topicHref(s, s.topics[0])).toBe('/sessions/proof-point-delivery/#ownership');
    expect(topicHref(s)).toBe('/sessions/proof-point-delivery/');
  });
});

describe('discussedIn', () => {
  const data = siteData();
  it('links a settled question to its session topic', () => {
    expect(discussedIn(question({ id: 'DQ-9' }), data)).toEqual({ href: '/sessions/proof-point-delivery/#ownership', label: 'Delivery › Ownership' });
  });
  it('falls back to the idea section for a question no session settles', () => {
    expect(discussedIn(question({ id: 'Q4', idea: 'uc1-solution-architecture', section: 'authoring' }), data))
      .toEqual({ href: '/ideas/uc1-solution-architecture/#authoring', label: 'UC1' });
  });
  it('links to the top of the idea when there is no section', () => {
    expect(discussedIn(question({ id: 'U6', idea: 'uc1-solution-architecture' }), data)?.href).toBe('/ideas/uc1-solution-architecture/');
  });
  it('has nothing for a question discussed nowhere', () => {
    expect(discussedIn(question({ id: 'Q7' }), data)).toBeUndefined();
  });
});

describe('stillOpen', () => {
  const s = session({ topics: [topic({ id: 'a', settles: ['Q5', 'Q2'] }), topic({ id: 'b', settles: ['Q6', 'Q3'] })] });
  const questions = [
    question({ id: 'Q2', status: 'answered', answer: 'NBA', confirmedByEG: true }),
    question({ id: 'Q3', status: 'answered', answer: 'One reference' }),
    question({ id: 'Q5', status: 'assumed', position: 'In the resolver' }),
    question({ id: 'Q6' }),
    question({ id: 'Q9' }),
  ];
  const open = stillOpen(s, questions);

  it('drops what EG has confirmed and what the session does not settle', () => {
    expect([...open.toConfirm, ...open.toDecide].map((q) => q.id).sort()).toEqual(['Q3', 'Q5', 'Q6']);
  });
  it('splits like /decide, in the order the topics raise them', () => {
    expect(open.toConfirm.map((q) => q.id)).toEqual(['Q5', 'Q3']);
    expect(open.toDecide.map((q) => q.id)).toEqual(['Q6']);
  });
});
