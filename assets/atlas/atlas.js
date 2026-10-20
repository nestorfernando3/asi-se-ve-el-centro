/* Atlas relativo — render e interacción.
   Requiere: d3, topojson, AtlasGeo, ATLAS_CITIES (cargados antes). */
(function () {
  const { R_EARTH, DEG, distKm, destPt, fmtKm } = window.AtlasGeo;
  const cities = window.ATLAS_CITIES;
  const colors = { live: '#e06957', next: '#f1e4c8', future: '#63a9a1' }; // = estados en assets/site.css
  const statusLabels = { live: 'viva', next: 'próxima', future: 'futura' };
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?city=<id> llega desde el globo: el atlas abre centrado en la ciudad elegida allí.
  const cityParam = new URLSearchParams(location.search).get('city');
  let centerCity = cities.find(c => c.id === cityParam) || cities[0];
  let land = null;
  let staticGeo = null;
  let timer = null;

  const mapEl = document.getElementById('map');
  const hintEl = document.getElementById('hint');
  const HINT_DEFAULT = hintEl.textContent;
  const svg = d3.select('#svg');
  // Precisión fina en reposo; durante las animaciones basta 2 px y d3 trabaja mucho menos.
  const PRECISION = 0.5, ANIM_PRECISION = 2;
  const azProj = d3.geoAzimuthalEquidistant().precision(PRECISION);
  let projection = azProj;           // durante el morfismo se cambia por morphProj

  // Cartografía en <canvas>: mar, retícula, radios, anillos, tierra con líneas de agua,
  // trópicos, rutas, halo y borde (las mismas capas del globo de la home). d3 dibuja
  // directo en el contexto, sin armar cadenas SVG en cada cuadro. Encima, el SVG solo
  // lleva lo que se lee o se toca: rótulos, ciudades y el centro.
  const canvas = document.createElement('canvas');
  canvas.className = 'carto';
  canvas.setAttribute('aria-hidden', 'true');
  mapEl.insertBefore(canvas, mapEl.querySelector('svg'));
  const ctx = canvas.getContext('2d');
  const path = d3.geoPath(projection, ctx);
  const SPHERE = { type: 'Sphere' };
  const SEA = getComputedStyle(document.documentElement).getPropertyValue('--sea-deep').trim() || '#0d2a35';
  let overlayAlpha = 1; // radios y anillos se funden durante el morfismo

  const gLabels = svg.append('g'); // rótulos de anillos y rumbos, por encima de la tierra
  const gCities = svg.append('g');
  const gCenter = svg.append('g');

  // Tamaños en caché: leerlos en cada cuadro forzaría un reflow. El lienzo comparte
  // origen con el mapa pero puede ser más grande (ver .carto en atlas-relativo.html).
  let mapW = 0, cartoW = 0, cartoH = 0, dpr = 1;
  function sizeFit() {
    const w = mapW = mapEl.clientWidth, h = mapEl.clientHeight;
    cartoW = canvas.clientWidth; cartoH = canvas.clientHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cartoW * dpr);
    canvas.height = Math.round(cartoH * dpr);
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    azProj.translate([w / 2, h / 2]).scale(Math.min(w, h) * 0.94 / (2 * Math.PI));
  }
  const rotateFor = (c) => [-c.lon, -c.lat];

  function computeGeo(c) {
    const rings = [], spokes = [], cardinals = [];
    for (let d = 2500; d <= 20000; d += 2500) {
      rings.push({
        geo: d3.geoCircle().center([c.lon, c.lat]).radius((d / R_EARTH) * DEG)(), d, major: d % 5000 === 0,
        labelLL: destPt(c.lon, c.lat, 90, d / R_EARTH)
      });
    }
    for (let b = 0; b < 360; b += 30) {
      const coords = [];
      for (let f = 0; f <= 40; f++) coords.push(destPt(c.lon, c.lat, b, (f / 40) * Math.PI));
      spokes.push({ type: 'LineString', coordinates: coords });
    }
    [['N', 0], ['E', 90], ['S', 180], ['O', 270]].forEach(([t, b]) => {
      cardinals.push({ t, ll: destPt(c.lon, c.lat, b, Math.PI * 0.965) });
    });
    // Distancias al centro, calculadas una vez por recentrado y no en cada cuadro.
    const dist = new Map(cities.map(x => [x, distKm(c, x)]));
    return { rings, spokes, cardinals, dist };
  }

  function strokeGeo(geo, color, width, dash) {
    ctx.beginPath();
    path(geo);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.stroke();
  }

  function drawCarto() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cartoW, cartoH);
    ctx.lineJoin = 'round';
    // Halo y borde siguen al disco del mundo en cada cuadro del morfismo.
    const [[x0, y0], [x1, y1]] = path.bounds(SPHERE);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, r = (x1 - x0) / 2;
    if (!(r > 0)) return;
    const haloR = r * 1.14;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    halo.addColorStop(0.84, 'rgba(95,176,180,0)');
    halo.addColorStop(0.9, 'rgba(95,176,180,0.34)');
    halo.addColorStop(1, 'rgba(95,176,180,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(cx, cy, haloR, 0, 2 * Math.PI); ctx.fill();

    ctx.beginPath(); path(SPHERE); ctx.fillStyle = SEA; ctx.fill();
    strokeGeo(graticule, 'rgba(160,205,212,0.09)', 0.6);

    if (overlayAlpha > 0) {
      ctx.globalAlpha = overlayAlpha;
      ctx.beginPath(); staticGeo.spokes.forEach(g => path(g));
      ctx.strokeStyle = 'rgba(241,236,226,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([]); ctx.stroke();
      staticGeo.rings.forEach(g => strokeGeo(g.geo,
        g.major ? 'rgba(224,105,87,0.5)' : 'rgba(224,105,87,0.32)', 1, g.major ? null : [2, 5]));
      ctx.globalAlpha = 1;
    }

    if (land) {
      // Una sola proyección de la tierra por cuadro, reutilizada en todos sus trazos.
      const shape = new Path2D();
      path.context(shape); path(land); path.context(ctx);
      ctx.setLineDash([]);
      // Líneas de agua: anillos que se alejan de la costa, recortados con el color del mar.
      for (let i = 5; i >= 1; i--) {
        const w = 1.5 + i * 2.8;
        ctx.strokeStyle = `rgba(150,214,214,${(0.55 * Math.pow(1 - (i - 1) / 5, 1.4)).toFixed(3)})`;
        ctx.lineWidth = w; ctx.stroke(shape);
        ctx.strokeStyle = SEA;
        ctx.lineWidth = w - 0.9; ctx.stroke(shape);
      }
      ctx.fillStyle = '#342d25'; ctx.fill(shape);
      ctx.strokeStyle = 'rgba(242,228,200,0.8)'; ctx.lineWidth = 0.7; ctx.stroke(shape);
    }

    strokeGeo(tropics, 'rgba(224,105,87,0.42)', 0.8, [5, 4]);
    strokeGeo(equator, 'rgba(224,105,87,0.231)', 0.8);
    ctx.beginPath(); routes.forEach(g => path(g));
    ctx.strokeStyle = 'rgba(224,105,87,0.38)'; ctx.lineWidth = 0.8; ctx.setLineDash([]); ctx.stroke();
    strokeGeo(SPHERE, 'rgba(127,190,196,0.45)', 1);
    const rim = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rim.addColorStop(0.72, 'rgba(242,201,160,0)');
    rim.addColorStop(1, 'rgba(242,201,160,0.2)');
    ctx.fillStyle = rim;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
  }

  // Cada cuadro solo actualiza atributos: los elementos SVG se crean una vez.
  function render() {
    drawCarto();
    // En mapas pequeños solo se rotula el anillo de 10.000 km.
    const ringLabels = staticGeo.rings
      .filter(r => r.major && r.d < 20000 && (mapW >= 520 || r.d === 10000))
      .map(r => ({ r, pt: projection(r.labelLL) }))
      .filter(x => x.pt);
    gLabels.selectAll('text.ring-label').data(ringLabels).join('text').attr('class', 'ring-label')
      .attr('x', x => x.pt[0] + 6).attr('y', x => x.pt[1] - 4).text(x => (x.r.d / 1000) + '.000 km');
    const cardinals = staticGeo.cardinals.map(cd => ({ t: cd.t, pt: projection(cd.ll) })).filter(x => x.pt);
    gLabels.selectAll('text.spoke-label').data(cardinals).join('text').attr('class', 'spoke-label')
      .attr('x', x => x.pt[0] - 3).attr('y', x => x.pt[1] + 3).text(x => x.t);
    drawCities();
  }

  function drawCities() {
    const prio = { live: 0, next: 1, future: 2 };
    const placed = [];
    const dist = staticGeo.dist;
    const cp = projection([centerCity.lon, centerCity.lat]);
    const items = citySel.nodes().map(n => {
      const d = n.__data__;
      const pt = projection([d.lon, d.lat]);
      return { n, d, pt, vis: !!pt };
    }).filter(x => x.vis)
      .sort((a, b) => (prio[a.d.status] - prio[b.d.status]) || (dist.get(b.d) - dist.get(a.d)));

    items.forEach(({ n, d, pt }) => {
      const sel = d3.select(n);
      if (d === centerCity) { sel.style('display', 'none'); return; }
      sel.attr('transform', `translate(${pt[0]},${pt[1]})`).style('display', null);
      const label = sel.select('text');
      const nearCenter = cp && Math.hypot(pt[0] - cp[0], pt[1] - cp[1]) < 85;
      const clash = nearCenter || placed.some(p => Math.abs(p.x - pt[0]) < 64 && Math.abs(p.y - pt[1]) < 13);
      label.style('display', clash ? 'none' : null);
      if (!clash) placed.push({ x: pt[0], y: pt[1] });
    });
    const shown = new Set(items.map(x => x.n));
    citySel.nodes().forEach(n => { if (!shown.has(n)) d3.select(n).style('display', 'none'); });

    // El marcador del centro se mueve, no se recrea: así su latido no se reinicia.
    centerMark.style('display', cp ? null : 'none');
    if (cp) centerMark.attr('transform', `translate(${cp[0]},${cp[1]})`);
    centerTag.text('◉ ' + centerCity.name);
  }
  const centerMark = gCenter.append('g');
  centerMark.append('circle').attr('class', 'center-ring').attr('r', 16).attr('fill', 'none').attr('stroke', colors.live);
  centerMark.append('circle').attr('r', 4.5).attr('fill', colors.live);
  const centerTag = centerMark.append('text').attr('class', 'center-tag').attr('text-anchor', 'middle').attr('dy', 34);

  const citySel = gCities.selectAll('g.city-dot').data(cities).join(enter => {
    const g = enter.append('g').attr('class', 'city-dot')
      .attr('role', 'button')
      .attr('tabindex', 0)
      .attr('aria-label', d => `${d.name}, ${statusLabels[d.status]}. Recentrar el mapa.`);
    g.append('circle').attr('class', 'halo')
      .attr('r', d => d.status === 'live' ? 11 : 7)
      .attr('fill', 'none')
      .attr('stroke', d => colors[d.status])
      .attr('stroke-opacity', .45)
      .attr('stroke-dasharray', d => d.status === 'future' ? '2 3' : null);
    g.append('circle').attr('class', 'core')
      .attr('r', d => d.status === 'live' ? 4 : 3)
      .attr('fill', d => colors[d.status]);
    g.append('text').attr('class', 'city-name').attr('dx', 10).attr('dy', 3).text(d => d.name);
    g.on('click', (e, d) => recenter(d, { keyboard: e.detail === 0 }));
    g.on('keydown', (e, d) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        recenter(d, { keyboard: true });
      }
    });
    g.on('mouseenter', (e, d) => {
      hintEl.innerHTML = `<b>${d.name}</b> — ${fmtKm(distKm(centerCity, d))} del centro · toca para recentrar`;
    });
    g.on('mouseleave', () => { hintEl.textContent = HINT_DEFAULT; });
    return g;
  });

  function focusCenterHeading(keyboard = false) {
    const heading = document.getElementById('p-city');
    if (heading) heading.focus(keyboard ? undefined : { preventScroll: true });
  }

  function recenter(city, { keyboard = false } = {}) {
    if (city === centerCity) return;
    const from = projection.rotate();
    let to = rotateFor(city);
    let dLon = to[0] - from[0];
    while (dLon > 180) dLon -= 360; while (dLon < -180) dLon += 360;
    to = [from[0] + dLon, to[1]];
    centerCity = city;
    staticGeo = computeGeo(city);
    updatePanel();
    focusCenterHeading(keyboard);
    if (timer) timer.stop();
    azProj.precision(PRECISION);
    if (REDUCED) {
      projection.rotate(rotateFor(city));
      render();
      return;
    }
    const interp = d3.interpolateArray(from, to);
    azProj.precision(ANIM_PRECISION);
    timer = d3.timer(now => {
      const t = Math.min(1, now / 1000);
      projection.rotate(interp(d3.easeCubicInOut(t)));
      if (t < 1) { render(); return; }
      timer.stop();
      timer = null;
      azProj.precision(PRECISION);
      projection.rotate(rotateFor(city));
      render();
    });
  }
  const tabsByCity = {}; // recuerda tab por ciudad
  function renderFrame(city) {
    const frame = document.getElementById('p-frame');
    const tabs = document.getElementById('p-tabs');
    if (!city.video) {
      frame.innerHTML = `<div class="soon mono">${city.status === 'next' ? 'EN PRODUCCIÓN' : 'FUTURA RUTA'}</div>`;
      tabs.style.display = 'none';
      return;
    }
    tabs.style.display = '';
    const current = tabsByCity[city.name] || 'long';
    const vid = city.video[current];
    frame.innerHTML = `<img src="assets/atlas/poster-placeholder.svg" alt="Vista previa local del video de ${city.name}">
      <button type="button" class="play" aria-label="Reproducir video de ${city.name}"><span></span></button>`;
    frame.querySelector('.play').addEventListener('click', () => {
      frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=1&loop=1&playlist=${vid}&controls=1&playsinline=1&rel=0&modestbranding=1"
        allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="${current === 'long' ? 'Pieza larga' : 'Short'} de ${city.name}"></iframe>`;
    });
    tabs.innerHTML = '';
    [['long', 'Pieza larga'], ['short', 'Short']].forEach(([key, label]) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'btn-tab' + (key === current ? ' is-active' : '');
      t.setAttribute('aria-pressed', key === current ? 'true' : 'false');
      t.textContent = label;
      t.addEventListener('click', () => {
        tabsByCity[city.name] = key;
        renderFrame(city);
        tabs.querySelector(`[aria-pressed="true"]`)?.focus();
      });
      tabs.appendChild(t);
    });
  }

  function updatePanel() {
    const c = centerCity;
    document.getElementById('p-city').textContent = c.name;
    document.getElementById('p-sub').innerHTML =
      `${c.country} · ${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? 'N' : 'S'} ${Math.abs(c.lon).toFixed(2)}°${c.lon >= 0 ? 'E' : 'O'}` +
      (c.status !== 'live' ? ` · <b>${c.status === 'next' ? 'próxima' : 'futura'}</b>` : '');
    document.getElementById('hdr-proj').textContent = 'El mundo visto desde ' + c.name;
    document.getElementById('r-title').textContent = 'Desde ' + c.name + ', de cerca a lejos';
    renderFrame(c);
    const q = document.getElementById('p-quote');
    if (c.quote) { q.style.display = ''; q.innerHTML = `${c.quote}<span class="attrib">${c.attrib}</span>`; }
    else q.style.display = 'none';
    buildRuler();
  }

  function buildRuler() {
    const track = document.getElementById('r-track');
    track.innerHTML = '';
    cities.filter(c => c !== centerCity)
      .map(c => ({ c, d: distKm(centerCity, c) }))
      .sort((a, b) => a.d - b.d)
      .forEach(({ c, d }) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'dist-row';
        el.dataset.status = c.status;
        el.setAttribute('aria-label', `Recentrar en ${c.name}, a ${fmtKm(d)} de ${centerCity.name}`);
        el.innerHTML = `<span class="dot" aria-hidden="true"></span><span>${c.name}</span><span class="km">${fmtKm(d)}</span>`;
        el.addEventListener('click', (e) => recenter(c, { keyboard: e.detail === 0 }));
        track.appendChild(el);
      });
  }

  // boot
  sizeFit();
  azProj.rotate(rotateFor(centerCity));
  const graticule = d3.geoGraticule().step([15, 15])();
  const parallel = lat => ({ type: 'LineString', coordinates: d3.range(-180, 181, 3).map(l => [l, lat]) });
  const tropics = { type: 'MultiLineString', coordinates: [parallel(23.44).coordinates, parallel(-23.44).coordinates] };
  const equator = parallel(0);
  const origin = cities.find(c => c.status === 'live') || cities[0];
  const routes = cities.filter(c => c !== origin).map(c => ({
    type: 'LineString', coordinates: [[origin.lon, origin.lat], [c.lon, c.lat]]
  }));
  staticGeo = computeGeo(centerCity);
  updatePanel();

  function buildLand(topo) {
    land = topojson.feature(topo, topo.objects.land);
    document.getElementById('loading')?.remove();
  }
  const fallback = () => {
    document.getElementById('loading').textContent = 'Sin cartografía — mapa esquemático';
    render();
  };
  // La cartografía llega por <script> (sincrónica, sirve también en file://);
  // así el primer cuadro ya tiene costas y el morfismo desde el globo no parpadea.
  if (window.LAND_110M) {
    buildLand(window.LAND_110M);
  } else if (location.protocol !== 'file:') {
    fetch('assets/atlas/land-110m.json').then(r => r.json()).then(t => { buildLand(t); render(); }).catch(fallback);
  }

  // ===== MORFISMO GLOBO ⇄ ATLAS =====
  // El mismo mundo cambia de proyección: perspectiva vertical (la cámara de Three.js
  // del globo de la home, en su posición exacta de pantalla) mezclada con la
  // azimutal equidistante de este atlas.
  const MORPH_KEY = 'atlas-morph';
  const GEOM_KEY = 'globe-geom';
  const TILT_DEG = 0.65 * DEG; // inclinación máxima del globo de la home
  const azRaw = d3.geoAzimuthalEquidistantRaw;
  let morphT = 1, morphP = 2.9; // P = distancia de la cámara en radios terrestres
  // Lo que ve una cámara a P radios del centro: x = X / Z en el plano de imagen.
  const perspRaw = (l, p) => {
    const cosc = Math.cos(p) * Math.cos(l), z = morphP - cosc;
    return [Math.cos(p) * Math.sin(l) / z, Math.sin(p) / z];
  };
  const morphProj = d3.geoProjection((l, p) => {
    const a = perspRaw(l, p), b = azRaw(l, p);
    return [a[0] + (b[0] - a[0]) * morphT, a[1] + (b[1] - a[1]) * morphT];
  }).precision(ANIM_PRECISION); // menos vértices por cuadro durante el morfismo
  const overlays = [gLabels, gCities, gCenter];
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function readJSON(store, key) {
    try { return JSON.parse(store.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeJSON(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); } catch (e) { /* almacenamiento bloqueado */ }
  }

  // Un cuadro del morfismo: t = 0 globo, t = 1 atlas.
  function morphFrame(t, from) {
    const rect = mapEl.getBoundingClientRect();
    morphT = t;
    morphP = from.P;
    const limb = Math.acos(1 / from.P) * DEG;
    const endScale = azProj.scale(), endT = azProj.translate(), endR = azProj.rotate();
    let r0 = -from.lng; // vuelta más corta en longitud
    while (r0 - endR[0] > 180) r0 -= 360;
    while (r0 - endR[0] < -180) r0 += 360;
    morphProj
      .rotate([lerp(r0, endR[0], t), lerp(-from.lat, endR[1], t), 0])
      .scale(lerp(from.s, endScale, t))
      .translate([lerp(from.cx - rect.left, endT[0], t), lerp(from.cy - rect.top, endT[1], t)])
      .clipAngle(lerp(limb, 179.9, t));
    projection = morphProj;
    path.projection(morphProj);
    const o = overlayAlpha = smooth(0.5, 0.95, t);
    overlays.forEach(g => g.attr('opacity', o));
    render();
  }
  function endMorph() {
    morphT = 1;
    projection = azProj;
    path.projection(azProj);
    overlayAlpha = 1;
    overlays.forEach(g => g.attr('opacity', null));
    render();
  }
  function runMorph(from, dir, duration, done) {
    const t0 = performance.now();
    let finished = false;
    const finish = () => { if (!finished) { finished = true; done(); } };
    const step = now => {
      if (finished) return;
      const k = Math.min(1, (now - t0) / duration);
      const e = d3.easeCubicInOut(k);
      morphFrame(dir === 'open' ? e : 1 - e, from);
      if (k < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
    // Salida de seguridad: sin cuadros (pestaña en segundo plano) el atlas igual termina.
    setTimeout(finish, duration + 400);
  }

  // Llegada desde el globo: el primer cuadro reproduce el globo donde estaba.
  const arrival = readJSON(sessionStorage, MORPH_KEY);
  try { sessionStorage.removeItem(MORPH_KEY); } catch (e) { /* nada */ }
  if (arrival && arrival.dir === 'to-atlas' && Date.now() - arrival.at < 4000 && !REDUCED) {
    document.documentElement.classList.add('is-arriving');
    morphFrame(0, arrival);
    setTimeout(() => {
      document.documentElement.classList.add('is-arriving-run');
      runMorph(arrival, 'open', 1100, () => {
        endMorph();
        document.documentElement.classList.remove('is-arriving', 'is-arriving-run');
      });
    }, 16);
  } else {
    document.documentElement.classList.remove('is-arriving');
    render();
  }

  // Salida hacia el globo: el atlas se cierra en la esfera y la home la retoma.
  document.querySelectorAll('a[href="index.html"]').forEach(link => {
    link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const target = 'index.html?city=' + encodeURIComponent(centerCity.id);
      const lat = Math.max(-TILT_DEG, Math.min(TILT_DEG, centerCity.lat));
      writeJSON(sessionStorage, MORPH_KEY, { dir: 'to-globe', city: centerCity.id, at: Date.now() });
      if (REDUCED) { location.href = target; return; }
      const rect = mapEl.getBoundingClientRect();
      const g = readJSON(sessionStorage, GEOM_KEY);
      const fits = g && Math.abs(g.vw - innerWidth) < 3 && Math.abs(g.vh - innerHeight) < 3;
      const P = fits ? g.P : 2.9;
      const to = {
        lng: centerCity.lon, lat, P,
        cx: fits ? g.cx : rect.left + rect.width / 2,
        cy: fits ? g.cy : rect.top + rect.height / 2,
        // escala focal: el disco visible mide s · tan(asin(1/P))
        s: fits ? g.s : Math.min(rect.width, rect.height) * 0.4 / Math.tan(Math.asin(1 / P))
      };
      if (timer) { timer.stop(); timer = null; azProj.precision(PRECISION); }
      document.documentElement.classList.add('is-leaving');
      runMorph(to, 'close', 850, () => { location.href = target; });
    });
  });

  // Volver con «atrás» restaura la página desde la caché tal como se fue (cerrada en
  // la esfera): se abre de nuevo sin morfismo.
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    document.documentElement.classList.remove('is-leaving', 'is-arriving', 'is-arriving-run');
    endMorph();
  });

  // Un render por cuadro como máximo al redimensionar.
  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      sizeFit();
      if (projection === azProj) render();
    });
  });
})();
