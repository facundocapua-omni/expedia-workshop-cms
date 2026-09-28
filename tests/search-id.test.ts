import { describe, expect, it } from 'vitest';
import { bestSubResult, matchId } from '../src/lib/search-id';

const ids = ['DQ-9', 'DQ-10', 'Q6b', 'CT01'];

describe('matchId (Review Focus 5)', () => {
  it('matches regardless of case and surrounding space', () => {
    expect(matchId('dq-9 ', ids)).toBe('DQ-9');
    expect(matchId('q6B', ids)).toBe('Q6b');
    expect(matchId(' CT01', ids)).toBe('CT01');
  });
  it('needs the whole ID', () => {
    expect(matchId('DQ-1', ids)).toBeNull();
    expect(matchId('dq 9', ids)).toBeNull();
    expect(matchId('', ids)).toBeNull();
  });
});

describe('bestSubResult', () => {
  it('picks the section with the most matches, so a result lands on it', () => {
    const subs = [
      { url: '/ideas/uc1/', title: 'Use Case 1', excerpt: 'a', locations: [3] },
      { url: '/ideas/uc1/#failure-title', title: 'Failure handling', excerpt: 'b', locations: [40, 41, 52] },
      { url: '/ideas/uc1/#ownership-title', title: 'Build, host and support', excerpt: 'c', locations: [90] },
    ];
    expect(bestSubResult(subs)?.url).toBe('/ideas/uc1/#failure-title');
  });
  it('keeps the first on a tie and has nothing to pick from an empty list', () => {
    expect(bestSubResult([{ url: '/a/#x', title: 'x', excerpt: '', locations: [1] }, { url: '/a/#y', title: 'y', excerpt: '', locations: [2] }])?.url).toBe('/a/#x');
    expect(bestSubResult([])).toBeUndefined();
  });
});
