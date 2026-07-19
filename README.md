# Así se ve el centro.

> Transmedia project. Downtown visions from Colombian cities → the world.
> Barranquilla is the origin point.

This repository contains two coexisting web experiences:

- `index.html` — the stable main experience, a rotating 3D globe.
- `atlas-relativo.html` — the `atlas-relativo` branch experiment, an editorial
  azimuthal map that lets each city become the centre. It does not replace
  `main/index.html`.

Rotating type ring around a wireframe globe. Clean, modern atlas with Montserrat, cooler palette, and hover-to-reveal video.

🌐 **Live site:** [nestorfernando3.github.io/asi-se-ve-el-centro](https://nestorfernando3.github.io/asi-se-ve-el-centro/)
📁 **GitHub:** [github.com/nestorfernando3/asi-se-ve-el-centro](https://github.com/nestorfernando3/asi-se-ve-el-centro)
🎞️ **Proof pack:** [`projects.html`](projects.html)

When the `atlas-relativo` branch is published through GitHub Pages, its direct
entry point is [`atlas-relativo.html`](atlas-relativo.html):
[Abrir Atlas relativo en GitHub Pages](https://nestorfernando3.github.io/asi-se-ve-el-centro/atlas-relativo.html).
The source is available at [branch `atlas-relativo`](https://github.com/nestorfernando3/asi-se-ve-el-centro/tree/atlas-relativo).

---

## Project structure

```
Así se ve el centro/
├── index.html                         ← 🟢 GitHub Pages entry — interactive map (v3 unified)
├── atlas-relativo.html                 ← editorial relative-atlas experiment
├── README.md                          ← this file
├── DESIGN.md                          ← visual system, colors, architecture, city registry
├── projects.html                      ← funder-facing proof pack entry page
├── funding/                           ← bilingual treatment, artist statement, route, budget, target tracker
├── assets/proof/                      ← temporary concept board + proof assets
├── frames/                            ← device frames for multi-screen prototypes
│   ├── iphone-15-pro.html             ← 390×844 with Dynamic Island
│   ├── android-pixel.html             ← 412×900 with punch-hole
│   ├── ipad-pro.html                  ← iPad Pro 11"
│   ├── macbook.html                   ← MacBook Pro 14" with notch
│   └── browser-chrome.html            ← macOS Safari window
├── skills/motion-frames/
│   ├── SKILL.md                       ← skill definition used to generate motion compositions
│   └── example.html                   ← reference example output
├── asi-se-ve-el-centro-hero.html      ← v1 — rotating rings + globe + headline (light editorial)
├── asi-se-ve-el-centro-cinematic.html ← v2 — full cinematic: dark palette, grain, scanlines, 12s loop
├── asi-se-ve-el-centro-atlas-hover.html ← v4 — multi-city cinematic atlas (pattern C, preview)
└── asi-se-ve-el-centro-hover-map-v2.html ← v3 — source file for index.html
```

---

## How to use

### View in browser
Open most `.html` files directly in a browser. `atlas-relativo.html` loads its
local TopoJSON with `fetch`, so use a small local server for reliable browser
behaviour:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/atlas-relativo.html`.

### 🌐 Live webapp
**`index.html`** — served at [nestorfernando3.github.io/asi-se-ve-el-centro](https://nestorfernando3.github.io/asi-se-ve-el-centro/). Interactive map with 15 city pins, hover-to-reveal video, procedural audio drone, and a cleaner modern visual system.

### Atlas relativo
**`atlas-relativo.html`** — a no-build editorial map centred on Barranquilla by
default. It includes 18 registered cities, real-distance rings, keyboard-accessible
city controls, reduced-motion support, local D3/TopoJSON assets, and a video
panel whose YouTube iframe is created only after an explicit play click.

Run its focused checks with:

```bash
node --test test/geo.test.js
node --check assets/atlas/atlas.js
```

### 🎞️ Funder proof pack
**`projects.html`** — reviewer-facing page for grants, residencies, and media labs. It frames the project as a silent documentary archive, explains the Barranquilla → Bogotá → Cartagena route, and links to bilingual packet source docs in `funding/`.

### Current active file (local)
**`asi-se-ve-el-centro-hover-map-v2.html`** — world map with city pins. Hover Barranquilla's pin or the video panel to load and play the two YouTube pieces.

### Best export file
**`asi-se-ve-el-centro-cinematic.html`** — pure CSS animation, no JS motion, deterministic 12s loop. Feed to HyperFrames or any frame-grabber.

### For prototypes across multiple devices
Use the `frames/` device shells to show the composition inside an iPhone / Android / iPad / MacBook / browser frame:

```html
<iframe src="frames/iphone-15-pro.html?screen=asi-se-ve-el-centro-cinematic.html"
  width="390" height="844"></iframe>
```

---

## How to iterate

### Add a new city

1. Produce a video (long, short, or both)
2. Find map coordinates in the SVG (open file → inspect SVG viewBox 1000×560)
3. Add a pin in `.pin-layer`:
   ```html
   <button class="city-pin" style="--x:XX%; --y:YY%;" aria-label="Ciudad">
     <span>Ciudad · video</span>
   </button>
   ```
4. Add the YouTube embed in `aside.viewer` (or in Pattern C layout per-column)
5. Register the city in `DESIGN.md` under City registry

### Switch visual direction
Edit `:root` in any HTML file — color tokens, font stacks, and posture rules are at the top. See `DESIGN.md` → Color palette and Typography for the exact values.

### Add responsive breakpoints
Current breakpoints: 920px (tablet), 480px (mobile). The map collapses to single-column at tablet; viewer shrinks to overlay at mobile.

---

## Dependencies

Zero build dependencies. Every page is plain HTML+CSS+JS; the Atlas relativo
experiment vendors D3, TopoJSON, and its land data under `assets/`. There is no
automatic CDN request. YouTube embeds require internet only after the user
chooses to play a video.

## GitHub Pages deployment

The workflow at [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
deploys the checked-out branch as a static GitHub Pages site when
`atlas-relativo` is pushed. To enable it once in the repository, choose
**Settings → Pages → Source → GitHub Actions**. The workflow preserves the
existing `index.html` entry point and exposes the experiment at
`/atlas-relativo.html`.

The workflow has no build step: it uploads the repository root exactly as the
static site source. Local assets stay local; only the deferred YouTube player
uses a remote URL.

---

## Open Design

These files were generated in [Open Design](https://opendesign.app). The `frames/` and `skills/` directories are copies of the tool's shared assets — keep them with the project so it remains self-contained.

To re-import into Open Design: open the app, create a new project, and drop the HTML files into the project folder.
