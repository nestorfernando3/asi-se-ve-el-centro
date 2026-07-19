/* Matemática geodésica pura del atlas. Sin dependencias.
   UMD: global AtlasGeo en el navegador, module.exports en node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AtlasGeo = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  const R_EARTH = 6371, RAD = Math.PI / 180, DEG = 180 / Math.PI;

  // Distancia geodésica en km entre {lat, lon} y {lat, lon} (grados).
  function distKm(a, b) {
    const p1 = a.lat * RAD, p2 = b.lat * RAD, dl = (b.lon - a.lon) * RAD;
    const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
    return Math.acos(Math.min(1, Math.max(-1, c))) * R_EARTH;
  }

  // Punto destino desde (lon1, lat1) con rumbo brgDeg (0=N) y distancia angular d (radianes).
  // Devuelve [lon, lat] en grados.
  function destPt(lon1, lat1, brgDeg, d) {
    const th = brgDeg * RAD, p1 = lat1 * RAD, l1 = lon1 * RAD;
    const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(th));
    const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
    return [l2 * DEG, p2 * DEG];
  }

  function fmtKm(d) {
    return d.toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' km';
  }

  return { R_EARTH, RAD, DEG, distKm, destPt, fmtKm };
}));
