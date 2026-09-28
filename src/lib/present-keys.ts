export type PresentAction =
  | { type: 'goto'; index: number }
  | { type: 'exit' }
  | { type: 'theme' }
  | { type: 'toggle' }
  | null;

export function actionForKey(key: string, current: number, total: number, presenting: boolean): PresentAction {
  if (!presenting) return key === 'p' || key === 'P' ? { type: 'toggle' } : null;
  const last = Math.max(total - 1, 0);
  switch (key) {
    case 'ArrowRight': case ' ': case 'PageDown': return { type: 'goto', index: Math.min(current + 1, last) };
    case 'ArrowLeft': case 'PageUp': return { type: 'goto', index: Math.max(current - 1, 0) };
    case 'Home': return { type: 'goto', index: 0 };
    case 'End': return { type: 'goto', index: last };
    case 'Escape': case 'p': case 'P': return { type: 'exit' };
    case 't': case 'T': return { type: 'theme' };
    default: return null;
  }
}

export function isEditableTarget(target: { tagName?: string; isContentEditable?: boolean } | null): boolean {
  if (!target) return false;
  return target.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName ?? '');
}
