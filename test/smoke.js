// Prueba de humo en navegador real sobre el sitio armado (_site/).
//   node test/smoke.js [carpeta]
// Necesita el paquete «playwright» (CI) o «playwright-core» con Chrome local
// (CHROME_PATH=/ruta/a/chrome).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('playwright-core'); }

const dir = path.resolve(process.argv[2] || '_site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (file.endsWith('/')) file += 'index.html';
  const p = path.join(dir, file);
  if (!p.startsWith(dir) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); console.log((ok ? 'ok   ' : 'FALLA ') + msg); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  // WebGL por software (SwiftShader): los navegadores sin GPU no dibujan el globo de otro modo.
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await pw.chromium.launch(Object.assign({ args }, process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}));
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) external.push(r.url()); });

  // Globo
  await page.goto(base + 'index.html');
  await page.waitForSelector('#globe-container canvas', { timeout: 15000 });
  await page.waitForTimeout(1500);
  check(await page.locator('.city-pin:not([inert])').count() > 3, 'globo: hay pines visibles');
  const hiddenFocusable = await page.$$eval('.city-pin', ps => ps.filter(p => p.style.opacity === '0' && p.tabIndex >= 0).length);
  check(hiddenFocusable === 0, 'globo: ningún pin oculto recibe foco');
  check(await page.locator('.video-slot .vplay').count() === 1, 'globo: el visor muestra Reproducir');
  check(await page.locator('iframe').count() === 0, 'globo: ningún reproductor antes del clic');
  await page.locator('.viewer .dist-row').nth(2).click();
  await page.waitForTimeout(300);
  const chosen = await page.locator('[data-note-title]').textContent();
  check(chosen && chosen !== 'Barranquilla', 'globo: la lista de distancias cambia de ciudad');

  // Atlas
  await page.goto(base + 'atlas-relativo.html?city=bogota');
  await page.waitForSelector('#svg .city-dot', { timeout: 15000 });
  check((await page.locator('#p-city').textContent()) === 'Bogotá', 'atlas: abre en la ciudad de ?city=');
  check(await page.locator('.lupa .city-dot').count() > 0, 'atlas: la lupa muestra vecinos');
  await page.locator('#r-track .dist-row').first().click();
  await page.waitForTimeout(1500);
  check((await page.locator('#p-city').textContent()) !== 'Bogotá', 'atlas: recentrar desde la lista');
  await page.locator('#p-frame .vplay, #p-frame .soon').first().waitFor();

  // Páginas de texto
  for (const p of ['projects.html', 'sobre.html']) {
    const r = await page.goto(base + p);
    check(r.ok() && (await page.locator('h1').count()) === 1, `${p}: carga con un solo h1`);
  }

  check(errors.length === 0, 'sin errores de consola' + (errors.length ? ': ' + errors.join(' | ') : ''));
  check(external.length === 0, 'sin peticiones externas antes de reproducir' + (external.length ? ': ' + external.join(' | ') : ''));
  await browser.close();
  server.close();
  if (failures.length) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
