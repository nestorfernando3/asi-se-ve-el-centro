// Revisa el sitio armado (_site/): cada href/src local de cada página existe.
//   node scripts/check-site.js [carpeta]
const fs = require('node:fs');
const path = require('node:path');

const dir = path.resolve(process.argv[2] || '_site');
const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const missing = [];

for (const page of pages) {
  const html = fs.readFileSync(path.join(dir, page), 'utf8');
  for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|data:|mailto:|#)/.test(url)) continue;
    const file = url.split(/[?#]/)[0];
    if (!file) continue;
    if (!fs.existsSync(path.join(dir, file))) missing.push(`${page}: ${url}`);
  }
  // Recursos que piden las hojas de estilo (fuentes, imágenes).
}
for (const css of ['assets/site.css', 'assets/fonts/fonts.css', 'assets/editorial.css', 'assets/globe/globe.css']) {
  const p = path.join(dir, css);
  if (!fs.existsSync(p)) { missing.push(`hoja de estilo ausente: ${css}`); continue; }
  for (const m of fs.readFileSync(p, 'utf8').matchAll(/url\(["']?([^)"']+)["']?\)/g)) {
    if (/^(data:|https?:|%23|#)/.test(m[1])) continue;
    if (!fs.existsSync(path.join(path.dirname(p), m[1]))) missing.push(`${css}: ${m[1]}`);
  }
}

if (missing.length) {
  console.error('Enlaces rotos:\n' + missing.join('\n'));
  process.exit(1);
}
console.log(`Enlaces locales correctos en ${pages.length} páginas.`);
