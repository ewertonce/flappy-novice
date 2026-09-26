#!/usr/bin/env node
/*
 * Bundle the game into ONE self-contained HTML file (CSS, JS and SVGs inlined).
 * Handy for sharing the game as a single attachment or hosting it anywhere.
 *   npm run build              → dist/flappy-novice.html
 *   node scripts/bundle.mjs --fragment out.html   → body-only fragment (for hosts that add their own <head>)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const fragment = args.includes('--fragment');
const out = resolve(args.filter((a) => !a.startsWith('--'))[0] || join(ROOT, 'dist', 'flappy-novice.html'));

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const svgData = (p) => `data:image/svg+xml;base64,${Buffer.from(read(p)).toString('base64')}`;

let html = read('index.html');
html = html.replace(/<link href="style\.css" rel="stylesheet">/, () => `<style>\n${read('style.css')}\n.app { height: 100%; }\n</style>`);
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${read(src)}\n</script>`);
html = html.replace(/(src|href)="(assets\/ui\/[^"]+\.svg)"/g, (_, attr, p) => `${attr}="${svgData(p)}"`);

if (fragment) {
    const title = "<title>Flappy Novice</title>";
    const links = (html.match(/<link [^>]*fonts\.googleapis[^>]*>/g) || []).join('\n');
    const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
    const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
    html = `${title}\n${links}\n${style}\n<script>document.body.dataset.state = 'menu';</script>\n${body}`;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`Bundled ${(html.length / 1024).toFixed(0)} KB → ${out}`);
