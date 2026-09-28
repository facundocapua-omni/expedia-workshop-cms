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

  // Belt and braces: a source that silently loaded nothing would shrink every count with it.
  const empty: [boolean, string][] = [
    [!data.questions.some((q) => /^(Q\d|DQ-)/.test(q.id)), 'no Q or DQ questions loaded from data/questions.yaml'],
    [!data.questions.some((q) => /^U\d/.test(q.id)), 'no UC2 questions loaded from model/uc2-matrix.json'],
    [data.decisions.length === 0, 'no decisions loaded from decisions/'],
    [data.contentTypes.length === 0, 'no content types loaded from model/uc2-matrix.json'],
    [data.inventory.length === 0, 'no components loaded from sources/component-inventory.md'],
    [data.ideas.length === 0, 'no ideas loaded from src/content/ideas/'],
    [data.sessions.length === 0, 'no sessions loaded from src/content/sessions/'],
  ];
  for (const [isEmpty, message] of empty) if (isEmpty) problems.push(message);

  const ideas = new Set(data.ideas.map((i) => i.slug));
  for (const q of data.questions) {
    if (q.idea && !ideas.has(q.idea)) problems.push(`${q.id}: unknown idea "${q.idea}"`);
    if (q.section && !q.idea) problems.push(`${q.id}: section "${q.section}" without an idea`);
  }
  const questionIds = new Set(data.questions.map((q) => q.id));
  for (const d of data.decisions) {
    for (const id of d.resolves) if (!questionIds.has(id)) problems.push(`${d.id}: resolves unknown question ${id}`);
  }

  // Sessions: every question is settled in at most one topic, and every topic's material exists.
  const decisionIds = new Set(data.decisions.map((d) => d.id));
  const materials = new Set(data.materials);
  const declared = new Set<string>();
  const settledIn = new Map<string, string>();
  const byOrder = new Map<number, string>();
  const byShort = new Map<string, string>();
  for (const s of data.sessions) {
    const sameOrder = byOrder.get(s.order);
    if (sameOrder) problems.push(`sessions ${sameOrder} and ${s.slug} share order ${s.order}`);
    else byOrder.set(s.order, s.slug);
    const sameShort = byShort.get(s.short);
    if (sameShort) problems.push(`sessions ${sameShort} and ${s.slug} share the short label "${s.short}"`);
    else byShort.set(s.short, s.slug);
    const topicIds = new Set<string>();
    for (const t of s.topics) {
      const where = `${s.slug}/${t.id}`;
      if (topicIds.has(t.id)) problems.push(`${s.slug}: duplicate topic ${t.id}`);
      topicIds.add(t.id);
      declared.add(where);
      for (const id of t.settles) {
        if (!questionIds.has(id)) problems.push(`${where}: settles unknown question ${id}`);
        const before = settledIn.get(id);
        if (before) problems.push(`${id}: settled in both ${before} and ${where}`);
        else settledIn.set(id, where);
      }
      for (const id of t.decisions) if (!decisionIds.has(id)) problems.push(`${where}: unknown decision ${id}`);
      if (t.prompt && materials.has(where)) problems.push(`${where}: a discussion prompt has no material, but src/content/topics/${where}.mdx exists`);
      if (!t.prompt && !materials.has(where)) problems.push(`${where}: no material — add src/content/topics/${where}.mdx or mark the topic prompt: true`);
    }
  }
  for (const m of data.materials) if (!declared.has(m)) problems.push(`src/content/topics/${m}.mdx: no session declares topic ${m}`);
  for (const q of data.questions) {
    const where = settledIn.get(q.id);
    if (where && (q.idea || q.section)) problems.push(`${q.id}: settled in ${where}, so it must not also set idea/section`);
  }
  return problems;
}

export function assertValid(data: SiteData): void {
  const problems = findProblems(data);
  if (problems.length > 0) throw new Error(`Site data is invalid:\n- ${problems.join('\n- ')}`);
}
