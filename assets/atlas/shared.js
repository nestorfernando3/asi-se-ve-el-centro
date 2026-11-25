/* Piezas comunes del globo (assets/globe/globe.js) y del atlas relativo (atlas.js):
   nombres y colores de estado, memoria de sesión del morfismo y lista de distancias. */
(function () {
  const STATUS_LABEL = { live: 'viva', next: 'próxima', future: 'futura' };

  // Los colores viven en assets/site.css (--st-live, --st-next, --st-future).
  const FALLBACK = { live: '#e06957', next: '#f1e4c8', future: '#63a9a1' };
  function statusColors() {
    const css = getComputedStyle(document.documentElement);
    const out = {};
    Object.keys(FALLBACK).forEach(k => {
      out[k] = css.getPropertyValue('--st-' + k).trim() || FALLBACK[k];
    });
    return out;
  }

  // Lo que una vista deja a la otra para el morfismo globo ⇄ atlas.
  const MORPH_KEY = 'atlas-morph';
  const GEOM_KEY = 'globe-geom';
  function readSession(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeSession(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* almacenamiento bloqueado */ }
  }
  function takeSession(key) {
    const v = readSession(key);
    try { sessionStorage.removeItem(key); } catch (e) { /* nada */ }
    return v;
  }

  // Lista de ciudades de cerca a lejos desde «from». Cada fila es un botón.
  // opts: dist(c) en km, fmt(km), label(c, km) para el lector de pantalla, onPick(c, evento).
  function renderDistanceList(list, from, cities, opts) {
    list.textContent = '';
    cities.filter(c => c !== from)
      .map(c => ({ c, d: opts.dist(c) }))
      .sort((a, b) => a.d - b.d)
      .forEach(({ c, d }) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'dist-row';
        row.dataset.cityId = c.id;
        row.dataset.status = c.status;
        row.setAttribute('aria-label', opts.label(c, d));
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.setAttribute('aria-hidden', 'true');
        const name = document.createElement('span');
        name.textContent = c.name;
        const km = document.createElement('span');
        km.className = 'km';
        km.textContent = opts.fmt(d);
        row.append(dot, name, km);
        row.addEventListener('click', e => opts.onPick(c, e));
        list.appendChild(row);
      });
  }

  window.AtlasShared = {
    STATUS_LABEL, statusColors, MORPH_KEY, GEOM_KEY,
    readSession, writeSession, takeSession, renderDistanceList
  };
})();
