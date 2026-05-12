# DESIGN.md — Así se ve el centro.

> Transmedia atlas: downtown visions from Colombian cities → world.
> Design system, motion philosophy & iteration reference.

---

## Concept

A cinematic, looping hero that communicates expansion: one city (Barranquilla) as the origin point, radiating outward to Colombia, then the world. The composition is a **rotating type ring around a wireframe globe** — the ring carries city names, the globe is the atlas. The headline *"Así se ve el centro"* anchors the project title in display serif with a single italic accent.

The interactive phase adds **city pins on a world map** with hover-to-reveal-video mechanics.

---

## Visual direction

Base direction: **Editorial — Monocle / FT magazine** (print-magazine feel, generous whitespace, serif headlines, restrained palette), then **remixed to cinematic dark** for screen presence.

| Layer | Choice |
|---|---|
| Root reference | Editorial-monocle (serif display, restrained palette) |
| Adaptation | Dark cinematic matte (inverted bg/fg, film-grain, scanlines, corner gates, timecode) |
| Motion feel | Balanced / hypnotic — parallax via delta velocity across 3 concentric rings |
| Focal mark | Wireframe globe with coast outlines, graticule grid at two speeds, pulsing accent dot |
| Accent usage | Once: the italic word *centro.* in the headline + pulse dot on globe |

---

## Color palette

All values in OKLch for perceptual uniformity.

### Cinematic dark (current)

```css
--matte:   #050302;         /* deepest black — frame matte */
--ink:     #100c0a;         /* near-black stage background */
--fg:      #e7ded0;         /* warm off-white text */
--muted:   #b9ad9e;         /* subdued meta / labels */
--line:    rgba(231,222,208,0.18);  /* thin rules */
--faint:   rgba(231,222,208,0.07);  /* dashed rings, subtle grid */
--accent:  #d34a28;         /* burnt rust — headline italic + pulse */
--gold:    #c99b5e;         /* secondary accent (unused, available) */
```

### Light editorial (v1 hero, available for print)

```css
--bg:      oklch(97% 0.012 78);    /* warm paper */
--surface: oklch(99% 0.004 78);
--fg:      oklch(19% 0.015 55);    /* ink */
--muted:   oklch(44% 0.014 55);
--border:  oklch(88% 0.01 78);
--accent:  oklch(58% 0.16 28);     /* rust */
```

---

## Typography

