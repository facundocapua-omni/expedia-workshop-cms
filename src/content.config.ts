import { readdir, readFile } from 'node:fs/promises';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import YAML from 'yaml';
import { parseInventory } from './lib/inventory';
import {
  consolidationSchema, contentTypeSchema, decisionSchema, ideaSchema,
  inventorySchema, questionSchema, sessionSchema, topicMaterialSchema, uc2QuestionSchema, uniqueById,
} from './lib/schemas';

const QUESTIONS = './data/questions.yaml';
const MATRIX = './model/uc2-matrix.json';

// Inline loaders on purpose: Astro's file() loader catches parser errors, logs them and
// builds anyway with the collection empty or stale. A throw here fails the build instead.
// Cost: under `astro dev`, edits to these files need a restart.
async function listFrom<T extends { id: string }>(path: string, pick: (parsed: any) => T[], label = path): Promise<T[]> {
  const text = await readFile(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = path.endsWith('.yaml') ? YAML.parse(text) : JSON.parse(text);
  } catch (error) {
    throw new Error(`${path}: ${(error as Error).message}`);
  }
  return uniqueById(pick(parsed), label);
}

const SESSIONS = './src/content/sessions';

/** One session per YAML file, named by its slug. Throws on bad YAML, like listFrom. */
async function sessionsFrom(dir: string): Promise<{ id: string }[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort();
  return Promise.all(files.map(async (f) => {
    const path = `${dir}/${f}`;
    let parsed: unknown;
    try {
      parsed = YAML.parse(await readFile(path, 'utf8'));
    } catch (error) {
      throw new Error(`${path}: ${(error as Error).message}`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${path}: expected one session`);
    if ('id' in parsed) throw new Error(`${path}: the file name is the session id, so remove "id"`);
    return { id: f.slice(0, -'.yaml'.length), ...parsed };
  }));
}

export const collections = {
  ideas: defineCollection({ loader: glob({ pattern: '*.mdx', base: './src/content/ideas' }), schema: ideaSchema }),
  // glob ids are lower-cased file names; always use data.id for the decision ID.
  decisions: defineCollection({ loader: glob({ pattern: 'D-*.md', base: './decisions' }), schema: decisionSchema }),
  questions: defineCollection({ loader: () => listFrom(QUESTIONS, (d) => d, 'data/questions.yaml'), schema: questionSchema }),
  uc2Questions: defineCollection({
    loader: () => listFrom(MATRIX, (d) => d.open_questions, `${MATRIX} open_questions`),
    schema: uc2QuestionSchema,
  }),
  contentTypes: defineCollection({
    loader: () => listFrom(MATRIX, (d) => d.components, `${MATRIX} components`),
    schema: contentTypeSchema,
  }),
  consolidation: defineCollection({
    loader: () => listFrom(MATRIX, (d) => d.consolidation.map((c: object, i: number) => ({ id: String(i + 1), ...c }))),
    schema: consolidationSchema,
  }),
  inventory: defineCollection({
    loader: async () => parseInventory(await readFile('./sources/component-inventory.md', 'utf8')),
    schema: inventorySchema,
  }),
  sessions: defineCollection({ loader: () => sessionsFrom(SESSIONS), schema: sessionSchema }),
  // Topic material: src/content/topics/<session>/<topic>.mdx, id "<session>/<topic>".
  topics: defineCollection({ loader: glob({ pattern: '*/*.mdx', base: './src/content/topics' }), schema: topicMaterialSchema }),
};
