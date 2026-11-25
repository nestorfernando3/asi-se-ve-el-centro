// Esquema del registro de ciudades (assets/atlas/cities.js): lo leen el globo y el atlas.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
require('../assets/atlas/cities.js');
const cities = window.ATLAS_CITIES;
const root = path.join(__dirname, '..');

test('hay ciudades y sus ids son únicos', () => {
  assert.ok(cities.length >= 10);
  const ids = cities.map(c => c.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  ids.forEach(id => assert.match(id, /^[a-z0-9-]+$/));
});

test('coordenadas WGS84 válidas y estado conocido', () => {
  cities.forEach(c => {
    assert.ok(c.name && c.country, c.id);
    assert.ok(c.lat >= -90 && c.lat <= 90, c.id);
    assert.ok(c.lon >= -180 && c.lon <= 180, c.id);
    assert.ok(['live', 'next', 'future'].includes(c.status), c.id);
  });
});

test('las ciudades vivas tienen piezas, pósters existentes y créditos', () => {
  cities.filter(c => c.status === 'live').forEach(c => {
    assert.ok(c.video && (c.video.long || c.video.short), c.id);
    Object.entries(c.video).forEach(([k, id]) => {
      assert.match(id, /^[A-Za-z0-9_-]{11}$/, `${c.id}.${k}`);
      assert.ok(c.poster && c.poster[k], `${c.id}: falta póster ${k}`);
      assert.ok(fs.existsSync(path.join(root, c.poster[k])), `${c.id}: no existe ${c.poster[k]}`);
      assert.ok(c.credits && c.credits[k] && c.credits[k].title, `${c.id}: faltan créditos ${k}`);
    });
  });
});

test('solo las ciudades vivas tienen video', () => {
  cities.filter(c => c.status !== 'live').forEach(c => assert.ok(!c.video, c.id));
});

test('toda cita lleva atribución', () => {
  cities.filter(c => c.quote).forEach(c => assert.ok(c.attrib, c.id));
});
