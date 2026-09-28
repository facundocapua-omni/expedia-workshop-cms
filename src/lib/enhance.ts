import type { Element, ElementContent, Root, RootContent } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import { createLinkifier } from './linkify';
import type { Registry } from './types';

/** Subtrees whose text is never linked. */
const NO_LINK = new Set(['a', 'code', 'pre', 'script', 'style', 'svg', 'head', 'title', 'textarea', 'button']);

/** Post-render pass shared by every page: links known IDs and fills the page index. */
export function enhanceHtml(html: string, registry: Registry): string {
  const tree = fromHtml(html);
  linkIds(tree, registry);
  buildIndex(tree);
  return toHtml(tree);
}

function linkIds(tree: Root, registry: Registry): void {
  const linkify = createLinkifier(registry.keys());
  const walk = (parent: Root | Element, suppressed: ReadonlySet<string>): void => {
    const next: (RootContent | ElementContent)[] = [];
    for (const child of parent.children) {
      if (child.type === 'text') {
        for (const segment of linkify(child.value)) {
          if (typeof segment === 'string') next.push({ type: 'text', value: segment });
          else if (suppressed.has(segment.id)) next.push({ type: 'text', value: segment.id });
          else next.push(idLink(segment.id, registry.get(segment.id)!.href));
        }
        continue;
      }
      if (child.type === 'element' && !NO_LINK.has(child.tagName)) {
        const defines = child.properties?.dataDef;
        walk(child, typeof defines === 'string' ? new Set([...suppressed, defines]) : suppressed);
      }
      next.push(child);
    }
    parent.children = next as typeof parent.children;
  };
  walk(tree, new Set());
}

function idLink(id: string, href: string): Element {
  return { type: 'element', tagName: 'a', properties: { className: ['idref'], href, dataId: id }, children: [{ type: 'text', value: id }] };
}

function buildIndex(tree: Root): void {
  const [nav] = findAll(tree, (e) => e.tagName === 'nav' && e.properties?.dataIndex !== undefined);
  if (!nav) return;
  const items = findAll(tree, (e) => e.tagName === 'section' && e.properties?.dataSlide !== undefined && typeof e.properties.id === 'string')
    .map((section): Element => {
      const { id, dataN, dataTitle, dataNav } = section.properties;
      return {
        type: 'element', tagName: 'li', properties: {},
        children: [{
          type: 'element', tagName: 'a', properties: { href: `#${String(id)}` },
          children: [
            { type: 'element', tagName: 'span', properties: { className: ['n'] }, children: [{ type: 'text', value: String(dataN ?? '') }] },
            { type: 'text', value: String(dataNav ?? dataTitle ?? '') },
          ],
        }],
      };
    });
  nav.children = [{ type: 'element', tagName: 'ol', properties: {}, children: items }];
}

function findAll(node: Root | Element, match: (e: Element) => boolean, out: Element[] = []): Element[] {
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (match(child)) out.push(child);
    findAll(child, match, out);
  }
  return out;
}
