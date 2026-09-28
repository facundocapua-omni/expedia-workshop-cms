import { describe, expect, it } from 'vitest';
import { actionForKey, isEditableTarget } from '../src/lib/present-keys';

describe('actionForKey', () => {
  it('only listens for P when not presenting', () => {
    expect(actionForKey('p', 0, 5, false)).toEqual({ type: 'toggle' });
    expect(actionForKey('ArrowRight', 0, 5, false)).toBeNull();
    expect(actionForKey(' ', 0, 5, false)).toBeNull();
  });
  it('moves forward and back, clamped to the deck', () => {
    expect(actionForKey('ArrowRight', 2, 5, true)).toEqual({ type: 'goto', index: 3 });
    expect(actionForKey(' ', 4, 5, true)).toEqual({ type: 'goto', index: 4 });
    expect(actionForKey('PageDown', 1, 5, true)).toEqual({ type: 'goto', index: 2 });
    expect(actionForKey('ArrowLeft', 0, 5, true)).toEqual({ type: 'goto', index: 0 });
    expect(actionForKey('PageUp', 3, 5, true)).toEqual({ type: 'goto', index: 2 });
  });
  it('jumps to the ends', () => {
    expect(actionForKey('Home', 3, 5, true)).toEqual({ type: 'goto', index: 0 });
    expect(actionForKey('End', 0, 5, true)).toEqual({ type: 'goto', index: 4 });
  });
  it('exits on Escape or P, and toggles the theme on T', () => {
    expect(actionForKey('Escape', 1, 5, true)).toEqual({ type: 'exit' });
    expect(actionForKey('P', 1, 5, true)).toEqual({ type: 'exit' });
    expect(actionForKey('t', 1, 5, true)).toEqual({ type: 'theme' });
  });
  it('ignores other keys, leaving ArrowDown to scroll a tall slide', () => {
    expect(actionForKey('ArrowDown', 1, 5, true)).toBeNull();
    expect(actionForKey('x', 1, 5, true)).toBeNull();
  });
});

describe('isEditableTarget (Review Focus 2)', () => {
  it('treats form fields and contenteditable as editable', () => {
    expect(isEditableTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'TEXTAREA' })).toBe(true);
    expect(isEditableTarget({ tagName: 'SELECT' })).toBe(true);
    expect(isEditableTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
  });
  it('treats everything else as not editable', () => {
    expect(isEditableTarget({ tagName: 'DIV' })).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
