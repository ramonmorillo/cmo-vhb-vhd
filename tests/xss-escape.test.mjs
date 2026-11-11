// Regresión de seguridad: los datos tecleados, pegados o importados se escapan antes de insertarse como HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('las tablas de pacientes y de extracción se construyen con textContent', () => {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /<td>\$\{record\.pseudonym_id\}<\/td>/);
  assert.doesNotMatch(src, /<td>\$\{row\.evidence\}<\/td>/);
  assert.ok((src.match(/cell\.textContent = String\(value \?\? ''\)/g) || []).length >= 2);
});
