export type Status = 'open' | 'assumed' | 'answered' | 'closed';
export type QuestionGroup = 'blocking' | 'scope' | 'inputs' | 'commercial' | 'uc1-design' | 'uc2-model' | 'migration' | 'partner-web';

export interface Question {
  id: string;
  group: QuestionGroup;
  question: string;
  detail?: string;
  why?: string;
  owner?: string;
  status: Status;
  position?: string;
  answer?: string;
  confirmedByEG: boolean;
  idea?: string;
  section?: string;
  blocks?: string;
}

export interface Decision {
  id: string;
  title: string;
  useCase: 'uc1' | 'uc2';
  resolves: string[];
}

export interface ContentType {
  id: string;
  name: string;
  layer: string;
  purpose: string;
  summary: string;
  complexity: 'S' | 'M' | 'L';
  reuse: number;
  propertyCount: number;
  consolidates: string[];
}

export interface Consolidation {
  candidates: string;
  decision: string;
  test: string;
  result: string;
}

export interface InventoryRow {
  id: string;
  name: string;
  type: string;
  variationOf: string | null;
  matrixStatus: string;
  reference: string | null;
  screens: string[];
}

export interface InventoryComponent extends InventoryRow {
  contentTypes: string[];
}

export interface IdeaMeta {
  slug: string;
  title: string;
  short: string;
  order: number;
}

export interface TopicMeta {
  id: string;
  agenda: string;
  nav: string;
  settles: string[];
  prompt: boolean;
  hidden: boolean;
  see?: { href: string; label: string };
}

export interface SessionMeta {
  slug: string;
  title: string;
  short: string;
  order: number;
  topics: TopicMeta[];
}

export interface SiteData {
  sessions: SessionMeta[];
  /** Topic material files, as "<session>/<topic>". */
  materials: string[];
  ideas: IdeaMeta[];
  questions: Question[];
  decisions: Decision[];
  contentTypes: ContentType[];
  consolidation: Consolidation[];
  inventory: InventoryComponent[];
}

export type RegistryKind = 'question' | 'decision' | 'contentType' | 'component';

export interface RegistryEntry {
  id: string;
  kind: RegistryKind;
  label: string;
  status?: Status;
  confirmed?: boolean;
  href: string;
}

export type Registry = Map<string, RegistryEntry>;
