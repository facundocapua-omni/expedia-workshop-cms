import { describe, expect, it } from 'vitest';
import { statusLabel } from '../src/lib/status';

describe('statusLabel', () => {
  it('flags an answer EG has not confirmed', () => {
    expect(statusLabel({ status: 'answered', confirmed: false })).toBe('answered · awaiting EG');
  });
  it('shows other statuses as they are', () => {
    expect(statusLabel({ status: 'answered', confirmed: true })).toBe('answered');
    expect(statusLabel({ status: 'open' })).toBe('open');
  });
  it('has no label without a status', () => {
    expect(statusLabel({})).toBeUndefined();
  });
});
