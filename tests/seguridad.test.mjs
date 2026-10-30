// Seguridad de la cadena de suministro y redacción regulatoria (auditoría CMO, hallazgos H2 y H3).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index.html no carga scripts ni estilos de terceros', () => {
  const externos = [...html.matchAll(/<(script|link)\b[^>]*\b(src|href)="(https?:)?\/\/[^"]+"/g)].map((m) => m[0]);
  assert.deepEqual(externos, []);
});

test('xlsx 0.18.5 local: la SRI de index.html coincide con el fichero fijado', () => {
  const m = html.match(/<script src="vendor\/xlsx\/xlsx\.full\.min\.js" integrity="(sha384-[^"]+)"><\/script>/);
  assert.ok(m, 'falta el <script> local de xlsx con integrity');
  const buf = fs.readFileSync(new URL('../vendor/xlsx/xlsx.full.min.js', import.meta.url));
  assert.equal(m[1], 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64'));
  assert.equal(m[1], 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw');
});

test('sin afirmaciones regulatorias categóricas: «no es un producto sanitario certificado»', () => {
  for (const [nombre, txt] of [['index.html', html], ['app.js', app]]) {
    assert.doesNotMatch(txt, /producto sanitario(?! certificado)/i, nombre);
    assert.match(txt, /producto sanitario certificado/, nombre);
  }
});
