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
  const azProj = d3.geoAzimuthalEquidistant().precision(0.5);
  let projection = azProj;           // durante el morfismo se cambia por morphProj
  const path = d3.geoPath(projection);

  const gSea    = svg.append('g');
  const gSpokes = svg.append('g');
  const gRings  = svg.append('g');
  const gLand   = svg.append('g');
  const gSphere = svg.append('g');
  const gLabels = svg.append('g'); // rótulos de anillos, por encima de la tierra
  const gCities = svg.append('g');
  const gCenter = svg.append('g');

  function sizeFit() {
    const w = mapEl.clientWidth, h = mapEl.clientHeight;
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    azProj.translate([w / 2, h / 2]).scale(Math.min(w, h) * 0.94 / (2 * Math.PI));
  }
  const rotateFor = (c) => [-c.lon, -c.lat];

  function computeGeo(c) {
    const rings = [], spokes = [], cardinals = [];
    for (let d = 2500; d <= 20000; d += 2500) {
      rings.push({ geo: d3.geoCircle().center([c.lon, c.lat]).radius((d / R_EARTH) * DEG)(), d, major: d % 5000 === 0 });
    }
    for (let b = 0; b < 360; b += 30) {
      const coords = [];
      for (let f = 0; f <= 40; f++) coords.push(destPt(c.lon, c.lat, b, (f / 40) * Math.PI));
      spokes.push({ type: 'LineString', coordinates: coords });
    }
    [['N', 0], ['E', 90], ['S', 180], ['O', 270]].forEach(([t, b]) => {
      cardinals.push({ t, ll: destPt(c.lon, c.lat, b, Math.PI * 0.965) });
    });
    return { rings, spokes, cardinals };
  }

  function render() {
    gRings.selectAll('*').remove();
    gLabels.selectAll('*').remove();
    staticGeo.rings.forEach(r => {
      gRings.append('path').attr('d', path(r.geo)).attr('class', 'ring' + (r.major ? ' major' : ''));
      // En mapas pequeños solo se rotula el anillo de 10.000 km.
      if (r.major && r.d < 20000 && (mapEl.clientWidth >= 520 || r.d === 10000)) {
        const pt = projection(destPt(centerCity.lon, centerCity.lat, 90, r.d / R_EARTH));
        if (pt) gLabels.append('text').attr('class', 'ring-label')
          .attr('x', pt[0] + 6).attr('y', pt[1] - 4).text((r.d / 1000) + '.000 km');
      }
    });
    gSpokes.selectAll('*').remove();
    staticGeo.spokes.forEach(s => gSpokes.append('path').attr('d', path(s)).attr('class', 'spoke'));
    staticGeo.cardinals.forEach(cd => {
      const pt = projection(cd.ll);
      if (pt) gSpokes.append('text').attr('class', 'spoke-label').attr('x', pt[0] - 3).attr('y', pt[1] + 3).text(cd.t);
    });
    gSea.select('path').attr('d', path({ type: 'Sphere' }));
    if (land) gLand.selectAll('path').attr('d', path(land));
    gSphere.select('path').attr('d', path({ type: 'Sphere' }));
    drawCities();
  }

  function drawCities() {
    const prio = { live: 0, next: 1, future: 2 };
    const placed = [];
    const items = citySel.nodes().map(n => {
      const d = n.__data__;
      const pt = projection([d.lon, d.lat]);
      return { n, d, pt, vis: !!pt };
    }).filter(x => x.vis)
      .sort((a, b) => (prio[a.d.status] - prio[b.d.status]) || (distKm(centerCity, b.d) - distKm(centerCity, a.d)));

    items.forEach(({ n, d, pt }) => {
      const sel = d3.select(n);
      if (d === centerCity) { sel.style('display', 'none'); return; }
      sel.attr('transform', `translate(${pt[0]},${pt[1]})`).style('display', null);
      const label = sel.select('text');
      const cp = projection([centerCity.lon, centerCity.lat]);
      const nearCenter = cp && Math.hypot(pt[0] - cp[0], pt[1] - cp[1]) < 85;
      const clash = nearCenter || placed.some(p => Math.abs(p.x - pt[0]) < 64 && Math.abs(p.y - pt[1]) < 13);
      label.style('display', clash ? 'none' : null);
      if (!clash) placed.push({ x: pt[0], y: pt[1] });
    });
    citySel.nodes().forEach(n => {
      if (!projection([n.__data__.lon, n.__data__.lat])) d3.select(n).style('display', 'none');
    });

    gCenter.selectAll('*').remove();
    const cp = projection([centerCity.lon, centerCity.lat]);
    if (cp) {
      const g = gCenter.append('g').attr('transform', `translate(${cp[0]},${cp[1]})`);
      g.append('circle').attr('class', 'center-ring').attr('r', 16).attr('fill', 'none').attr('stroke', colors.live);
      g.append('circle').attr('r', 4.5).attr('fill', colors.live);
      g.append('text').attr('class', 'center-tag').attr('text-anchor', 'middle').attr('dy', 34).text('◉ ' + centerCity.name);
    }
  }

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
    if (REDUCED) {
      projection.rotate(rotateFor(city));
      render();
      return;
    }
    const interp = d3.interpolateArray(from, to);
    timer = d3.timer(now => {
      const t = Math.min(1, now / 1000);
      projection.rotate(interp(d3.easeCubicInOut(t)));
      render();
      if (t >= 1) {
        timer.stop();
        projection.rotate(rotateFor(city));
        render();
      }
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
  gSphere.append('path').attr('class', 'sphere');
  gSea.append('path').attr('class', 'sea');
  staticGeo = computeGeo(centerCity);
  updatePanel();

  function buildLand(topo) {
    land = topojson.feature(topo, topo.objects.land);
    // Líneas de agua: anillos que se alejan de la costa, recortados con el color del mar.
    for (let i = 5; i >= 1; i--) {
      const w = 1.5 + i * 2.8;
      gLand.append('path').attr('class', 'wl').attr('stroke-width', w)
        .attr('stroke-opacity', (0.55 * Math.pow(1 - (i - 1) / 5, 1.4)).toFixed(3));
      gLand.append('path').attr('class', 'wl-cut').attr('stroke-width', w - 0.9);
    }
    gLand.append('path').attr('class', 'land');
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
  }).precision(0.5);
  const overlays = [gSpokes, gRings, gLabels, gCities, gCenter];
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
    const o = smooth(0.55, 1, t);
    overlays.forEach(g => g.attr('opacity', o));
    render();
  }
  function endMorph() {
    morphT = 1;
    projection = azProj;
    path.projection(azProj);
    overlays.forEach(g => g.attr('opacity', null));
    render();
  }
  function runMorph(from, dir, duration, done) {
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / duration);
      const e = d3.easeCubicInOut(k);
      morphFrame(dir === 'open' ? e : 1 - e, from);
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  }

  // Llegada desde el globo: el primer cuadro reproduce el globo donde estaba.
  const arrival = readJSON(sessionStorage, MORPH_KEY);
  try { sessionStorage.removeItem(MORPH_KEY); } catch (e) { /* nada */ }
  if (arrival && arrival.dir === 'to-atlas' && Date.now() - arrival.at < 4000 && !REDUCED) {
    document.documentElement.classList.add('is-arriving');
    morphFrame(0, arrival);
    requestAnimationFrame(() => {
      document.documentElement.classList.add('is-arriving-run');
      runMorph(arrival, 'open', 1500, () => {
        endMorph();
        document.documentElement.classList.remove('is-arriving', 'is-arriving-run');
      });
    });
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
      if (timer) timer.stop();
      document.documentElement.classList.add('is-leaving');
      runMorph(to, 'close', 1100, () => { location.href = target; });
    });
  });

  window.addEventListener('resize', () => { sizeFit(); if (projection === azProj) render(); });
})();