| Role | Stack | Notes |
|---|---|---|
| Display (headlines) | `Iowan Old Style`, `Charter`, Georgia, serif | Generous serif for the title. Italic for the accent word. |
| Body | `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, system-ui, sans-serif | Quiet, invisible body. |
| Mono (labels, rings, UI) | `IBM Plex Mono`, `JetBrains Mono`, Menlo, monospace | Ring city names, chrome labels, timecode, metadata. |

Headline scale: `clamp(2rem, 4.4vw, 5.3rem)` / `clamp(2.7rem, 6.4vw, 8rem)` — responsive.

---

## Motion architecture

All animations are CSS `@keyframes` — no JS, deterministic, frame-grabber safe.

### Timeline (12s loop)

| Layer | Animation | Duration | Behavior |
|---|---|---|---|
| Outer ring | `spin` | 12s | 360° rotation, linear |
| Middle ring (dashed) | `spinReverse` | 6s | Counter-rotation for parallax depth |
| Inner ring | `spin` | 4s | Faster forward spin |
| Globe (whole) | `spin` | 12s | Synchronizes with outer ring |
| Globe grid (slow) | `spinReverse` | 6s | Same as middle ring |
| Globe grid (fast) | `spin` | 4s | Same as inner ring |
| Globe coast lines | `spinReverse` | 12s | Counter-rotation to distinguish from grid |
| Pulse dot | `pulse` | 3s | Ease-in-out scale + box-shadow ring |
| Headline | `titleIn` | 12s | Fade-up reveal with blur, holds visible ~68% of loop |
| Headline float | `headlineFloat` | 12s | Subtle 1.5px y-oscillation |
| Gate weave (hover map) | `mapBreath` | 12s | Gentle scale + translate breath |
| Route dashes | `routeFlow` | 6s | Dashed path animation for map connections |
| Grain overlay | `grain` | 0.72s | Film grain step animation |
| Scanlines | `scanDrift` | 12s | Vertical drift of scanline pattern |

### Keyframes reference

```
spin:         { to: transform: rotate(360deg) }
spinReverse:  { to: transform: rotate(-360deg) }
counterSpin:  { to: transform: rotate(-360deg) }  // applied to ring label text to keep upright
pulse:        0% → 50% → 100%  (scale 1 → 1.24 → 1, shadow bloom)
titleIn:      0%-8% hidden blur → 16%-84% visible → 100% fade
headlineFloat: 0%/100% y:0, 50% y:-1.5px
```

### Reduced motion

`@media (prefers-reduced-motion: reduce)` disables all animations, shows headline at full opacity, removes grain and scanlines.

---

## File inventory

| File | Version | Purpose | Status |
|---|---|---|---|
| `asi-se-ve-el-centro-hero.html` | v1 | Animated hero — rotating type ring + wireframe globe + headline. Light editorial palette. | Stable |
| `asi-se-ve-el-centro-cinematic.html` | v2 | Full cinematic experience — dark palette, grain, scanlines, corner gates, timecode, 12s loop. | Stable |
| `asi-se-ve-el-centro-hover-map-v2.html` | v3 | Interactive map with city pins + hover-to-reveal YouTube video panel. Barranquilla as origin. | Active |
| `asi-se-ve-el-centro-atlas-hover.html` | v4 | Multi-city atlas hover (pattern C — comparison across cities). Ready for when more cities have video. | Preview |

### Supporting files

| Path | Purpose |
|---|---|
| `frames/` | Shared device frames (iPhone 15 Pro, Android Pixel, iPad Pro, MacBook, browser chrome) for multi-device and multi-screen prototypes |
| `skills/motion-frames/SKILL.md` | The motion-frames skill definition used to generate v1–v4 |
| `skills/motion-frames/example.html` | Example output from the motion-frames skill |

---

## Interactive mechanics (hover map)

**Pattern A** — single focused city with video panel:
- City pins separated on map
- Hover pin (or touch) → load YouTube iframes → reveal video stack
- Video panel shows both pieces (long + short) stacked vertically
- Future pins show "próximamente" / "futura ruta" labels

**Pattern C** (ready, needs cities) — multi-city comparison:
- Each city has its own video column
- Hover any pin to load that city's reel
- Side-by-side or grid layout

### YouTube embed configuration

```html
<iframe
  data-src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1&loop=1
    &playlist=VIDEO_ID&controls=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1"
  allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope; web-share"
  allowfullscreen>
</iframe>
```

Videos load on user interaction (pointerenter / focusin / touchstart) — no autoplay on page load.

---

## City registry

Map coordinates in `%(x, y)` relative to the SVG world map (1000×560 viewBox).

| City | X% | Y% | Status | Video URL |
|---|---|---|---|---|---|
| Barranquilla | 31.6% | 59.2% | **Live** | `5Q8Sq7YQrEE`, `yT4JEs4TVQg` |
| Bogotá | 32.8% | 64% | Pending | — |
| Medellín | 31.1% | 63% | Pending | — |
| Cali | 29.5% | 70.5% | Planned | — |
| Cartagena | 31.5% | 56.3% | Planned | — |
| Lima (Perú) | 30% | 77.7% | Future route | — |
| Ciudad de México | 22.5% | 50.9% | Future route | — |
| Nueva York | 26.5% | 38.4% | Future route | — |
| Londres | 59.2% | 43.8% | Future route | — |
| París | 56.5% | 37.1% | Future route | — |
| Barcelona | 54.5% | 39.8% | Future route | — |
| Dakar | 45% | 56.3% | Future route | — |
| Mumbai | 68.5% | 55.4% | Future route | — |
| Tokio | 71.6% | 36.9% | Future route | — |
| Sídney | 78.4% | 70.7% | Future route | — |

To add a city: place a `<button class="city-pin">` at `style="--x:X%; --y:Y%"` inside `.pin-layer`.

---

## HyperFrames export notes

- All animations are CSS `@keyframes` — deterministic frame capture.
- No JS-driven motion — frame-grabbers can scrub reliably.
- 12s loop duration — 288 frames at 24fps, 360 frames at 30fps.
- `data-od-id` attributes on stage, focal, ring, headline, chrome for element targeting.
- Grain uses SVG filter (turbulence) embedded as data-uri — self-contained.

---

## Next iteration paths

1. **Add more cities** — produce videos, add pins at map coordinates, add iframes to video-stack
2. **Pattern C implementation** — activate atlas-hover layout with city comparison
3. **Sound layer** — ambient drone / city-specific audio beds synced to 12s loop
4. **Transmedia website** — compose hero + map + about section in single-page layout
5. **Print poster** — use light editorial palette, static frame, typography as primary element
6. **Brand guide** — expand color tokens, add typography specimens, logo lockup
