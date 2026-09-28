import { isEditableTarget } from '../lib/present-keys';
import { bestSubResult, matchId, type SubResult } from '../lib/search-id';

type PagefindData = { url: string; excerpt: string; meta: Record<string, string>; sub_results?: SubResult[] };
type Pagefind = { search: (query: string) => Promise<{ results: { data: () => Promise<PagefindData> }[] }> };
type Item = { href: string; kind: string; title: string; excerpt: string; excerptIsHtml: boolean };

const PAGEFIND_URL = '/pagefind/pagefind.js';
const dialog = document.getElementById('search') as HTMLDialogElement | null;

if (dialog) {
  const input = dialog.querySelector<HTMLInputElement>('#search-input')!;
  const list = dialog.querySelector<HTMLUListElement>('#search-results')!;
  const note = dialog.querySelector<HTMLParagraphElement>('#search-note')!;
  const form = dialog.querySelector<HTMLFormElement>('form')!;
  const registry: Record<string, { label: string; href: string }> = JSON.parse(document.getElementById('idref-data')?.textContent ?? '{}');
  let pagefind: Promise<Pagefind | null> | undefined;
  // The index exists only in the built site; under `astro dev` the import fails and search says so.
  const loadPagefind = () => (pagefind ??= import(/* @vite-ignore */ PAGEFIND_URL).then((m) => m as Pagefind).catch(() => null));
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = () => { dialog.showModal(); input.select(); };
  document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', open));
  dialog.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (dialog.open || isEditableTarget(event.target as HTMLElement | null)) return;
    event.preventDefault();
    open();
  });

  function render(items: Item[]): void {
    list.replaceChildren(...items.map((item) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.href;
      // Close before navigating: a same-page result only changes the hash, and the modal would stay over it.
      a.addEventListener('click', () => dialog?.close());
      const kind = Object.assign(document.createElement('span'), { className: 'r-kind', textContent: item.kind });
      const title = Object.assign(document.createElement('span'), { className: 'r-title', textContent: item.title });
      const excerpt = document.createElement('span');
      excerpt.className = 'r-excerpt';
      // Pagefind excerpts are escaped HTML with <mark> highlights; registry labels are plain text.
      if (item.excerptIsHtml) excerpt.innerHTML = item.excerpt; else excerpt.textContent = item.excerpt;
      a.append(kind, title, excerpt);
      li.append(a);
      return li;
    }));
  }

  async function run(query: string): Promise<void> {
    const mine = ++sequence;
    const items: Item[] = [];
    const id = matchId(query, Object.keys(registry));
    if (id) items.push({ href: registry[id].href, kind: id, title: `Go to ${id}`, excerpt: registry[id].label, excerptIsHtml: false });
    const wantsFullText = query.trim().length >= 2;
    const pf = wantsFullText ? await loadPagefind() : null;
    if (mine !== sequence) return;
    note.hidden = !(wantsFullText && !pf);
    note.textContent = 'Full-text search runs on the built site: pnpm build && pnpm preview.';
    if (pf) {
      const { results } = await pf.search(query);
      const data = await Promise.all(results.slice(0, 8).map((r) => r.data()));
      if (mine !== sequence) return;
      for (const d of data) {
        // Land on the section with the most matches (headings carry ids), not the top of the page.
        const sub = bestSubResult(d.sub_results ?? []);
        const page = d.meta.title ?? d.url;
        const title = sub?.title && sub.title !== page ? `${page} › ${sub.title}` : page;
        items.push({ href: sub?.url ?? d.url, kind: d.meta.kind ?? '', title, excerpt: sub?.excerpt ?? d.excerpt, excerptIsHtml: true });
      }
    }
    render(items);
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(input.value), 150); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    list.querySelector<HTMLAnchorElement>('a')?.click();
  });
}
