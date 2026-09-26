#!/usr/bin/env node
/*
 * Zero-dependency static file server for local development and Playwright.
 *   npm run dev            → http://localhost:5173
 *   PORT=8080 npm run dev  → custom port
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown; charset=utf-8',
};

const server = createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        let path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
        let file = join(ROOT, path);
        if (!file.startsWith(ROOT + sep) && file !== ROOT) {
            res.writeHead(403).end('Forbidden');
            return;
        }
        const info = await stat(file).catch(() => null);
        if (info && info.isDirectory()) file = join(file, 'index.html');
        const body = await readFile(file);
        res.writeHead(200, {
            'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        res.end(body);
    } catch (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`\n  Flappy Novice is flying at  http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\n`);
});
