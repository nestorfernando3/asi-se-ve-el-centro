# Así se ve el centro.

Archivo documental silencioso de la vida en los centros urbanos, construido ciudad
por ciudad desde Barranquilla. Cada centro es un capítulo con una pieza larga y un
Short, dentro de un atlas interactivo.

- Sitio: <https://nestorfernando3.github.io/asi-se-ve-el-centro/>
- Atlas relativo: <https://nestorfernando3.github.io/asi-se-ve-el-centro/atlas-relativo.html>
- Dossier para evaluadores (ES/EN): <https://nestorfernando3.github.io/asi-se-ve-el-centro/projects.html>

## Páginas

| Página | Qué es |
|---|---|
| `index.html` | Globo 3D (Three.js): pines por ciudad, visor de piezas, distancias desde la ciudad elegida. |
| `atlas-relativo.html` | Proyección azimutal equidistante centrada en cualquier ciudad, con anillos de distancia real y lupa de vecinos. |
| `projects.html` | Dossier bilingüe para financiadores. |
| `sobre.html` | Método, créditos y contacto. |

Globo y atlas son el mismo mundo: al pasar de uno a otro, la proyección se transforma
(morfismo) y la ciudad elegida viaja en `?city=<id>`.

## Estructura

```
assets/
  site.css            tokens y componentes comunes (colores, tipografía, barra, listas, visor)
  editorial.css       páginas de texto (dossier y «Sobre el proyecto»)
  fonts/              Archivo e IM Fell en woff2, alojadas aquí
  vendor/             three.js r128, d3, topojson-client
  globe/              globo: globe.js, globe.css, land-110m.js (Natural Earth)
  atlas/
    cities.js         registro único de ciudades (lo leen globo y atlas)
    geo.js            distancias y rumbos (con pruebas)
    shared.js         estados, colores, sesión del morfismo, lista de distancias
    video.js          visor: póster local y YouTube solo tras Reproducir
    atlas.js          atlas relativo
  posters/            fotograma de cada pieza
  og-card.jpg         imagen para compartir (1200 × 630)
scripts/
  build-site.sh       arma _site/ con la lista blanca de lo publicable
  check-site.js       revisa que los enlaces locales del sitio armado existan
test/
  geo.test.js, cities.test.js   pruebas unitarias (node --test)
  smoke.js                      prueba de humo en Chromium (Playwright)
archivo/              versiones anteriores, no se publican
```

Lo interno (borradores de financiación, contactos, notas en `docs/`) está fuera de
git y fuera del sitio; ver `.gitignore`.

## Trabajar en local

Sin compilación. Para ver exactamente lo que se publica:

```bash
sh scripts/build-site.sh && python3 -m http.server 8000 -d _site
```

y abrir <http://localhost:8000/>.

Comprobaciones:

```bash
node --test test/*.test.js
```

```bash
node scripts/check-site.js _site
```

La prueba de humo necesita Playwright (en CI se instala solo). En local, con Chrome:

```bash
npm install --no-save playwright-core@1.49.1 && CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node test/smoke.js _site
```

## Añadir una ciudad

1. Una entrada en `assets/atlas/cities.js` con `id`, `name`, `country`, `lat`, `lon`
   y `status` (`live`, `next` o `future`). Aparece sola en el globo, el atlas y las listas.
2. Si tiene piezas: `video` (IDs de YouTube), `poster` (fotogramas en `assets/posters/`)
   y `credits` (título y duración de cada pieza; lugar y fecha si constan).
3. Si lleva verso: `quote`, `attrib` y `source` (edición o URL estable). Solo citas
   verificadas, breves y con atribución exacta.
4. `node --test test/*.test.js` comprueba el esquema.

## Publicación

`.github/workflows/pages.yml` publica en GitHub Pages cada push a `main`: primero corre
las pruebas, la revisión de enlaces y la prueba de humo; si pasan, arma `_site/` y lo
despliega. En un pull request solo corren las comprobaciones.

## Privacidad

El sitio no hace peticiones externas al abrirse: fuentes, librerías y cartografía son
locales. El reproductor de YouTube (dominio `youtube-nocookie.com`) se crea solo
cuando el visitante pulsa Reproducir.

## Créditos

Concepción, realización y desarrollo: Néstor De León. Cartografía: Natural Earth
(dominio público) vía world-atlas. Librerías: three.js, D3 y TopoJSON (licencias MIT
e ISC). Fuentes: Archivo e IM Fell English (SIL Open Font License).
