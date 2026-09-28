import { hasProposal, onAgenda } from './agenda';
import type { Decision, Question, SessionMeta, SiteData, TopicMeta } from './types';

export interface Placement { session: SessionMeta; topic: TopicMeta }
export interface Link { href: string; label: string }
export interface StillOpen { toConfirm: Question[]; toDecide: Question[] }

/** The session topic that settles a question. Validation keeps it to one. */
export function placementOf(id: string, sessions: SessionMeta[]): Placement | undefined {
  for (const session of sessions) {
    const topic = session.topics.find((t) => t.settles.includes(id));
    if (topic) return { session, topic };
  }
  return undefined;
}

export const topicHref = (session: SessionMeta, topic?: TopicMeta): string =>
  `/sessions/${session.slug}/${topic ? `#${topic.id}` : ''}`;

/** "Discussed in": the session topic that settles the question, else the idea section it points at. */
export function discussedIn(q: Question, data: Pick<SiteData, 'sessions' | 'ideas'>): Link | undefined {
  const placed = placementOf(q.id, data.sessions);
  if (placed) return { href: topicHref(placed.session, placed.topic), label: `${placed.session.short} › ${placed.topic.nav}` };
  if (!q.idea) return undefined;
  const idea = data.ideas.find((i) => i.slug === q.idea);
  return { href: `/ideas/${q.idea}/${q.section ? `#${q.section}` : ''}`, label: idea?.short ?? q.idea };
}

/** A topic's decisions: those it lists, then any decision recorded later that resolves a question it settles. */
export function topicDecisions(topic: TopicMeta, decisions: Decision[]): Decision[] {
  const listed = topic.decisions
    .map((id) => decisions.find((d) => d.id === id))
    .filter((d): d is Decision => d !== undefined);
  const resolving = decisions.filter((d) => !topic.decisions.includes(d.id) && d.resolves.some((id) => topic.settles.includes(id)));
  return [...listed, ...resolving];
}

/** What a session leaves on the agenda, in the order its topics raise it. */
export function stillOpen(session: SessionMeta, questions: Question[]): StillOpen {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const items = session.topics
    .flatMap((t) => t.settles)
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined && onAgenda(q));
  return { toConfirm: items.filter(hasProposal), toDecide: items.filter((q) => !hasProposal(q)) };
}
