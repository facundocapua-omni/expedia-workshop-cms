import { anchorFor } from './ids';
import type { Registry, RegistryEntry, SiteData } from './types';

/** The idea page that defines the content types (its table rows carry the CT anchors). */
export const CONTENT_TYPES_IDEA = 'uc2-content-model';

export function buildRegistry(data: SiteData): Registry {
  const registry: Registry = new Map();
  const add = (entry: RegistryEntry) => registry.set(entry.id, entry);
  for (const q of data.questions) {
    add({ id: q.id, kind: 'question', label: q.question, status: q.status, confirmed: q.confirmedByEG, href: `/registers/questions/#${anchorFor(q.id)}` });
  }
  for (const d of data.decisions) add({ id: d.id, kind: 'decision', label: d.title, href: `/registers/decisions/#${anchorFor(d.id)}` });
  for (const c of data.contentTypes) {
    add({ id: c.id, kind: 'contentType', label: `${c.name} — ${c.summary}`, href: `/ideas/${CONTENT_TYPES_IDEA}/#${anchorFor(c.id)}` });
  }
  for (const c of data.inventory) add({ id: c.id, kind: 'component', label: c.name, href: `/registers/inventory/#${anchorFor(c.id)}` });
  return registry;
}

export function registryToJSON(registry: Registry): Record<string, Omit<RegistryEntry, 'id'>> {
  return Object.fromEntries([...registry].map(([id, { id: _id, ...rest }]) => [id, rest]));
}
