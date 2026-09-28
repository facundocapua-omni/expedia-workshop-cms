import { actionForKey, isEditableTarget } from '../lib/present-keys';

const MODE_KEY = 'eg-workshop-present';
const THEME_KEY = 'eg-workshop-theme';
const root = document.documentElement;
const slides = [...document.querySelectorAll<HTMLElement>('[data-slide]')];
const toggles = [...document.querySelectorAll<HTMLButtonElement>('[data-present-toggle]')];
const counter = document.createElement('div');
counter.id = 'present-counter';
counter.setAttribute('aria-live', 'polite');
document.body.append(counter);
let current = 0;

// Storage can be unavailable (private windows, blocked site data): the mode then lasts for this page only.
const session = {
  get(key: string): string | null { try { return sessionStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string | null): void {
    try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value); } catch { /* see above */ }
  },
};
const presenting = () => root.dataset.mode === 'present';

const hashTarget = () => (location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null);

/** Shows a slide. With `focus` inside it (e.g. a register row an ID linked to), keeps that row in view. */
function show(index: number, focus: HTMLElement | null = null): void {
  if (slides.length === 0) return;
  current = index;
  slides.forEach((slide, i) => slide.toggleAttribute('data-current', i === index));
  counter.textContent = `${index + 1}/${slides.length}`;
  const slide = slides[index];
  if (focus && focus !== slide && slide.contains(focus)) {
    history.replaceState(null, '', `#${focus.id}`);
    focus.scrollIntoView();
    return;
  }
  history.replaceState(null, '', slide.id ? `#${slide.id}` : location.pathname);
  window.scrollTo(0, 0);
}

function slideInView(): number {
  const target = hashTarget();
  const containing = target ? slides.findIndex((s) => s.contains(target)) : -1;
  if (containing >= 0) return containing;
  const visible = slides.findIndex((s) => s.getBoundingClientRect().bottom > 80);
  return visible >= 0 ? visible : 0;
}

function enter(start = slideInView()): void {
  root.dataset.mode = 'present';
  session.set(MODE_KEY, '1');
  show(start, hashTarget());
}

function exit(): void {
  delete root.dataset.mode;
  session.set(MODE_KEY, null);
  slides.forEach((slide) => slide.removeAttribute('data-current'));
  slides[current]?.scrollIntoView();
}

function toggleTheme(): void {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  session.set(THEME_KEY, root.dataset.theme);
}

const savedTheme = session.get(THEME_KEY);
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;
if (slides.length > 0) toggles.forEach((button) => { button.hidden = false; });
toggles.forEach((button) => button.addEventListener('click', () => (presenting() ? exit() : enter())));

document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (isEditableTarget(event.target as HTMLElement | null) || document.querySelector('dialog[open]')) return;
  const action = actionForKey(event.key, current, slides.length, presenting());
  if (!action) return;
  event.preventDefault();
  if (action.type === 'toggle') enter();
  else if (action.type === 'exit') exit();
  else if (action.type === 'theme') toggleTheme();
  else show(action.index);
});

// An in-page link (e.g. CT01 on the UC2 page) moves to the slide that holds its target.
window.addEventListener('hashchange', () => {
  if (!presenting()) return;
  const target = hashTarget();
  const index = target ? slides.findIndex((s) => s.contains(target)) : -1;
  if (index >= 0) show(index, target);
});

if (session.get(MODE_KEY) === '1') enter();
