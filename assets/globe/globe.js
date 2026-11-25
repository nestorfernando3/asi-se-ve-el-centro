/* Globo de la home: visor, pines, Three.js, morfismo con el atlas.
   Requiere: THREE, topojson, LAND_110M, AtlasGeo, ATLAS_CITIES, CityVideo. */
(() => {
  // ========== CITY REGISTRY ==========
  // Fuente única compartida con el atlas relativo: assets/atlas/cities.js
  const { distKm, fmtKm } = window.AtlasGeo;
  const cityRegistry = window.ATLAS_CITIES.map(c => ({
    id: c.id, name: c.name, country: c.country, lat: c.lat, lng: c.lon, status: c.status,
    description: c.quote || '', author: c.attrib || '',
    video: c.video || null, poster: c.poster || null, credits: c.credits || null
  }));
  const { STATUS_LABEL, MORPH_KEY, GEOM_KEY } = window.AtlasShared;
  const saveJSON = AtlasShared.writeSession;
  const kmBetween = (a, b) => distKm({ lat: a.lat, lon: a.lng }, { lat: b.lat, lon: b.lng });
  const pieceCount = c => c.video ? Object.keys(c.video).length : 0;
  const origin = cityRegistry.find(c => c.status === 'live') || cityRegistry[0];

  // ========== VISOR DE CIUDAD ==========
  // Visor común con el atlas (assets/atlas/video.js): póster local y Reproducir;
  // YouTube no recibe ninguna petición hasta ese clic.
  const stage = document.querySelector('main');
  const viewerShell = document.querySelector('.viewer');
  const viewerSlate = viewerShell.querySelector('.slate');
  const videoSlot = viewerShell.querySelector('.video-slot');
  const slateTitle = viewerSlate.querySelector('.slate-title');
  const slateMeta = viewerSlate.querySelector('.slate-meta');
  const noteTitle = document.querySelector('[data-note-title]');
  const noteCopy = document.querySelector('[data-note-copy]');
  const noteAuthor = document.querySelector('[data-note-author]');
  const noteDistance = document.querySelector('[data-note-distance]');
  const viewerQuote = document.querySelector('[data-viewer-quote]');
  const viewerCredit = document.querySelector('[data-viewer-credit]');
  const activeCityLabel = document.querySelector('[data-active-city-label]');
  const reelSwitch = document.querySelector('.reel-switch');
  const cityRail = viewerShell.querySelector('.dist-list');
  const railTitle = document.querySelector('[data-rail-title]');
  const pinHost = document.querySelector('.pin-layer');

  function pinLabel(city, more) {
    const base = city.name + ', ' + STATUS_LABEL[city.status];
    if (!more) return base;
    return base + ', con ' + more + (more === 1 ? ' ciudad cercana' : ' ciudades cercanas') + ': elegir una';
  }

  // Pines generados desde el registro: una ciudad nueva en cities.js aparece sola.
  cityRegistry.forEach(city => {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'city-pin is-' + city.status;
    pin.dataset.cityId = city.id;
    pin.setAttribute('aria-label', pinLabel(city, 0));
    pin.innerHTML = '<span class="pin-name"></span><span class="pin-more" aria-hidden="true"></span>';
    // Visible y enfocable solo cuando el globo lo pone de frente (ver placePins).
    pin.style.opacity = '0';
    pin.inert = true;
    pin.tabIndex = -1;
    pinHost.appendChild(pin);
  });

  let activeCityId = 'barranquilla';
  let shownCityId = null;

  function cityById(cityId) {
    return cityRegistry.find(c => c.id === cityId);
  }

  function cityPosterVars(cityId) {
    const palettes = {
      barranquilla: ['rgba(214,74,40,0.26)', 'rgba(127,160,175,0.44)'],
      bogota: ['rgba(92,147,139,0.22)', 'rgba(241,245,248,0.28)'],
      medellin: ['rgba(92,147,139,0.26)', 'rgba(127,160,175,0.32)'],
      cali: ['rgba(127,160,175,0.22)', 'rgba(214,74,40,0.32)'],
      cartagena: ['rgba(127,160,175,0.28)', 'rgba(92,147,139,0.24)'],
      lima: ['rgba(145,157,167,0.26)', 'rgba(92,147,139,0.24)'],
      cdmx: ['rgba(214,74,40,0.18)', 'rgba(127,160,175,0.36)'],
      nyc: ['rgba(92,147,139,0.18)', 'rgba(241,245,248,0.28)'],
      londres: ['rgba(92,147,139,0.22)', 'rgba(145,157,167,0.28)'],
      paris: ['rgba(127,160,175,0.18)', 'rgba(241,245,248,0.24)'],
      barcelona: ['rgba(214,74,40,0.2)', 'rgba(127,160,175,0.34)'],
      dakar: ['rgba(127,160,175,0.28)', 'rgba(214,74,40,0.2)'],
      mumbai: ['rgba(214,74,40,0.22)', 'rgba(92,147,139,0.24)'],
      tokio: ['rgba(92,147,139,0.2)', 'rgba(214,74,40,0.28)'],
      sydney: ['rgba(92,147,139,0.26)', 'rgba(241,245,248,0.22)'],
      'kansas-city': ['rgba(127,160,175,0.22)', 'rgba(145,157,167,0.3)'],
      dublin: ['rgba(92,147,139,0.28)', 'rgba(241,245,248,0.2)'],
      rome: ['rgba(214,74,40,0.24)', 'rgba(127,160,175,0.32)']
    };
    return palettes[cityId] || palettes.barranquilla;
  }

  function updateSlate(cityId) {
    const city = cityById(cityId);
    if (!city) return;
    const posterVars = cityPosterVars(cityId);
    slateTitle.textContent = city.name + ' queda en espera.';
    slateMeta.textContent = city.status === 'next' ? 'En producción' : 'Ruta futura';
    activeCityLabel.textContent = city.name;
    noteTitle.textContent = city.name;
    noteDistance.textContent = city === origin
      ? 'Ciudad origen · ' + pieceCount(city) + ' piezas'
      : fmtKm(kmBetween(origin, city)) + ' desde ' + origin.name + ' · ' + STATUS_LABEL[city.status];
    noteCopy.textContent = city.description;
    noteAuthor.textContent = city.author;
    viewerQuote.textContent = city.description;
    if (city.author) {
      const attrib = document.createElement('span');
      attrib.className = 'attrib';
      attrib.textContent = city.author;
      viewerQuote.appendChild(attrib);
    }
    viewerQuote.hidden = !city.description;
    viewerSlate.style.setProperty('--poster-glow', posterVars[0]);
    viewerSlate.style.setProperty('--poster-core', posterVars[1]);
    viewerShell.classList.toggle('has-videos', CityVideo.render(videoSlot, reelSwitch, city, { creditEl: viewerCredit }));
    renderRuler(city);
    updatePinNames(city);
    updateActiveControls(cityId);
    shownCityId = cityId;
  }

  // Cada pin muestra su distancia real a la ciudad elegida.
  function updatePinNames(from) {
    pinHost.querySelectorAll('.city-pin').forEach(pin => {
      const c = cityById(pin.dataset.cityId);
      pin.querySelector('.pin-name').textContent = c === from ? c.name : c.name + ' · ' + fmtKm(kmBetween(from, c));
    });
  }

  function updateActiveControls(cityId) {
    pinHost.querySelectorAll('.city-pin').forEach(pin => {
      pin.classList.toggle('is-selected', pin.dataset.cityId === cityId);
    });
    cityRail.querySelectorAll('.dist-row').forEach(row => {
      row.classList.toggle('is-active', row.dataset.cityId === cityId);
    });
  }

  // Regla de distancias: el resto del atlas, de cerca a lejos desde la ciudad elegida.
  function renderRuler(from) {
    railTitle.textContent = 'Desde ' + from.name + ', de cerca a lejos';
    AtlasShared.renderDistanceList(cityRail, from, cityRegistry, {
      dist: c => kmBetween(from, c),
      fmt: fmtKm,
      label: (c, d) => c.name + ', ' + STATUS_LABEL[c.status] + ', a ' + fmtKm(d) + ' de ' + from.name,
      onPick: c => selectCity(c.id)
    });
  }

  function selectCity(cityId) {
    const city = cityById(cityId);
    if (!city) return;
    if (globeReady) closePinMenu(false);
    activeCityId = cityId;
    // Volver a elegir la ciudad que ya está en el visor no corta su pieza.
    if (shownCityId !== cityId) updateSlate(cityId);
    if (!globeReady) return; // sin WebGL no hay globo que girar
    focusGlobeOn(city);
    needsRender = true; // la elegida encabeza su grupo de pines
  }

  // Un pin solo elige su ciudad; un pin agrupado abre la lista de las que reúne.
  pinHost.querySelectorAll('.city-pin').forEach((pin, i) => {
    pin.addEventListener('click', () => {
      const group = pinGroups[i];
      if (group && group.length > 1) {
        if (menuSeed === i) closePinMenu(true);
        else openPinMenu(i);
      } else {
        selectCity(pin.dataset.cityId);
      }
    });
  });

  updateSlate(activeCityId);

  // ========== 3D GLOBE ==========
  // Sin WebGL (equipos viejos, GPU bloqueada) el globo no se puede dibujar: se dice
  // y se ofrece el atlas relativo, que es 2D. Visor y lista siguen funcionando.
  const canWebGL = (() => {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  })();
  let globeReady = false;
  if (!canWebGL || !window.THREE) {
    const box = document.getElementById('globe-container');
    box.innerHTML = '<p class="globe-fallback">Este navegador no puede dibujar el globo. ' +
      '<a href="atlas-relativo.html">Abre el atlas relativo</a>: es el mismo mundo, en plano.</p>';
    document.documentElement.classList.remove('is-arriving');
    return;
  }
  globeReady = true;

  const container = document.getElementById('globe-container');
  const pinLayer = document.querySelector('.pin-layer');

  const w = container.clientWidth || 600;
  const h = container.clientHeight || 500;
  const R = 5;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  // Distancia de cámara que deja entrar el globo y su halo en cualquier proporción.
  function fitCamera(aspect) {
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, (R * 1.2) / (half * Math.min(1, aspect)));
  }
  fitCamera(w / h);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);
  if (!document.documentElement.classList.contains('is-arriving')) renderer.domElement.classList.add('is-born');
  // Solo se repinta cuando algo cambió: en reposo el globo no gasta GPU ni batería.
  let needsRender = true;

  // Luz cálida de farol desde arriba a la izquierda, contraluz marino detrás.
  const ambientLight = new THREE.AmbientLight(0xbfd6dc, 0.42);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffe4c4, 0.95);
  dirLight.position.set(-6, 4, 7);
  scene.add(dirLight);
  const warmLight = new THREE.DirectionalLight(0x4f9aa6, 0.55);
  warmLight.position.set(7, -2, -3);
  scene.add(warmLight);

  // ===== Carta náutica nocturna — costas reales de Natural Earth =====
  // Mar profundo, costas en tinta clara y líneas de agua (waterlining)
  // que se alejan de la orilla, como en las cartas grabadas del siglo XIX.
  const landFeature = (window.topojson && window.LAND_110M)
    ? topojson.feature(window.LAND_110M, window.LAND_110M.objects.land)
    : null;

  function lx(lng, w) { return (lng + 180) / 360 * w; }
  function ly(lat, h) { return (90 - lat) / 180 * h; }

  function landPath(w, h) {
    const p = new Path2D();
    if (!landFeature) return p;
    const polys = [];
    landFeature.features.forEach(f => {
      const g = f.geometry;
      if (!g) return;
      if (g.type === 'Polygon') polys.push(g.coordinates);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(c => polys.push(c));
    });
    // Los anillos que cruzan el antimeridiano (Fiyi, Chukotka) se desenrollan
    // y se dibujan también desplazados 360°; los casquetes polares
    // (Antártida) se cierran por el polo.
    polys.forEach(rings => rings.forEach(ring => {
      const pts = [];
      let prev = null, offset = 0;
      ring.forEach(([lng, lat]) => {
        if (prev !== null) {
          const d = lng + offset - prev;
          if (d > 180) offset -= 360;
          else if (d < -180) offset += 360;
        }
        prev = lng + offset;
        pts.push([prev, lat]);
      });
      const net = pts[pts.length - 1][0] - pts[0][0];
      if (Math.abs(net) > 180) {
        const pole = pts.reduce((a, q) => a + q[1], 0) < 0 ? -90 : 90;
        pts.push([pts[pts.length - 1][0], pole], [pts[0][0], pole]);
      }
      let min = Infinity, max = -Infinity;
      pts.forEach(q => { min = Math.min(min, q[0]); max = Math.max(max, q[0]); });
      [-360, 0, 360].forEach(shift => {
        if (max + shift < -180 || min + shift > 180) return;
        pts.forEach((q, i) => {
          const x = lx(q[0] + shift, w), y = ly(q[1], h);
          i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
        });
        p.closePath();
      });
    }));
    return p;
  }

  // Ruido determinista: el grano no cambia entre recargas.
  function rng(seed) {
    return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  }

  // Grano en mosaico: unos miles de puntos en una tesela de 512 px, repetida por
  // patrón. Antes eran millones de fillRect y la vuelta a la home tardaba segundos.
  function grainTile(seed, count, colors, size) {
    const t = document.createElement('canvas');
    t.width = t.height = 512;
    const g = t.getContext('2d');
    const r = rng(seed);
    for (let n = 0; n < count; n++) {
      g.fillStyle = colors(r);
      g.fillRect(r() * 512, r() * 512, size, size);
    }
    return t;
  }

  function generateArtisticTexture(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const k = w / 4096; // escala de trazos
    const land = landPath(w, h);

    // 1. Mar: azul petróleo, más claro en el trópico.
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, '#07131b');
    sea.addColorStop(0.36, '#0d2a35');
    sea.addColorStop(0.5, '#113340');
    sea.addColorStop(0.64, '#0d2a35');
    sea.addColorStop(1, '#07131b');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);

    // 2. Retícula fina sobre el mar.
    ctx.strokeStyle = 'rgba(160,205,212,0.07)';
    ctx.lineWidth = 1.2 * k;
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath(); ctx.moveTo(0, ly(lat, h)); ctx.lineTo(w, ly(lat, h)); ctx.stroke();
    }
    for (let lng = -165; lng <= 180; lng += 15) {
      ctx.beginPath(); ctx.moveTo(lx(lng, w), 0); ctx.lineTo(lx(lng, w), h); ctx.stroke();
    }

    // 3. Líneas de agua: anillos concéntricos que se desvanecen mar adentro.
    const wl = document.createElement('canvas');
    wl.width = w; wl.height = h;
    const wctx = wl.getContext('2d');
    wctx.lineJoin = 'round';
    const RINGS = 9;
    for (let i = RINGS; i >= 1; i--) {
      const width = (6 + i * 11) * k;
      const a = 0.6 * Math.pow(1 - (i - 1) / RINGS, 1.4);
      wctx.globalCompositeOperation = 'source-over';
      wctx.strokeStyle = `rgba(150,214,214,${a.toFixed(3)})`;
      wctx.lineWidth = width;
      wctx.stroke(land);
      wctx.globalCompositeOperation = 'destination-out';
      wctx.lineWidth = width - 3 * k;
      wctx.stroke(land);
    }
    ctx.drawImage(wl, 0, 0);

    // 4. Tierra: tinta tostada con grano de grabado.
    ctx.save();
    ctx.fillStyle = '#342d25';
    ctx.fill(land, 'evenodd');
    ctx.clip(land, 'evenodd');
    const relief = ctx.createLinearGradient(0, 0, 0, h);
    relief.addColorStop(0, 'rgba(214,201,176,0.20)');
    relief.addColorStop(0.5, 'rgba(160,112,72,0.16)');
    relief.addColorStop(1, 'rgba(214,201,176,0.22)');
    ctx.fillStyle = relief;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ctx.createPattern(grainTile(1903, 5600,
      r => r() > 0.5 ? 'rgba(236,214,176,0.07)' : 'rgba(10,8,6,0.12)', 1.6), 'repeat');
    ctx.fillRect(0, 0, w, h);
    // Sombreado oblicuo (hachura) muy suave.
    ctx.strokeStyle = 'rgba(236,214,176,0.05)';
    ctx.lineWidth = 1.4 * k;
    for (let x = -h; x < w; x += 9 * k) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke();
    }
    // Retícula en tinta oscura sobre tierra.
    ctx.strokeStyle = 'rgba(8,10,10,0.22)';
    ctx.lineWidth = 1.2 * k;
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath(); ctx.moveTo(0, ly(lat, h)); ctx.lineTo(w, ly(lat, h)); ctx.stroke();
    }
    for (let lng = -165; lng <= 180; lng += 15) {
      ctx.beginPath(); ctx.moveTo(lx(lng, w), 0); ctx.lineTo(lx(lng, w), h); ctx.stroke();
    }
    ctx.restore();

    // 5. Línea de costa en tinta clara.
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(242,228,200,0.82)';
    ctx.lineWidth = 2.4 * k;
    ctx.stroke(land);

    // 6. Ecuador y trópicos en rojo de imprenta, punteados.
    ctx.setLineDash([14 * k, 10 * k]);
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = 'rgba(224,105,87,0.42)';
    [23.44, -23.44].forEach(lat => {
      ctx.beginPath(); ctx.moveTo(0, ly(lat, h)); ctx.lineTo(w, ly(lat, h)); ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(224,105,87,0.5)';
    ctx.lineWidth = 2.4 * k;
    ctx.beginPath(); ctx.moveTo(0, ly(0, h)); ctx.lineTo(w, ly(0, h)); ctx.stroke();

    // 7. Grano de película sobre todo el mapa.
    ctx.fillStyle = ctx.createPattern(grainTile(7, 3800,
      r => `rgba(255,255,255,${(r() * 0.035).toFixed(3)})`, 1.5), 'repeat');
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  // Rótulos aparte: si la fuente llega tarde, se repintan solo ellos sobre la base.
  function drawChartLabels(ctx, w, h) {
    const k = w / 4096;
    // Convención de carta: agua en cursiva (mares), líneas y tierra en versalitas.
    function label(text, lng, lat, size, color, spacing, italic = true) {
      ctx.save();
      ctx.font = italic
        ? `italic 400 ${size * k}px "IM Fell English", Georgia, serif`
        : `400 ${size * k}px "IM Fell English SC", Georgia, serif`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * k}px`;
      ctx.fillText(text, lx(lng, w), ly(lat, h));
      ctx.restore();
    }
    const seaInk = 'rgba(176,222,222,0.46)';
    label('Mar Caribe', -73, 14.6, 30, seaInk, 6);
    label('Océano Atlántico', -38, 26, 46, seaInk, 14);
    label('Océano Pacífico', -122, 4, 50, seaInk, 16);
    label('Océano Pacífico', 152, 18, 50, seaInk, 16);
    label('Océano Índico', 78, -22, 46, seaInk, 14);
    label('Golfo de México', -90, 24.6, 22, seaInk, 4);
    label('Mediterráneo', 18, 35.2, 20, seaInk, 4);
    const redInk = 'rgba(224,105,87,0.62)';
    label('Trópico de Cáncer', -48, 24.7, 22, redInk, 8, false);
    label('Trópico de Cáncer', 150, 24.7, 22, redInk, 8, false);
    label('Ecuador', -26, 1.4, 22, redInk, 12, false);
    label('Ecuador', 96, 1.4, 22, redInk, 12, false);
    label('Trópico de Capricornio', -12, -22.2, 22, redInk, 8, false);

  }

  const maxTex = renderer.capabilities.maxTextureSize || 4096;
  // 4096 px bastan: el globo nunca muestra más de media textura en pantalla.
  const TEX_W = Math.min(4096, maxTex);
  const baseCanvas = generateArtisticTexture(TEX_W, TEX_W / 2);
  const texCanvas = document.createElement('canvas');
  texCanvas.width = TEX_W; texCanvas.height = TEX_W / 2;
  const texCtx = texCanvas.getContext('2d');
  function paintTexture() {
    texCtx.drawImage(baseCanvas, 0, 0);
    drawChartLabels(texCtx, TEX_W, TEX_W / 2);
  }
  paintTexture();
  const tex = new THREE.CanvasTexture(texCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Los rótulos usan IM Fell: se redibujan cuando la fuente termina de cargar.
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('italic 400 40px "IM Fell English"'),
      document.fonts.load('400 40px "IM Fell English SC"')
    ]).then(() => {
      paintTexture();
      tex.needsUpdate = true;
      needsRender = true;
    }).catch(() => {});
  }

  const globeMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.0,
    emissive: new THREE.Color(0x0b2630),
    emissiveIntensity: 0.35
  });
  const globeGeom = new THREE.SphereGeometry(R, 96, 96);
  const globe = new THREE.Mesh(globeGeom, globeMat);
  scene.add(globe);

  // Atmósfera: halo exterior y borde luminoso sobre la esfera (fresnel).
  const haloMat = new THREE.ShaderMaterial({
    uniforms: { glow: { value: new THREE.Color(0x5fb0b4) }, strength: { value: 1 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 glow; uniform float strength; varying vec3 vN; void main(){ float i = pow(max(0.0, 0.66 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.2); gl_FragColor = vec4(glow, 1.0) * i * 0.75 * strength; }',
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 64, 64), haloMat);
  scene.add(glow);
  const rimMat = new THREE.ShaderMaterial({
    uniforms: { rim: { value: new THREE.Color(0xf2c9a0) }, strength: { value: 1 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 rim; uniform float strength; varying vec3 vN; void main(){ float f = pow(1.0 - max(0.0, dot(vN, vec3(0.0, 0.0, 1.0))), 3.5); gl_FragColor = vec4(rim, f * 0.55 * strength); }',
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.003, 96, 96), rimMat));

  // Screen-readable graticule on top of texture.
  const gridGroup = new THREE.Group();
  const gridMat = new THREE.LineBasicMaterial({
    color: 0xd9edf7,
    transparent: true,
    opacity: 0.06,
    depthWrite: false
  });
  const accentGridMat = new THREE.LineBasicMaterial({
    color: 0xe06957,
    transparent: true,
    opacity: 0.32,
    depthWrite: false
  });

  function pointOnSphere(lat, lng, radius) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  function addLatitude(lat, material) {
    const pts = [];
    for (let lng = -180; lng <= 180; lng += 4) pts.push(pointOnSphere(lat, lng, R * 1.004));
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
  }

  function addLongitude(lng, material) {
    const pts = [];
    for (let lat = -86; lat <= 86; lat += 4) pts.push(pointOnSphere(lat, lng, R * 1.005));
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
  }

  [-60, -30, 30, 60].forEach(lat => addLatitude(lat, gridMat));
  // El meridiano de Barranquilla, en rojo: el origen de la ruta.
  [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].forEach(lng => addLongitude(lng, gridMat));
  addLongitude(-74.8, accentGridMat);
  globe.add(gridGroup);

  // City markers as invisible 3D objects for position tracking
  const cityObjects = [];
  cityRegistry.forEach(city => {
    const phi = (90 - city.lat) * Math.PI / 180;
    const theta = (city.lng + 180) * Math.PI / 180;
    const x = -R * Math.sin(phi) * Math.cos(theta);
    const y = R * Math.cos(phi);
    const z = R * Math.sin(phi) * Math.sin(theta);
    const obj = new THREE.Object3D();
    obj.position.set(x, y, z);
    globe.add(obj);
    cityObjects.push(obj);
  });

  // ===== RUTAS DESDE EL ORIGEN =====
  // Arcos de círculo máximo, levantados sobre la superficie, que salen de
  // Barranquilla hacia cada ciudad del atlas: el proyecto como itinerario.
  const routeGroup = new THREE.Group();
  const ORIGIN_COLOR = new THREE.Color(0xe06957);
  const DEST_COLOR = new THREE.Color(0x8fd1cf);
  // Cada ruta se desvanece al acercarse al horizonte del globo.
  const routeMat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0.85 } },
    vertexShader: 'attribute vec3 tint; varying vec3 vT; varying float vF; void main(){ vT = tint; vec4 wp = modelMatrix * vec4(position, 1.0); vF = dot(normalize(wp.xyz), normalize(cameraPosition - wp.xyz)); gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform float opacity; varying vec3 vT; varying float vF; void main(){ gl_FragColor = vec4(vT, opacity * smoothstep(0.08, 0.5, vF)); }',
    transparent: true,
    depthWrite: false
  });
  const routeArcs = [];
  cityRegistry.forEach(city => {
    if (city === origin) return;
    const a = pointOnSphere(origin.lat, origin.lng, 1);
    const b = pointOnSphere(city.lat, city.lng, 1);
    const angle = a.angleTo(b);
    const steps = Math.max(12, Math.round(angle * 60));
    const lift = 0.01 + angle * 0.025;
    const pts = [], cols = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const sinA = Math.sin(angle);
      const v = a.clone().multiplyScalar(Math.sin((1 - t) * angle) / sinA)
        .add(b.clone().multiplyScalar(Math.sin(t * angle) / sinA));
      v.normalize().multiplyScalar(R * (1.006 + lift * Math.sin(Math.PI * t)));
      pts.push(v);
      const col = ORIGIN_COLOR.clone().lerp(DEST_COLOR, t);
      cols.push(col.r, col.g, col.b);
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    geom.setAttribute('tint', new THREE.Float32BufferAttribute(cols, 3));
    geom.setDrawRange(0, 0);
    routeGroup.add(new THREE.Line(geom, routeMat));
    routeArcs.push({ geom, count: pts.length });
  });
  globe.add(routeGroup);

  // Las rutas se trazan una a una al cargar (o de golpe con movimiento reducido).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Al volver del atlas las rutas ya estaban trazadas allí: aparecen completas.
  const routesInstant = document.documentElement.classList.contains('is-arriving');
  const routeStart = performance.now();
  function growRoutes(now) {
    let pending = false;
    routeArcs.forEach((r, i) => {
      const t = (reduceMotion || routesInstant) ? 1 : Math.min(1, Math.max(0, (now - routeStart - 400 - i * 90) / 1400));
      const eased = 1 - Math.pow(1 - t, 3);
      r.geom.setDrawRange(0, Math.ceil(eased * r.count));
      if (t < 1) pending = true;
    });
    return pending;
  }
  let routesGrowing = true;

  // ===== GIRAR HACIA LA CIUDAD ELEGIDA =====
  const TILT = 0.65;
  let focusTarget = null;
  function focusGlobeOn(city) {
    const y = Math.PI / 2 - (city.lng + 180) * Math.PI / 180;
    const x = Math.max(-TILT, Math.min(TILT, city.lat * Math.PI / 180));
    let dy = (y - globe.rotation.y) % (Math.PI * 2);
    if (dy > Math.PI) dy -= Math.PI * 2;
    if (dy < -Math.PI) dy += Math.PI * 2;
    focusTarget = {
      y: globe.rotation.y + dy, x,
      fromY: globe.rotation.y, fromX: globe.rotation.x, start: performance.now()
    };
    velX = 0; velY = 0;
    if (reduceMotion) {
      globe.rotation.set(focusTarget.x, focusTarget.y, 0);
      focusTarget = null;
    }
  }
  // ?city=<id> llega desde el atlas: el globo abre mirando esa ciudad.
  const startCity = cityById(new URLSearchParams(location.search).get('city')) || origin;
  globe.rotation.set(Math.max(-TILT, Math.min(TILT, startCity.lat * Math.PI / 180)),
    Math.PI / 2 - (startCity.lng + 180) * Math.PI / 180, 0);
  if (startCity !== origin) { activeCityId = startCity.id; updateSlate(startCity.id); }

  // ===== DRAG TO ROTATE =====
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let velX = 0, velY = 0;
  let dragActive = false;

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragActive = false;
    focusTarget = null;
    prevX = e.clientX;
    prevY = e.clientY;
    velX = 0;
    velY = 0;
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    // Con el dedo solo se gira de lado: lo vertical desplaza la página (touch-action).
    const dy = e.pointerType === 'touch' ? 0 : e.clientY - prevY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragActive = true;
    globe.rotation.y += dx * 0.008;
    globe.rotation.x += dy * 0.005;
    globe.rotation.x = Math.max(-TILT, Math.min(TILT, globe.rotation.x));
    velX = dx * 0.008;
    velY = dy * 0.005;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  container.addEventListener('pointerup', () => { isDragging = false; });
  container.addEventListener('pointerleave', () => { isDragging = false; });
  container.addEventListener('pointercancel', () => { isDragging = false; });

  // ===== ANIMATION LOOP =====
  const worldPos = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const pinEls = cityRegistry.map(city => pinLayer.querySelector(`[data-city-id="${city.id}"]`));
  const pinShown = cityRegistry.map(() => null);
  let boxW = container.clientWidth || w, boxH = container.clientHeight || h;
  let lastRX = NaN, lastRY = NaN;
  let animId = null;

  // Pines en pantalla. Los que caen dentro del área sensible de otro se agrupan:
  // el de más rango (la elegida, luego vivas, próximas y futuras) queda visible con
  // la cuenta y abre una lista. Los ocultos (detrás del globo o en un grupo) salen
  // del foco del teclado; la lista de distancias sigue llegando a todas.
  const COARSE = window.matchMedia('(pointer: coarse)');
  const RANK = { live: 1, next: 2, future: 3 };
  const pinPts = cityRegistry.map(() => null);
  const pinMore = cityRegistry.map(() => -1);
  let pinGroups = cityRegistry.map(() => null);
  let pendingFocus = -1;

  function placePins() {
    cityRegistry.forEach((city, i) => {
      cityObjects[i].getWorldPosition(worldPos);
      if (worldPos.z <= 0) { pinPts[i] = null; return; }
      projected.copy(worldPos).project(camera);
      pinPts[i] = [(projected.x + 1) / 2 * boxW, (1 - projected.y) / 2 * boxH];
    });
    const hit = COARSE.matches ? 44 : 24;
    const rank = i => cityRegistry[i].id === activeCityId ? 0 : RANK[cityRegistry[i].status];
    const order = cityRegistry.map((c, i) => i).filter(i => pinPts[i])
      .sort((a, b) => rank(a) - rank(b) || a - b);
    const groups = cityRegistry.map(() => null);
    const taken = new Set();
    order.forEach(i => {
      if (taken.has(i)) return;
      taken.add(i);
      const g = [i];
      order.forEach(j => {
        if (taken.has(j)) return;
        if (Math.hypot(pinPts[j][0] - pinPts[i][0], pinPts[j][1] - pinPts[i][1]) < hit) {
          taken.add(j);
          g.push(j);
        }
      });
      groups[i] = g;
    });
    pinGroups = groups;

    cityRegistry.forEach((city, i) => {
      const pin = pinEls[i];
      if (!pin) return;
      const visible = !!groups[i];
      if (visible !== pinShown[i]) {
        pinShown[i] = visible;
        pin.style.opacity = visible ? '1' : '0';
        pin.style.pointerEvents = visible ? 'auto' : 'none';
        pin.inert = !visible;
        pin.tabIndex = visible ? 0 : -1;
      }
      const more = visible ? groups[i].length - 1 : 0;
      if (more !== pinMore[i]) {
        pinMore[i] = more;
        pin.querySelector('.pin-more').textContent = more ? '+' + more : '';
        pin.setAttribute('aria-label', pinLabel(city, more));
        if (more) pin.setAttribute('aria-haspopup', 'menu');
        else { pin.removeAttribute('aria-haspopup'); pin.removeAttribute('aria-expanded'); }
      }
      if (visible) {
        pin.style.transform = `translate3d(${pinPts[i][0].toFixed(1)}px, ${pinPts[i][1].toFixed(1)}px, 0) translate(-50%, -50%)`;
      }
    });

    // La lista abierta sigue a su pin; si el grupo se deshizo, se cierra.
    if (menuSeed >= 0) {
      if (!groups[menuSeed] || groups[menuSeed].length < 2) closePinMenu(false);
      else positionPinMenu();
    }
    if (pendingFocus >= 0 && groups[pendingFocus]) {
      pinEls[pendingFocus].focus({ preventScroll: true });
      pendingFocus = -1;
    }
  }

  // ===== LISTA DE UN GRUPO DE PINES =====
  const pinMenu = document.querySelector('.pin-menu');
  let menuSeed = -1, menuW = 0, menuH = 0;

  function openPinMenu(i) {
    closePinMenu(false);
    const seed = cityRegistry[i];
    const from = cityById(activeCityId);
    const members = [i].concat(pinGroups[i].slice(1)
      .sort((a, b) => kmBetween(seed, cityRegistry[a]) - kmBetween(seed, cityRegistry[b])));
    pinMenu.textContent = '';
    members.forEach(j => {
      const c = cityRegistry[j];
      const here = c === from;
      const km = here ? 'elegida' : fmtKm(kmBetween(from, c));
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'dist-row';
      row.dataset.status = c.status;
      row.setAttribute('role', 'menuitem');
      row.tabIndex = -1;
      row.setAttribute('aria-label', c.name + ', ' + STATUS_LABEL[c.status] + (here ? ', elegida' : ', a ' + km));
      row.innerHTML = '<span class="dot" aria-hidden="true"></span><span></span><span class="km"></span>';
      row.children[1].textContent = c.name;
      row.children[2].textContent = km;
      row.addEventListener('click', () => {
        pendingFocus = j;
        selectCity(c.id);
      });
      pinMenu.appendChild(row);
    });
    pinMenu.setAttribute('aria-label', 'Ciudades cercanas a ' + seed.name);
    pinMenu.hidden = false;
    menuSeed = i;
    menuW = pinMenu.offsetWidth;
    menuH = pinMenu.offsetHeight;
    pinEls[i].setAttribute('aria-expanded', 'true');
    positionPinMenu();
    pinMenu.firstElementChild.focus({ preventScroll: true });
  }

  function closePinMenu(restoreFocus) {
    if (menuSeed < 0) return;
    const pin = pinEls[menuSeed];
    menuSeed = -1;
    pinMenu.hidden = true;
    pinMenu.textContent = '';
    if (pin.hasAttribute('aria-haspopup')) pin.setAttribute('aria-expanded', 'false');
    if (restoreFocus && !pin.inert) pin.focus({ preventScroll: true });
  }

  function positionPinMenu() {
    const pt = pinPts[menuSeed];
    if (!pt) return;
    let left = pt[0] + 18;
    if (left + menuW > boxW - 4) left = pt[0] - 18 - menuW;
    left = Math.max(4, left);
    const top = Math.max(4, Math.min(pt[1] - 18, boxH - menuH - 4));
    pinMenu.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
  }

  pinMenu.addEventListener('keydown', e => {
    const items = [...pinMenu.children];
    const k = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = items.length;
      items[(k + (e.key === 'ArrowDown' ? 1 : n - 1) + n) % n].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePinMenu(true);
    } else if (e.key === 'Tab') {
      closePinMenu(false);
    }
  });
  // Un toque fuera de la lista (y fuera de su pin) la cierra.
  document.addEventListener('pointerdown', e => {
    if (menuSeed < 0 || pinMenu.contains(e.target) || pinEls[menuSeed].contains(e.target)) return;
    closePinMenu(false);
  });

  function animate() {
    animId = requestAnimationFrame(animate);

    if (routesGrowing) {
      routesGrowing = growRoutes(performance.now());
      needsRender = true;
    }

    if (focusTarget && !isDragging) {
      const t = Math.min(1, (performance.now() - focusTarget.start) / 1100);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      globe.rotation.y = focusTarget.fromY + (focusTarget.y - focusTarget.fromY) * e;
      globe.rotation.x = focusTarget.fromX + (focusTarget.x - focusTarget.fromX) * e;
      if (t >= 1) focusTarget = null;
    }

    // Momentum deceleration when not dragging
    if (!isDragging) {
      globe.rotation.y += velX;
      globe.rotation.x += velY;
      velX *= 0.97;
      velY *= 0.97;
      if (Math.abs(velX) < 0.0001) velX = 0;
      if (Math.abs(velY) < 0.0001) velY = 0;
    }

    const moved = globe.rotation.x !== lastRX || globe.rotation.y !== lastRY;
    if (!moved && !needsRender) return;
    lastRX = globe.rotation.x;
    lastRY = globe.rotation.y;
    needsRender = false;
    placePins();
    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  function onResize() {
    const rect = container.getBoundingClientRect();
    const nw = rect.width || 600;
    const nh = rect.height || 400;
    if (nw === boxW && nh === boxH && camera.aspect === nw / nh) return;
    boxW = nw; boxH = nh;
    camera.aspect = nw / nh;
    fitCamera(camera.aspect);
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
    needsRender = true;
  }
  window.addEventListener('resize', onResize);
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  // ===== MORFISMO GLOBO ⇄ ATLAS RELATIVO =====
  // La home entrega al atlas la cámara exacta del globo (centro, escala focal y
  // distancia); allí el mismo mundo pasa de perspectiva a azimutal equidistante.
  function globeCamera() {
    const rect = container.getBoundingClientRect();
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let lng = -90 - THREE.MathUtils.radToDeg(globe.rotation.y);
    lng = ((lng + 180) % 360 + 360) % 360 - 180;
    return {
      lng, lat: THREE.MathUtils.radToDeg(globe.rotation.x),
      cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2,
      s: (rect.height / 2) / half, P: camera.position.z / R,
      vw: innerWidth, vh: innerHeight
    };
  }
  const storeGeom = () => saveJSON(GEOM_KEY, globeCamera());
  storeGeom();
  new ResizeObserver(storeGeom).observe(container);

  document.querySelectorAll('a[href="atlas-relativo.html"]').forEach(link => {
    link.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      const target = 'atlas-relativo.html?city=' + encodeURIComponent(activeCityId);
      if (reduceMotion) { location.href = target; return; }
      isDragging = false; velX = 0; velY = 0; focusTarget = null;
      // El atlas dibuja el mismo halo, retícula y rutas: no hay nada que apagar.
      // Solo se aparta la interfaz y se navega en el siguiente instante.
      saveJSON(MORPH_KEY, Object.assign(globeCamera(), { dir: 'to-atlas', at: Date.now() }));
      stage.classList.add('is-leaving');
      setTimeout(() => { location.href = target; }, 140);
    });
  });

  // Volver con «atrás» restaura la página desde la caché tal como se fue: sin interfaz.
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    stage.classList.remove('is-leaving');
    document.documentElement.classList.remove('is-arriving');
    needsRender = true;
  });

  // Llegada desde el atlas: el globo ya está donde el atlas se cerró; el resto aparece.
  const arrival = AtlasShared.takeSession(MORPH_KEY);
  if (arrival && arrival.dir === 'to-globe' && Date.now() - arrival.at < 4000 && !reduceMotion) {
    // Temporizador y no rAF: si la pestaña no pinta, la interfaz no debe quedar oculta.
    setTimeout(() => document.documentElement.classList.remove('is-arriving'), 40);
  } else {
    document.documentElement.classList.remove('is-arriving');
  }

})();
