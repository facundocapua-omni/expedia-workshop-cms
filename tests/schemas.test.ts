import { describe, expect, it } from 'vitest';
import { questionSchema, uc2QuestionSchema, uniqueById } from '../src/lib/schemas';

describe('questionSchema', () => {
  const base = { id: 'Q5', group: 'blocking', question: 'Where is the sentence assembled?', status: 'open' };

  it('accepts a minimal open question and defaults confirmedByEG to false', () => {
    expect(questionSchema.parse(base).confirmedByEG).toBe(false);
  });
  it('rejects an assumed question without a position', () => {
    expect(questionSchema.safeParse({ ...base, status: 'assumed' }).success).toBe(false);
  });
  it('accepts an assumed question with a position', () => {
    expect(questionSchema.safeParse({ ...base, status: 'assumed', position: 'In the resolver' }).success).toBe(true);
  });
  it('rejects a misspelt status', () => {
    expect(questionSchema.safeParse({ ...base, status: 'answerd' }).success).toBe(false);
  });
  it('rejects an ID outside the Q and DQ families', () => {
    expect(questionSchema.safeParse({ ...base, id: 'U3' }).success).toBe(false);
  });
});

describe('uc2QuestionSchema', () => {
  it('applies the same position rule', () => {
    expect(uc2QuestionSchema.safeParse({ id: 'U3', question: 'Calculator?', status: 'assumed' }).success).toBe(false);
  });
});

describe('uniqueById', () => {
  it('returns the list when every id is unique', () => {
    expect(uniqueById([{ id: 'Q1' }, { id: 'Q2' }], 'data/questions.yaml')).toHaveLength(2);
  });
  it('names the source and the id when an id repeats', () => {
    expect(() => uniqueById([{ id: 'Q1' }, { id: 'Q1' }], 'data/questions.yaml')).toThrow('data/questions.yaml: duplicate id Q1');
  });
});
