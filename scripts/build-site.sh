#!/bin/sh
# Arma el sitio público en una carpeta aparte (por defecto _site/).
# Solo entra lo que está en esta lista blanca: el resto del repositorio
# (versiones viejas, notas, material de financiación) no se publica.
#
#   sh scripts/build-site.sh            # arma _site/
#   sh scripts/build-site.sh /ruta/out  # arma en otra carpeta
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-_site}"
case "$OUT" in /*) ;; *) OUT="$ROOT/$OUT" ;; esac
MARK=".site-build"

# Solo se borra una carpeta que este mismo script armó antes.
if [ -e "$OUT" ]; then
  if [ -f "$OUT/$MARK" ]; then
    rm -rf "$OUT"
  else
    echo "Error: $OUT ya existe y no lo armó este script; no lo toco." >&2
    exit 1
  fi
fi

mkdir -p "$OUT"
: > "$OUT/$MARK"
cd "$ROOT"

# Páginas públicas
cp index.html atlas-relativo.html projects.html sobre.html "$OUT/"
# Recursos (CSS, JS, cartografía, librerías, pósters, tarjeta para compartir)
cp -R assets "$OUT/assets"
# El paquete para evaluadores vive dentro de projects.html: funding/ no se publica.

# Notas de trabajo dentro de assets y basura del sistema
find "$OUT/assets" -name '*.md' -delete
find "$OUT" -name '.DS_Store' -delete

# Guardián: si algo interno se coló, se detiene antes de publicar.
LEAK="$(find "$OUT" -type f \
  | grep -E -i 'funding|grant-tracker|budget|outreach|kcmo|superpowers|laboratorio|propuesta|/docs/|\.md$' || true)"
if [ -n "$LEAK" ]; then
  echo "Error: archivos internos en el sitio armado:" >&2
  echo "$LEAK" >&2
  exit 1
fi

echo "Sitio armado en $OUT ($(find "$OUT" -type f ! -name "$MARK" | wc -l | tr -d ' ') archivos)"
