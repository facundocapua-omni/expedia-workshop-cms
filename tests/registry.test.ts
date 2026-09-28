import { describe, expect, it } from 'vitest';
import { buildRegistry, registryToJSON } from '../src/lib/registry';
import { question, siteData } from './fixtures';

describe('buildRegistry', () => {
  const registry = buildRegistry(siteData({
    questions: [question({ id: 'Q1', status: 'answered', answer: 'Template in Contentful' }), question({ id: 'DQ-9' })],
  }));

  it('has one entry per ID across all families', () => {
    expect([...registry.keys()].sort()).toEqual(['C019', 'CT01', 'D-05', 'DQ-9', 'Q1']);
  });
  it('points each family at its definition page', () => {
    expect(registry.get('DQ-9')?.href).toBe('/registers/questions/#dq-9');
    expect(registry.get('D-05')?.href).toBe('/registers/decisions/#d-05');
    expect(registry.get('CT01')?.href).toBe('/ideas/uc2-content-model/#ct01');
    expect(registry.get('C019')?.href).toBe('/registers/inventory/#c019');
  });
  it('carries question status and EG confirmation', () => {
    expect(registry.get('Q1')).toMatchObject({ kind: 'question', status: 'answered', confirmed: false });
  });
  it('labels a content type with its name and summary', () => {
    expect(registry.get('CT01')?.label).toBe('section — Container');
  });
});

describe('registryToJSON', () => {
  it('keys entries by ID without repeating the ID', () => {
    const json = registryToJSON(buildRegistry(siteData()));
    expect(json['D-05']).toEqual({ kind: 'decision', label: 'Tone belongs to the partner', href: '/registers/decisions/#d-05' });
  });
});
