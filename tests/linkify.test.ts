import { describe, expect, it } from 'vitest';
import { createLinkifier } from '../src/lib/linkify';

const linkify = createLinkifier(['Q1', 'Q6', 'Q6b', 'Q26', 'DQ-1', 'DQ-10', 'DQ-9', 'CT18', 'CT21', 'C021', 'D-05']);

describe('createLinkifier', () => {
  it('splits text around known IDs', () => {
    expect(linkify('Support is DQ-9 and Q6b.')).toEqual(['Support is ', { id: 'DQ-9' }, ' and ', { id: 'Q6b' }, '.']);
  });
  it('prefers the longer ID', () => {
    expect(linkify('DQ-10')).toEqual([{ id: 'DQ-10' }]);
    expect(linkify('Q6b')).toEqual([{ id: 'Q6b' }]);
  });
  it('does not match inside longer tokens', () => {
    expect(linkify('DQ-11 and Q12 and XQ1 and Q1a')).toEqual(['DQ-11 and Q12 and XQ1 and Q1a']);
  });
  it('links IDs next to punctuation (Review Focus 1)', () => {
    expect(linkify('CT18+CT21, (DQ-9), C021, Q1–Q26.')).toEqual([
      { id: 'CT18' }, '+', { id: 'CT21' }, ', (', { id: 'DQ-9' }, '), ', { id: 'C021' }, ', ', { id: 'Q1' }, '–', { id: 'Q26' }, '.',
    ]);
  });
  it('is case-sensitive', () => {
    expect(linkify('q6b and dq-9')).toEqual(['q6b and dq-9']);
  });
  it('returns the text unchanged when there are no IDs', () => {
    expect(createLinkifier([])('Q1')).toEqual(['Q1']);
    expect(linkify('')).toEqual(['']);
  });
});
