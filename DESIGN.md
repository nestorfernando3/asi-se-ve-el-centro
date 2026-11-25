# Diseño — Así se ve el centro.

Referencia del sistema visual vigente. La fuente de verdad son los tokens de
`assets/site.css`; este documento explica sus razones. Las versiones anteriores
(anillos de texto, bucle cinematográfico, Montserrat) están en `archivo/`.

## Idea

Una **carta náutica nocturna**: mar petróleo, tierra tostada, líneas de agua que se
alejan de la costa y rojo de imprenta para lo que importa (Barranquilla, los anillos
de distancia, el punto final del título). El mismo mundo se ve de dos formas: el
globo y el atlas relativo, que se transforman uno en otro.

## Color

| Token | Valor | Uso |
|---|---|---|
| `--night` | `#0b1218` | fondo de página |
| `--sea-deep` | `#0f2e3a` | mar del atlas y de la lupa |
| `--surface` | `#111a22` | superficies |
| `--fg` | `#f1ece2` | texto principal |
| `--muted` | `#92a2ae` | texto secundario, datos |
| `--accent` | `#e06957` | rojo de imprenta: origen, anillos, acento único |
| `--teal` / `--teal-ink` | `#63a9a1` | rutas futuras, kickers |
| `--cream` | `#f1e4c8` | ciudades próximas |

Estados de ciudad, iguales en pines, puntos, listas y leyendas: `--st-live` (rojo),
`--st-next` (crema), `--st-future` (verde azulado). El JavaScript los lee de estos
tokens (`AtlasShared.statusColors()`); no se repiten en código.

## Tipografía

Tres voces, tomadas del propio proyecto:

- **Calle** — Archivo condensada (ancho 62), mayúsculas: el título y la marca, como los
  rótulos del centro y los tableros de buseta.
- **Carta** — IM Fell English: versalitas para la tierra (nombres de ciudad), cursiva
  para el agua (mares) y, por extensión, para los versos.
- **Dato** — monoespaciada del sistema para kilómetros, coordenadas y controles.

Las fuentes están en `assets/fonts/` (woff2, subconjuntos latinos). Mínimos: 11 px en
interfaz y 10 px en rótulos del mapa.

## Movimiento

- El globo solo se repinta cuando algo cambia; las rutas desde Barranquilla se trazan
  una vez al cargar.
- Recentrar el atlas gira la proyección en 1 s; la lupa se aparta mientras tanto.
- Morfismo globo ⇄ atlas: perspectiva vertical mezclada con azimutal equidistante,
  1,1 s de ida y 0,85 s de vuelta. La barra superior queda quieta (View Transitions).
- `prefers-reduced-motion` desactiva giros, morfismo y animaciones de entrada.

## Interacción

- **Visor de piezas** (`assets/atlas/video.js`): póster local y botón Reproducir; el
  reproductor de YouTube se crea solo tras el clic. Pestañas «Pieza larga» y «Short».
- **Pines agrupados** en el globo: los que se pisan en pantalla se reúnen bajo el de
  más rango con su cuenta (+2) y una lista para elegir.
- **Lupa del centro** en el atlas: vecinos a menos de 2.500 km con escala radial de
  raíz cuadrada.
- **Lista de distancias**: siempre llega a todas las ciudades, también con teclado.

## Registro de ciudades

`assets/atlas/cities.js` es la única fuente (coordenadas WGS84, estado, piezas,
pósters, créditos y cita con fuente). El README explica cómo añadir una ciudad.
