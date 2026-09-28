import { getCollection } from 'astro:content';
import { compareIds } from './ids';
import { linkInventory } from './inventory';
import type { ContentType, SessionMeta, SiteData } from './types';
import { assertValid } from './validate';

let cached: Promise<SiteData> | undefined;

/** All site data, validated. Cached for a build; reloaded on every call under `astro dev`. */
export function loadSiteData(): Promise<SiteData> {
  if (import.meta.env.DEV) return load();
  return (cached ??= load());
}

async function load(): Promise<SiteData> {
  const [ideas, decisions, questions, uc2Questions, contentTypes, consolidation, inventory, sessions, topics] = await Promise.all([
    getCollection('ideas'), getCollection('decisions'), getCollection('questions'), getCollection('uc2Questions'),
    getCollection('contentTypes'), getCollection('consolidation'), getCollection('inventory'),
    getCollection('sessions'), getCollection('topics'),
  ]);
  const types: ContentType[] = contentTypes
    .map(({ data: { properties, ...rest } }) => ({ ...rest, propertyCount: properties.length }))
    .sort((a, b) => compareIds(a.id, b.id));
  const sessionList: SessionMeta[] = sessions
    .map(({ data: { id, ...rest } }) => ({ slug: id, ...rest }))
    .sort((a, b) => a.order - b.order);
  const settled = new Set(sessionList.flatMap((s) => s.topics.flatMap((t) => t.settles)));
  const data: SiteData = {
    sessions: sessionList,
    materials: topics.map((e) => e.id).sort(),
    ideas: ideas
      .map((e) => ({ slug: e.id, title: e.data.title, short: e.data.short, order: e.data.order }))
      .sort((a, b) => a.order - b.order),
    decisions: decisions.map((e) => e.data).sort((a, b) => compareIds(a.id, b.id)),
    questions: [
      ...questions.map((e) => e.data),
      // A UC2 question is discussed in the UC2 document unless a session settles it.
      ...uc2Questions.map((e) => ({ ...e.data, group: 'uc2-model' as const, ...(settled.has(e.data.id) ? {} : { idea: 'uc2-content-model' }) })),
    ].sort((a, b) => compareIds(a.id, b.id)),
    contentTypes: types,
    consolidation: consolidation.map((e) => e.data),
    inventory: linkInventory(inventory.map((e) => e.data), types).sort((a, b) => compareIds(a.id, b.id)),
  };
  assertValid(data);
  return data;
}
