import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const SOURCE = readFileSync('sources/workshop-agenda.md', 'utf8').split('\n').map((line) => line.trim());
const DIR = 'src/content/sessions';
const sessions = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({ file: f, ...YAML.parse(readFileSync(`${DIR}/${f}`, 'utf8')) }));

describe('session text is copied literally from sources/workshop-agenda.md', () => {
  it('has sessions to check', () => {
    expect(sessions.length).toBeGreaterThan(0);
  });
  for (const s of sessions) {
    // A session's block in the source runs from its title to the next blank line: title, track,
    // owner, the content bullets, then the expected outcomes. The YAML must match it line for line,
    // so a bullet dropped, added or reordered on either side fails.
    it(`${s.file}: title, track, owner, bullets and outcomes match the agenda exactly`, () => {
      const start = SOURCE.indexOf(s.title);
      expect(start, `title "${s.title}"`).toBeGreaterThanOrEqual(0);
      const stop = SOURCE.indexOf('', start);
      const block = SOURCE.slice(start, stop === -1 ? SOURCE.length : stop);
      expect([s.title, s.track, `Owner: ${s.owner}`, ...s.topics.map((t: { agenda: string }) => t.agenda), ...s.outcomes]).toEqual(block);
    });
  }
});
