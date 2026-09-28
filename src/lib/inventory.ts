import type { InventoryComponent, InventoryRow } from './types';

const HEADING = '## Approved components (internal)';
const COLUMNS = 7;
const dash = (value: string) => (value === '-' || value === '' ? null : value);

/** Reads the approved component table; the rest of the file (analyst notes) is ignored on purpose. */
export function parseInventory(markdown: string): InventoryRow[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === HEADING);
  if (start < 0) throw new Error(`component inventory: heading "${HEADING}" not found`);
  const rows: InventoryRow[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
    if (!/^C\d{3}$/.test(cells[0])) continue; // header and separator rows
    if (cells.length !== COLUMNS) throw new Error(`component inventory: ${cells[0]} has ${cells.length} columns, expected ${COLUMNS}`);
    const [id, name, type, variationOf, matrixStatus, reference, screens] = cells;
    rows.push({
      id, name, type, matrixStatus,
      variationOf: dash(variationOf),
      reference: dash(reference),
      screens: screens.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }
  if (rows.length === 0) throw new Error('component inventory: no component rows found');
  return rows;
}

/** A content type lists the components it consolidates as "C019 Background Section". */
export function linkInventory(rows: InventoryRow[], contentTypes: { id: string; consolidates: string[] }[]): InventoryComponent[] {
  return rows.map((row) => ({
    ...row,
    contentTypes: contentTypes
      .filter((ct) => ct.consolidates.some((entry) => entry.split(' ')[0] === row.id))
      .map((ct) => ct.id),
  }));
}
