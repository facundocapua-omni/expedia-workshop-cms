import { statusLabel } from '../lib/status';
import type { RegistryEntry } from '../lib/types';

type Entry = Omit<RegistryEntry, 'id'>;
const data: Record<string, Entry> = JSON.parse(document.getElementById('idref-data')?.textContent ?? '{}');

const tip = document.createElement('div');
tip.id = 'idref-tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.append(tip);
let current: HTMLAnchorElement | null = null;

function show(link: HTMLAnchorElement): void {
  const id = link.dataset.id;
  const entry = id ? data[id] : undefined;
  if (!id || !entry) return;
  const head = document.createElement('div');
  head.className = 'tip-head';
  const strong = document.createElement('strong');
  strong.textContent = id;
  head.append(strong);
  const status = statusLabel(entry);
  if (status && entry.status) {
    const chip = document.createElement('span');
    chip.className = `st st-${entry.status}`;
    chip.textContent = status;
    head.append(chip);
  }
  const body = document.createElement('div');
  body.className = 'tip-body';
  body.textContent = entry.label; // text only: labels come from data and are never parsed as HTML
  tip.replaceChildren(head, body);
  tip.hidden = false;
  const rect = link.getBoundingClientRect();
  const width = Math.min(360, window.innerWidth - 32);
  tip.style.width = `${width}px`;
  tip.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) + window.scrollX}px`;
  tip.style.top = `${rect.bottom + window.scrollY + 8}px`;
  link.setAttribute('aria-describedby', 'idref-tip');
  current = link;
}

function hide(): void {
  tip.hidden = true;
  current?.removeAttribute('aria-describedby');
  current = null;
}

const idrefFrom = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLAnchorElement>('a.idref') : null);
document.addEventListener('pointerover', (event) => { const link = idrefFrom(event.target); if (link) show(link); });
document.addEventListener('pointerout', (event) => { if (idrefFrom(event.target)) hide(); });
document.addEventListener('focusin', (event) => { const link = idrefFrom(event.target); if (link) show(link); });
document.addEventListener('focusout', (event) => { if (idrefFrom(event.target)) hide(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide(); });
