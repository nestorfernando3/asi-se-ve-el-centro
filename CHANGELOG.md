# Changelog

## Atlas relativo — 2026-07-19
- Nuevo fork `atlas-relativo.html`: proyección azimutal equidistante en vivo; cada ciudad clicada se convierte en el centro del mapa (d3-geo + world-atlas, todo vendoreado — cero CDN).
- Anillos de distancia real cada 2.500 km, radios de brújula, regla de distancias clicable, panel con video lazy-load y tabs largo/short.
- Soporte `prefers-reduced-motion`, layout responsive con panel bajo el mapa en móvil.
- Módulo `assets/atlas/geo.js` con tests en `test/geo.test.js` (`node --test`).

## Unreleased

- Atlas relativo usa un poster SVG local para evitar la carga automática desde `i.ytimg.com`; la única excepción remota es el iframe de YouTube, creado después de un click explícito en Reproducir.

### UI refresh
- Removed film-grain, scanline, vignette, matte-bar, corner, and timecode overlays from the atlas views.
- Shifted typography to Montserrat and pushed palette cooler and cleaner across `index.html`, `projects.html`, and atlas variants.
- Improved globe contrast and pin clarity; Barranquilla video now loads without `mute=1`.

### Proof pack
- Added `projects.html` as funder-facing reviewer entry page while keeping `index.html` as the atlas artwork.
- Added bilingual packet source docs under `funding/`: one-page treatment, artist statement, route proposal, budget draft, and grant tracker.
- Added temporary OpenAI-generated concept board under `assets/proof/` as visual north star for page, treatment, installation mockup, and reel frame language.
- Updated README with proof-pack path and funding material structure.

## 2026-05-12

### `48bc029` — feat: design pass — multi-tonal ink-wash globe, refined typography, warm glow
- **Globe texture**: replaced single-color blobs with 6-color palette (terracotta, burnt orange, ochre, umber, rust, sienna) mapped per continent
- **Ink wash shading**: 4-pass rendering — deep under-shadow → main color (3 opacity layers) → ink speckle bleed at edges
- **Graticule**: subtler lines (opacity 0.05), equator at 0.14, tropics added at 0.07
- **Viewer frame**: border color changed to `rgba(214,74,40,0.18)`, added `inset box-shadow` warm glow (`0 0 40px rgba(214,74,40,0.04)`)
- **Live pin**: softer glow ring (`0 0 20px + 0 0 40px`), warmer falloff
- **Slate typography**: poem text larger (`13px` → better readability), lighter opacity (`0.8`); author smaller (`8px`), more muted (`0.7` opacity); tighter spacing
- **Reel buttons**: reduced font to `9px`, added smooth transitions (`200ms ease`) for bg/border/color; active state gets accent bg tint; hover affects border
- **Globe material**: increased emissive warmth (`0x3a2010`, intensity 0.25), reduced metalness to 0.05
- Removed generic sparkle dots (200 random dots), replaced with intentional ink-speckle bleed at continent edges
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html`
- Fixed 6 polygon points in Africa continent data missing `lng:` prefix (bare `{-5` syntax error)

### `f2f93a6` — feat: artistic canvas-drawn globe, drag-to-rotate
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html`
- Replaced realistic Blue Marble satellite texture with procedurally generated canvas texture (vintage sepia map style on dark parchment background)
- Continent polygons drawn from simplified lat/lng data in warm terracotta (#d64a28)
- Graticule (lat/lng grid) every 15° in low-opacity accent color; equator highlighted
- Added warm directional light (`warmLight`) for atmospheric rim lighting
- Atmosphere glow changed from dark to warm terracotta (#d64a28, 0.08 opacity)
- **Drag-to-rotate**: `pointerdown`/`pointermove`/`pointerup` controls with momentum physics (velocity decays at 0.97/frame)
- Camera Y-rotation clamped to ±0.5 rad to prevent over-rotation
- Hover over live pins now uses `pin.dataset.cityId` (not `activeCityId`), so Barranquilla video always triggers on hover regardless of which city is selected in slate
- Click on any future pin: no video shown (videos array empty), only slate updates

### `c308d31` — fix: pin coordinates, unmute, city menu on click
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html`
- Fixed lat/lng → 3D position formula: now uses `phi = (90 - lat)`, `theta = (lng + 180)` with sign-corrected X mapping — aligns pins with Three.js SphereGeometry UV layout
- Removed `mute=1` from YouTube iframe URL — since user already interacted (drone triggers on `pointerdown`), browser allows autoplay with audio
- Added `selectCity(cityId)` — click on **any** city pin updates the slate (title, poem, author)
- All city pins get `click` event listener (not just `.is-live`)

### `32a3fd0` — feat: 3D globe, poetic descriptions, drone fix, reel-switch
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html`
- Replaced abstract SVG map with Three.js 3D globe (CDN: `cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`)
- Globe texture: `unpkg.com/three-globe/example/img/earth-blue-marble.jpg` with fallback to solid dark blue
- City buttons now use `data-city-id` attributes (no more inline `--x`/`--y` styles)
- Pin positions calculated per frame via `getWorldPosition()` → `project()`; pins hidden when behind globe (z < 0 in camera space)
- **15 cities** in cityRegistry with lat/lng for globe positioning
- **Poetic descriptions**: real poem fragments with author citations for 10 cities; original haiku for 5 cities (Medellín, Cali, Lima, Tokio, Sídney)
- Slate now shows `slate-desc` (poem) and `slate-meta` (author citation)
- Drone fix: `initAudio()` checks `if (videoRevealed) return;` to prevent drone from starting after video plays
- Reel-switch buttons (`display: none` removed from mobile media query; always visible)
- Unused SVG/routes CSS removed; keyframes cleaned up
- ResizeObserver handler for responsive globe sizing

### `0752509` — fix: single-video viewer, reel switcher, slate blocking
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html`
- Slate: added `pointer-events: none` (was blocking YouTube controls even at opacity 0)
- Video-stack: changed from 2-video grid to single full-frame viewer
- Reel buttons switch from `<a>` links (navigated away) to `<button>` elements with `data-video-index`
- Reel active state (`.is-active`) with accent border + hover background
- Drone `stopDrone()` fades out all oscillators via `setTargetAtTime` on first video reveal
- Reel buttons have `cursor: pointer`

### `716bb10` — fix: lazy-load second video
- **Source:** `asi-se-ve-el-centro-hover-map-v2.html` + `index.html`
- `buildIframeHTML()` gets `autoplay` parameter — only first video gets `autoplay=1`
- `showCity()` loads only first iframe; second stays `data-src` until reel link clicked
- Hardcoded second iframe (`yT4JEs4TVQg`) removed `autoplay=1`
- Added click handler on reel links to load corresponding iframe

### `f72c2b8` — Add index.html for GitHub Pages
- Copied `asi-se-ve-el-centro-hover-map-v2.html` to `index.html` (GitHub Pages entry point)
- Updated `README.md`

### `913efb7` — Add GitHub Pages link to README

### `1712539` — Initial commit
- `asi-se-ve-el-centro-atlas-hover.html` (cinematic atlas)
- `asi-se-ve-el-centro-cinematic.html` (v2 cinematic loop)
- `asi-se-ve-el-centro-hero.html` (v1 hero)
- `asi-se-ve-el-centro-hover-map-v2.html` (interactive hover map)
- `DESIGN.md` (design system)
- `frames/` (device frame HTML files)
- `skills/` (motion-frames skill definition)
- `README.md`
