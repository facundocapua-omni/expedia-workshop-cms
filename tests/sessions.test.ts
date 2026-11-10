import { describe, expect, it } from 'vitest';
import { discussedIn, placementOf, topicHref, visibleTopics } from '../src/lib/sessions';
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

describe('visibleTopics', () => {
  it('leaves out hidden topics, keeping the agenda order', () => {
    const s = session({ topics: [topic({ id: 'flow' }), topic({ id: 'reference-implementations', hidden: true }), topic({ id: 'failure' })] });
    expect(visibleTopics(s).map((t) => t.id)).toEqual(['flow', 'failure']);
  });
});
