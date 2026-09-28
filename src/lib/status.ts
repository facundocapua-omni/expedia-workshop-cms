import type { Status } from './types';

export function statusLabel(entry: { status?: Status; confirmed?: boolean }): string | undefined {
  if (!entry.status) return undefined;
  if (entry.status === 'answered' && entry.confirmed === false) return 'answered · awaiting EG';
  return entry.status;
}
