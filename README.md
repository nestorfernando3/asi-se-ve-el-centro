# Así se ve el centro.

> Transmedia project. Downtown visions from Colombian cities → the world.
> Barranquilla is the origin point.

Rotating type ring around a wireframe globe. Cinematic 12s loop, designed for HyperFrames export. Interactive map with hover-to-reveal video.

---

## Project structure

```
Así se ve el centro/
├── README.md                          ← this file
├── DESIGN.md                          ← visual system, colors, architecture, city registry
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
├── asi-se-ve-el-centro-atlas-hover.html ← v4 — multi-city comparison grid (pattern C, preview)
└── asi-se-ve-el-centro-hover-map-v2.html ← v3 — interactive map + hover-to-video (active)
```

---

## How to use

### View in browser
Open any `.html` file directly in a browser. No server needed.

### Current active file
**`asi-se-ve-el-centro-hover-map-v2.html`** — world map with city pins. Hover Barranquilla's pin (red) or the video panel to load and play the two YouTube pieces.

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

Zero. Every file is self-contained HTML+CSS+JS. No build step, no npm, no CDN at runtime. YouTube embeds require internet for video playback.

---

## Open Design

These files were generated in [Open Design](https://opendesign.app). The `frames/` and `skills/` directories are copies of the tool's shared assets — keep them with the project so it remains self-contained.

To re-import into Open Design: open the app, create a new project, and drop the HTML files into the project folder.
