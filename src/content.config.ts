import { readFile } from 'node:fs/promises';
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import YAML from 'yaml';
import { parseInventory } from './lib/inventory';
import {
  consolidationSchema, contentTypeSchema, decisionSchema, ideaSchema,
  inventorySchema, questionSchema, uc2QuestionSchema, uniqueById,
} from './lib/schemas';

const MATRIX = './model/uc2-matrix.json';
const matrixPart = (key: 'open_questions' | 'components') => (text: string) =>
  uniqueById(JSON.parse(text)[key], `${MATRIX} ${key}`);

export const collections = {
  ideas: defineCollection({ loader: glob({ pattern: '*.mdx', base: './src/content/ideas' }), schema: ideaSchema }),
  // glob ids are lower-cased file names; always use data.id for the decision ID.
  decisions: defineCollection({ loader: glob({ pattern: 'D-*.md', base: './decisions' }), schema: decisionSchema }),
  questions: defineCollection({
    loader: file('./data/questions.yaml', { parser: (text) => uniqueById(YAML.parse(text), 'data/questions.yaml') }),
    schema: questionSchema,
  }),
  uc2Questions: defineCollection({ loader: file(MATRIX, { parser: matrixPart('open_questions') }), schema: uc2QuestionSchema }),
  contentTypes: defineCollection({ loader: file(MATRIX, { parser: matrixPart('components') }), schema: contentTypeSchema }),
  consolidation: defineCollection({
    loader: file(MATRIX, { parser: (text) => JSON.parse(text).consolidation.map((c: object, i: number) => ({ id: String(i + 1), ...c })) }),
    schema: consolidationSchema,
  }),
  inventory: defineCollection({
    loader: async () => parseInventory(await readFile('./sources/component-inventory.md', 'utf8')),
    schema: inventorySchema,
  }),
};
