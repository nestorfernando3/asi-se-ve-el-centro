/* Atlas relativo — render e interacción.
   Requiere: d3, topojson, AtlasGeo, ATLAS_CITIES (cargados antes). */
(function () {
  const { R_EARTH, DEG, distKm, destPt, fmtKm } = window.AtlasGeo;
  const cities = window.ATLAS_CITIES;
  const colors = { live: '#b83e29', next: '#1d150c', future: '#155e6b' };
  const statusLabels = { live: 'viva', next: 'próxima', future: 'futura' };
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let centerCity = cities[0];
  let land = null;
  let staticGeo = null;
  let timer = null;

  const mapEl = document.getElementById('map');
  const hintEl = document.getElementById('hint');
  const HINT_DEFAULT = hintEl.textContent;
  const svg = d3.select('#svg');
  const projection = d3.geoAzimuthalEquidistant().precision(0.5);
  const path = d3.geoPath(projection);

  const gSpokes = svg.append('g');
  const gRings  = svg.append('g');
  const gLand   = svg.append('g');
  const gSphere = svg.append('g');
  const gCities = svg.append('g');
  const gCenter = svg.append('g');

  function sizeFit() {
    const w = mapEl.clientWidth, h = mapEl.clientHeight;
    svg.attr('viewBox', `0 0 ${w} ${h}`);
    projection.translate([w / 2, h / 2]).scale(Math.min(w, h) * 0.94 / (2 * Math.PI));
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
    staticGeo.rings.forEach(r => {
      gRings.append('path').attr('d', path(r.geo)).attr('class', 'ring' + (r.major ? ' major' : ''));
      if (r.major) {
        const pt = projection(destPt(centerCity.lon, centerCity.lat, 90, r.d / R_EARTH));
        if (pt) gRings.append('text').attr('class', 'ring-label')
          .attr('x', pt[0] + 6).attr('y', pt[1] - 4).text((r.d / 1000) + '.000 km');
      }
    });
    gSpokes.selectAll('*').remove();
    staticGeo.spokes.forEach(s => gSpokes.append('path').attr('d', path(s)).attr('class', 'spoke'));
    staticGeo.cardinals.forEach(cd => {
      const pt = projection(cd.ll);
      if (pt) gSpokes.append('text').attr('class', 'spoke-label').attr('x', pt[0] - 3).attr('y', pt[1] + 3).text(cd.t);
    });
    if (land) gLand.select('path').attr('d', path(land));
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
      t.className = 'tab' + (key === current ? ' active' : '');
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
    document.getElementById('r-title').textContent = 'Distancias desde ' + c.name + ' — km reales, de cerca a lejos';
    renderFrame(c);
    const q = document.getElementById('p-quote');
    if (c.quote) { q.style.display = ''; q.innerHTML = `${c.quote}<span class="attrib">${c.attrib}</span>`; }
    else q.style.display = 'none';
    let nearest = null, nd = Infinity;
    cities.forEach(o => { if (o !== c) { const d = distKm(c, o); if (d < nd) { nd = d; nearest = o; } } });
    document.getElementById('p-meta').innerHTML =
      `<div>Estado <span>${c.status === 'live' ? '● viva — 2 piezas' : c.status === 'next' ? 'próxima — en producción' : 'futura ruta'}</span></div>
       <div>Ciudad más cercana <span>${nearest.name} · ${fmtKm(nd)}</span></div>`;
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
        el.className = 'r-chip';
        el.setAttribute('aria-label', `Recentrar en ${c.name}, a ${fmtKm(d)} de ${centerCity.name}`);
        el.innerHTML = `<i style="background:${colors[c.status]}"></i><b>${c.name}</b> ${fmtKm(d)}`;
        el.addEventListener('click', (e) => recenter(c, { keyboard: e.detail === 0 }));
        track.appendChild(el);
      });
  }

  // boot
  sizeFit();
  projection.rotate(rotateFor(centerCity));
  gSphere.append('path').attr('class', 'sphere');
  staticGeo = computeGeo(centerCity);
  updatePanel();

  fetch('assets/atlas/land-110m.json')
    .then(r => r.json())
    .then(topo => {
      land = topojson.feature(topo, topo.objects.land);
      gLand.append('path').attr('class', 'land');
      document.getElementById('loading').remove();
      render();
    })
    .catch(() => {
      document.getElementById('loading').textContent = 'Sin cartografía — mapa esquemático';
      render();
    });

  window.addEventListener('resize', () => { sizeFit(); render(); });
})();
