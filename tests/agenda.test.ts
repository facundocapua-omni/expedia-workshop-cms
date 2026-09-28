import { describe, expect, it } from 'vitest';
import { AGENDA_GROUPS, buildAgenda } from '../src/lib/agenda';
import { question } from './fixtures';

describe('buildAgenda', () => {
  const qs = [
    question({ id: 'Q7', group: 'scope' }),
    question({ id: 'Q5', group: 'blocking', status: 'assumed', position: 'In the resolver' }),
    question({ id: 'Q1', group: 'blocking', status: 'answered', answer: 'Template', confirmedByEG: false }),
    question({ id: 'Q2', group: 'blocking', status: 'answered', answer: 'NBA', confirmedByEG: true }),
    question({ id: 'Q3', group: 'blocking', status: 'closed' }),
    question({ id: 'Q10', group: 'scope' }),
    question({ id: 'Q6b', group: 'blocking' }),
  ];
  const agenda = buildAgenda(qs);

  it('keeps open, assumed and unconfirmed answers; drops closed and confirmed ones', () => {
    const ids = agenda.flatMap((g) => [...g.toConfirm, ...g.toDecide]).map((q) => q.id);
    expect(ids.sort()).toEqual(['Q1', 'Q10', 'Q5', 'Q6b', 'Q7']);
  });
  it('puts items with a position or an answer under "to confirm"', () => {
    const blocking = agenda.find((g) => g.group === 'blocking')!;
    expect(blocking.toConfirm.map((q) => q.id)).toEqual(['Q1', 'Q5']);
    expect(blocking.toDecide.map((q) => q.id)).toEqual(['Q6b']);
  });
  it('follows the register group order and omits empty groups', () => {
    expect(agenda.map((g) => g.group)).toEqual(['blocking', 'scope']);
    expect(AGENDA_GROUPS.map((g) => g.group)).toEqual(['blocking', 'scope', 'inputs', 'commercial', 'uc1-design', 'uc2-model']);
  });
  it('sorts by ID inside a group', () => {
    expect(agenda.find((g) => g.group === 'scope')!.toDecide.map((q) => q.id)).toEqual(['Q7', 'Q10']);
  });
});
