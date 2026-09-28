import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linkInventory, parseInventory } from '../src/lib/inventory';

const SAMPLE = `# Inventory

## Approved components (internal)

| ID | Component | Type | Variation of | Matrix status | Reference | Screens |
| --- | --- | --- | --- | --- | --- | --- |
| C008 | Image + Text Split Banner | Component | - | Existing | ID 6 | P01 Campaign landing page |
| C021 | Image + Text Split Banner (image on the right) | Component | C008 | Variation | ID 6 | P01 Campaign landing page |
| C009 | Comparison Table | Component | - | New candidate | - | P01 Campaign landing page, Global |

## Components pending validation

| C099 | Must not be read | x | - | x | - | x |
`;

describe('parseInventory', () => {
  it('reads the rows of the approved table only', () => {
    expect(parseInventory(SAMPLE).map((r) => r.id)).toEqual(['C008', 'C021', 'C009']);
  });
  it('turns "-" into null and splits screens', () => {
    const [, c021, c009] = parseInventory(SAMPLE);
    expect(c021.variationOf).toBe('C008');
    expect(c009.reference).toBeNull();
    expect(c009.screens).toEqual(['P01 Campaign landing page', 'Global']);
  });
  it('fails loudly when the heading is missing', () => {
    expect(() => parseInventory('# nothing here')).toThrow('Approved components (internal)');
  });
  it('fails loudly on a row with the wrong column count', () => {
    expect(() => parseInventory(SAMPLE.replace('| ID 6 | P01 Campaign landing page |\n| C021', '| P01 |\n| C021'))).toThrow('C008 has 6 columns');
  });
  it('reads all 35 components from the real inventory', () => {
    const rows = parseInventory(readFileSync('sources/component-inventory.md', 'utf8'));
    expect(rows).toHaveLength(35);
    expect(new Set(rows.map((r) => r.id)).size).toBe(35);
  });
});

describe('linkInventory', () => {
  it('maps a component to every content type that consolidates it', () => {
    const [row] = parseInventory(SAMPLE);
    const linked = linkInventory([row], [
      { id: 'CT08', consolidates: ['C008 Image + Text Split Banner', 'C021 Image right'] },
      { id: 'CT01', consolidates: ['C019 Background Section'] },
    ]);
    expect(linked[0].contentTypes).toEqual(['CT08']);
  });
  it('leaves an unmapped component with no content types', () => {
    const [, , c009] = parseInventory(SAMPLE);
    expect(linkInventory([c009], [])[0].contentTypes).toEqual([]);
  });
});
