import { describe, expect, it } from 'vitest';
import { enhanceHtml } from '../src/lib/enhance';
import type { Registry } from '../src/lib/types';

const registry: Registry = new Map([
  ['DQ-9', { id: 'DQ-9', kind: 'question', label: 'Who operates it?', status: 'open', href: '/registers/questions/#dq-9' }],
  ['Q6b', { id: 'Q6b', kind: 'question', label: 'Tone?', status: 'open', href: '/registers/questions/#q6b' }],
]);
const page = (body: string) => `<!doctype html><html><head><title>DQ-9</title></head><body>${body}</body></html>`;
const count = (html: string) => (html.match(/class="idref"/g) ?? []).length;

describe('enhanceHtml', () => {
  it('links known IDs in text', () => {
    expect(enhanceHtml(page('<p>See DQ-9.</p>'), registry))
      .toContain('<p>See <a class="idref" href="/registers/questions/#dq-9" data-id="DQ-9">DQ-9</a>.</p>');
  });
  it('leaves links, code, pre, svg, script and the title alone', () => {
    const out = enhanceHtml(page('<a href="#x">DQ-9</a><code>DQ-9</code><pre>DQ-9</pre><svg><text>DQ-9</text></svg><script>const a = "DQ-9";</script>'), registry);
    expect(count(out)).toBe(0);
    expect(out).toContain('<title>DQ-9</title>');
  });
  it('does not link an ID inside its own definition, but links others there', () => {
    const out = enhanceHtml(page('<article id="dq-9" data-def="DQ-9"><p>DQ-9 depends on Q6b</p></article>'), registry);
    expect(out).toContain('<p>DQ-9 depends on <a class="idref" href="/registers/questions/#q6b" data-id="Q6b">Q6b</a></p>');
  });
  it('builds the page index from slide sections, preferring the short nav label', () => {
    const out = enhanceHtml(page(
      '<nav class="index" data-index></nav><main>'
      + '<section id="ref" data-slide data-n="03" data-title="The content reference"><p>x</p></section>'
      + '<section id="open" data-slide data-n="14" data-title="Open questions raised by this design" data-nav="Open questions"><p>y</p></section>'
      + '</main>'), registry);
    expect(out).toContain('<li><a href="#ref"><span class="n">03</span>The content reference</a></li>');
    expect(out).toContain('<li><a href="#open"><span class="n">14</span>Open questions</a></li>');
  });
  it('preserves pre whitespace exactly (Review Focus 3)', () => {
    const pre = '<pre>cr:1:<span class="k">7Kx</span>@14\n\n     │         │\n     └── contract version\n{\n  "params": { "views": 47 }\n}</pre>';
    expect(enhanceHtml(page(pre), registry)).toContain(pre);
  });
  it('keeps the doctype', () => {
    expect(enhanceHtml(page('<p>x</p>'), registry).startsWith('<!doctype html>')).toBe(true);
  });
});
