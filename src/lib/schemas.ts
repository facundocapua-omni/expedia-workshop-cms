import { z } from 'astro/zod';

export const STATUSES = ['open', 'assumed', 'answered', 'closed'] as const;
export const GROUPS = ['blocking', 'scope', 'inputs', 'commercial', 'uc1-design', 'uc2-model', 'migration'] as const;

const status = z.enum(STATUSES);
const POSITION_RULE = { message: 'an assumed question needs a position', path: ['position'] };
const hasPositionIfAssumed = (q: { status: string; position?: string }) => q.status !== 'assumed' || Boolean(q.position);

export const ideaSchema = z.object({
  title: z.string(),
  short: z.string(),
  kicker: z.string(),
  lede: z.string(),
  order: z.number(),
  meta: z.array(z.string()).default([]),
});

export const questionSchema = z
  .object({
    id: z.string().regex(/^(Q\d+b?|DQ-\d+)$/),
    group: z.enum(['blocking', 'scope', 'inputs', 'commercial', 'uc1-design', 'migration']),
    question: z.string().min(1),
    detail: z.string().optional(),
    why: z.string().optional(),
    owner: z.string().optional(),
    status,
    position: z.string().optional(),
    answer: z.string().optional(),
    confirmedByEG: z.boolean().default(false),
    idea: z.string().optional(),
    section: z.string().optional(),
  })
  .strict() // a misspelt key ("anwser:") must fail, not vanish
  .refine(hasPositionIfAssumed, POSITION_RULE);

export const uc2QuestionSchema = z
  .object({
    id: z.string().regex(/^U\d+$/),
    question: z.string().min(1),
    blocks: z.string().optional(),
    owner: z.string().optional(),
    status,
    position: z.string().optional(),
    answer: z.string().optional(),
    confirmedByEG: z.boolean().default(false),
  })
  .strict() // a misspelt key ("anwser:") must fail, not vanish
  .refine(hasPositionIfAssumed, POSITION_RULE);

export const decisionSchema = z.object({
  id: z.string().regex(/^D-\d{2}$/),
  title: z.string(),
  useCase: z.enum(['uc1', 'uc2']),
  resolves: z.array(z.string()).default([]),
}).strict();

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const topicSchema = z.object({
  /** The agenda bullet, copied literally from sources/workshop-agenda.md. */
  agenda: z.string().min(1),
  id: z.string().regex(SLUG),
  nav: z.string().min(1),
  settles: z.array(z.string().regex(/^(Q\d+b?|DQ-\d+|U\d+)$/)).default([]),
  decisions: z.array(z.string().regex(/^D-\d{2}$/)).default([]),
  /** A topic with no prepared material: shown as a discussion prompt, and has no MDX file. */
  prompt: z.boolean().default(false),
  see: z.object({ href: z.string().startsWith('/'), label: z.string().min(1) }).strict().optional(),
}).strict();

export const sessionSchema = z.object({
  id: z.string().regex(SLUG),
  title: z.string().min(1),
  short: z.string().min(1),
  track: z.string().min(1),
  owner: z.string().min(1),
  order: z.number().int().positive(),
  outcomes: z.array(z.string().min(1)).min(1),
  topics: z.array(topicSchema).min(1),
}).strict();

/** Topic material is MDX without frontmatter. */
export const topicMaterialSchema = z.object({}).strict();

export const contentTypeSchema = z.object({
  id: z.string().regex(/^CT\d{2}$/),
  name: z.string(),
  layer: z.string(),
  purpose: z.string(),
  summary: z.string(),
  complexity: z.enum(['S', 'M', 'L']),
  reuse: z.number(),
  consolidates: z.array(z.string()),
  properties: z.array(z.unknown()),
});

export const consolidationSchema = z.object({
  candidates: z.string(),
  decision: z.string(),
  test: z.string(),
  result: z.string(),
});

export const inventorySchema = z.object({
  id: z.string().regex(/^C\d{3}$/),
  name: z.string(),
  type: z.string(),
  variationOf: z.string().nullable(),
  matrixStatus: z.string(),
  reference: z.string().nullable(),
  screens: z.array(z.string()),
});

/** Loader guard: a repeated id would otherwise overwrite the earlier entry silently. */
export function uniqueById<T extends { id: string }>(list: T[], source: string): T[] {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.id)) throw new Error(`${source}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  return list;
}
