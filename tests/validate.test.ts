import { describe, expect, it } from 'vitest';
import { assertValid, findProblems } from '../src/lib/validate';
import { question, siteData } from './fixtures';

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
    const problems = findProblems(siteData({ decisions: [], contentTypes: [], inventory: [], ideas: [] }));
    expect(problems).toEqual(expect.arrayContaining([
      'no decisions loaded from decisions/',
      'no content types loaded from model/uc2-matrix.json',
      'no components loaded from sources/component-inventory.md',
      'no ideas loaded from src/content/ideas/',
    ]));
  });
});

describe('assertValid', () => {
  it('throws one error listing every problem', () => {
    const data = siteData({ decisions: [{ id: 'D-26', title: 'A', useCase: 'uc1', resolves: ['Q27', 'Q28'] }] });
    expect(() => assertValid(data)).toThrow(/Q27[\s\S]*Q28/);
  });
});
