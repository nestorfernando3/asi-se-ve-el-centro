const test = require('node:test');
const assert = require('node:assert');
const { distKm, destPt, fmtKm } = require('../assets/atlas/geo.js');

test('distKm Barranquilla → Cartagena ≈ 102 km', () => {
  const d = distKm({lat:10.9639, lon:-74.7964}, {lat:10.4236, lon:-75.5508});
  assert.ok(Math.abs(d - 102) < 15, `got ${d}`);
});

test('distKm es simétrica', () => {
  const a = {lat:35.6762, lon:139.6503}, b = {lat:10.9639, lon:-74.7964};
  assert.ok(Math.abs(distKm(a,b) - distKm(b,a)) < 1e-9);
});

test('destPt rumbo 90° desde el ecuador llega a lon +90', () => {
  const [lon, lat] = destPt(0, 0, 90, Math.PI/2);
  assert.ok(Math.abs(lat) < 1e-6);
  assert.ok(Math.abs(lon - 90) < 1e-6);
});

test('fmtKm usa separador de miles', () => {
  const s = fmtKm(13693);
  assert.ok(s.includes('13') && s.includes('693') && s.endsWith('km'));
});
