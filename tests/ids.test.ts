import { describe, expect, it } from 'vitest';
import { anchorFor, compareIds } from '../src/lib/ids';

describe('ids', () => {
  it('anchors are the lower-cased ID', () => {
    expect(anchorFor('DQ-9')).toBe('dq-9');
    expect(anchorFor('Q6b')).toBe('q6b');
  });
  it('sorts by family, then number, then suffix', () => {
    const ids = ['DQ-10', 'Q6b', 'Q10', 'Q6', 'DQ-2', 'U11', 'U3', 'Q1', 'CT01', 'C021', 'D-05'];
    expect([...ids].sort(compareIds)).toEqual(['Q1', 'Q6', 'Q6b', 'Q10', 'DQ-2', 'DQ-10', 'U3', 'U11', 'D-05', 'CT01', 'C021']);
  });
  it('rejects something that is not an ID', () => {
    expect(() => compareIds('CMS-19', 'Q1')).toThrow('not a known ID: CMS-19');
  });
});
