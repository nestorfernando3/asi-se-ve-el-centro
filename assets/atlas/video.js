/* Visor de piezas: lo comparten el globo (index.html) y el atlas relativo.
   Muestra un póster local y un botón Reproducir. El reproductor de YouTube,
   en su dominio sin cookies, solo se crea después de ese clic: antes no sale
   ninguna petición hacia YouTube. */
(function () {
  const PIECES = {
    long:  { label: 'Pieza larga', phrase: 'la pieza larga' },
    short: { label: 'Short',       phrase: 'el Short' }
  };
  const PLACEHOLDER = 'assets/atlas/poster-placeholder.svg';
  const chosen = {}; // pieza elegida en cada ciudad: se recuerda al volver a ella

  function embedURL(id) {
    return 'https://www.youtube-nocookie.com/embed/' + id +
      '?autoplay=1&loop=1&playlist=' + id + '&playsinline=1&rel=0&modestbranding=1';
  }

  // city.poster = { long: 'ruta', short: 'ruta' } en cities.js; si falta, el póster genérico.
  function posterFor(city, key) {
    return (city.poster && city.poster[key]) || PLACEHOLDER;
  }

  function showPoster(frame, city, key, onPlay) {
    frame.textContent = '';
    frame.classList.remove('is-playing');
    const img = document.createElement('img');
    img.className = 'vposter';
    img.src = posterFor(city, key);
    img.alt = '';
    img.decoding = 'async';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vplay';
    btn.setAttribute('aria-label', 'Reproducir ' + PIECES[key].phrase + ' de ' + city.name);
    btn.innerHTML = '<span aria-hidden="true"></span>';
    btn.addEventListener('click', () => {
      showPlayer(frame, city, key, true);
      if (onPlay) onPlay(city, key);
    });
    frame.append(img, btn);
  }

  function showPlayer(frame, city, key, focus) {
    const iframe = document.createElement('iframe');
    iframe.src = embedURL(city.video[key]);
    iframe.title = PIECES[key].label + ' de ' + city.name;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    frame.textContent = '';
    frame.classList.add('is-playing');
    frame.appendChild(iframe);
    if (focus) iframe.focus();
  }

  // Pinta el visor y sus pestañas. Devuelve false si la ciudad aún no tiene piezas
  // (quien llama decide qué mostrar entonces).
  function render(frame, tabs, city, opts) {
    opts = opts || {};
    const keys = city.video ? Object.keys(PIECES).filter(k => city.video[k]) : [];
    tabs.textContent = '';
    const credit = opts.creditEl;
    if (!keys.length) {
      tabs.hidden = true;
      if (credit) { credit.textContent = ''; credit.hidden = true; }
      frame.classList.remove('is-playing');
      return false;
    }
    const key = keys.includes(chosen[city.id]) ? chosen[city.id] : keys[0];
    if (opts.play) showPlayer(frame, city, key, false);
    else showPoster(frame, city, key, opts.onPlay);
    tabs.hidden = keys.length < 2;
    if (credit) {
      // Ficha de la pieza: título y duración; luego quién, dónde y cuándo, si constan.
      const c = city.credits || {}, piece = c[key] || {};
      const head = [piece.title, piece.duration].filter(Boolean).join(' · ');
      const where = [c.place, c.date].filter(Boolean).join(', ');
      const tail = [c.by && 'Realización: ' + c.by, where].filter(Boolean).join(' · ');
      credit.textContent = '';
      if (head) { const b = document.createElement('b'); b.textContent = head; credit.appendChild(b); }
      if (tail) credit.append((head ? ' · ' : '') + tail);
      credit.hidden = !head && !tail;
    }
    keys.forEach(k => {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'btn-tab' + (k === key ? ' is-active' : '');
      t.textContent = PIECES[k].label;
      t.setAttribute('aria-pressed', String(k === key));
      t.addEventListener('click', () => {
        if (k === key) return;
        // Si ya sonaba una pieza, la otra entra reproduciéndose; si no, con su póster.
        const wasPlaying = frame.classList.contains('is-playing');
        chosen[city.id] = k;
        render(frame, tabs, city, Object.assign({}, opts, { play: wasPlaying }));
        const pressed = tabs.querySelector('[aria-pressed="true"]');
        if (pressed) pressed.focus();
      });
      tabs.appendChild(t);
    });
    return true;
  }

  window.CityVideo = { render, PIECES };
})();
