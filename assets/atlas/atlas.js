/* Atlas relativo — render e interacción.
   Requiere: d3, topojson, AtlasGeo, ATLAS_CITIES (cargados antes). */
(function () {
  const { R_EARTH, DEG, distKm, destPt, fmtKm } = window.AtlasGeo;
  const cities = window.ATLAS_CITIES;
  const colors = { live: '#c1442a', next: '#1d150c', future: '#155e6b' };
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

  /* [T6] computeGeo + render */

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
      .attr('aria-label', d => `${d.name}, ${d.status}. Recentrar el mapa.`);
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
    g.on('click', (e, d) => recenter(d));
    g.on('keydown', (e, d) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        recenter(d);
      }
    });
    g.on('mouseenter', (e, d) => {
      hintEl.innerHTML = `<b>${d.name}</b> — ${fmtKm(distKm(centerCity, d))} del centro · toca para recentrar`;
    });
    g.on('mouseleave', () => { hintEl.textContent = HINT_DEFAULT; });
    return g;
  });

  /* [T7] recenter */
  /* [T8] panel + video */
  /* [T9] ruler */

  // boot
  sizeFit();
  projection.rotate(rotateFor(centerCity));
  gSphere.append('path').attr('class', 'sphere');
  /* [T6-boot] staticGeo + updatePanel + render inicial */

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
