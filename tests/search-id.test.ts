import { describe, expect, it } from 'vitest';
import { matchId } from '../src/lib/search-id';

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
