import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';

const SOURCE = readFileSync('sources/workshop-agenda.md', 'utf8').split('\n').map((line) => line.trim());
const DIR = 'src/content/sessions';
const sessions = readdirSync(DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({ file: f, ...YAML.parse(readFileSync(`${DIR}/${f}`, 'utf8')) }));
const starts = sessions.map((s) => SOURCE.indexOf(s.title)).sort((a, b) => a - b);

describe('session text is copied literally from sources/workshop-agenda.md', () => {
  it('has sessions to check', () => {
    expect(sessions.length).toBeGreaterThan(0);
  });
  for (const s of sessions) {
    it(`${s.file}: title, track, owner, bullets and outcomes, in the agenda's order`, () => {
      const start = SOURCE.indexOf(s.title);
      expect(start, `title "${s.title}"`).toBeGreaterThanOrEqual(0);
      const end = starts.find((i) => i > start) ?? SOURCE.length;
      let at = start;
      for (const line of [s.track, `Owner: ${s.owner}`, ...s.topics.map((t: { agenda: string }) => t.agenda), ...s.outcomes]) {
        const next = SOURCE.indexOf(line, at + 1);
        expect(next > at && next < end, `"${line}" is missing from the session, or out of order`).toBe(true);
        at = next;
      }
    });
  }
});
