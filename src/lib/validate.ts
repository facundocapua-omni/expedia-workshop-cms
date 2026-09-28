import type { SiteData } from './types';

/** Cross-collection rules that per-entry zod schemas cannot express. */
export function findProblems(data: SiteData): string[] {
  const problems: string[] = [];
  const owners = new Map<string, string>();
  const claim = (id: string, where: string) => {
    const previous = owners.get(id);
    if (previous) problems.push(`duplicate ID ${id} (${previous} and ${where})`);
    else owners.set(id, where);
  };
  data.questions.forEach((q) => claim(q.id, 'questions'));
  data.decisions.forEach((d) => claim(d.id, 'decisions'));
  data.contentTypes.forEach((c) => claim(c.id, 'content types'));
  data.inventory.forEach((c) => claim(c.id, 'inventory'));

  const ideas = new Set(data.ideas.map((i) => i.slug));
  for (const q of data.questions) {
    if (q.idea && !ideas.has(q.idea)) problems.push(`${q.id}: unknown idea "${q.idea}"`);
    if (q.section && !q.idea) problems.push(`${q.id}: section "${q.section}" without an idea`);
  }
  const questionIds = new Set(data.questions.map((q) => q.id));
  for (const d of data.decisions) {
    for (const id of d.resolves) if (!questionIds.has(id)) problems.push(`${d.id}: resolves unknown question ${id}`);
  }
  return problems;
}

export function assertValid(data: SiteData): void {
  const problems = findProblems(data);
  if (problems.length > 0) throw new Error(`Site data is invalid:\n- ${problems.join('\n- ')}`);
}
