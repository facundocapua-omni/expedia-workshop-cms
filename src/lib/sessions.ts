import type { Question, SessionMeta, SiteData, TopicMeta } from './types';

export interface Placement { session: SessionMeta; topic: TopicMeta }
export interface Link { href: string; label: string }

/** The session topic that settles a question. Validation keeps it to one. */
export function placementOf(id: string, sessions: SessionMeta[]): Placement | undefined {
  for (const session of sessions) {
    const topic = session.topics.find((t) => t.settles.includes(id));
    if (topic) return { session, topic };
  }
  return undefined;
}

/** The topics a session page shows, in agenda order. */
export const visibleTopics = (session: SessionMeta): TopicMeta[] => session.topics.filter((t) => !t.hidden);

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
