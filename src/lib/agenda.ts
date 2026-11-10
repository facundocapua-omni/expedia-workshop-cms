import { compareIds } from './ids';
import type { Question, QuestionGroup } from './types';

export const AGENDA_GROUPS: { group: QuestionGroup; title: string }[] = [
  { group: 'blocking', title: 'Blocking' },
  { group: 'scope', title: 'Scope boundaries' },
  { group: 'inputs', title: 'Inputs and dependencies' },
  { group: 'commercial', title: 'Commercial and evaluation' },
  { group: 'uc1-design', title: 'UC1 design' },
  { group: 'uc2-model', title: 'UC2 content model' },
  { group: 'migration', title: 'AEM migration' },
  { group: 'partner-web', title: 'Partner web platform' },
];

export interface AgendaGroup {
  group: QuestionGroup;
  title: string;
  toConfirm: Question[];
  toDecide: Question[];
}

/** An answer only leaves the agenda once EG has confirmed it. */
export const onAgenda = (q: Question): boolean =>
  q.status === 'open' || q.status === 'assumed' || (q.status === 'answered' && !q.confirmedByEG);

export const hasProposal = (q: Question): boolean => Boolean(q.position || q.answer);

export function buildAgenda(questions: Question[]): AgendaGroup[] {
  return AGENDA_GROUPS.map(({ group, title }) => {
    const items = questions.filter((q) => q.group === group && onAgenda(q)).sort((a, b) => compareIds(a.id, b.id));
    return { group, title, toConfirm: items.filter(hasProposal), toDecide: items.filter((q) => !hasProposal(q)) };
  }).filter((g) => g.toConfirm.length + g.toDecide.length > 0);
}
