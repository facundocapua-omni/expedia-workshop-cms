import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sessions are presented, not settled: their material cites decisions but never a question.
// Questions live on /decide and the questions register, which link back to the topic.
const QUESTION_ID = /(?<![\w-])(?:Q\d+b?|DQ-\d+|U\d+)(?![\w-])/g;
const DIR = 'src/content/topics';
const topics = readdirSync(DIR, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.mdx'));

/** A topic's MDX plus the fragments it imports with ?raw, which render on the same page. */
function material(file: string): { where: string; text: string }[] {
  const mdx = readFileSync(`${DIR}/${file}`, 'utf8');
  const fragments = [...mdx.matchAll(/from '\.\.\/\.\.\/fragments\/([^']+)\?raw'/g)].map((m) => `src/content/fragments/${m[1]}`);
  return [{ where: `${DIR}/${file}`, text: mdx }, ...fragments.map((f) => ({ where: f, text: readFileSync(f, 'utf8') }))];
}

describe('session material cites no question IDs', () => {
  it('has topics to check', () => {
    expect(topics.length).toBeGreaterThan(0);
  });
  for (const file of topics) {
    it(file, () => {
      const found = material(file).flatMap(({ where, text }) => [...text.matchAll(QUESTION_ID)].map((m) => `${where}: ${m[0]}`));
      expect(found).toEqual([]);
    });
  }
});
