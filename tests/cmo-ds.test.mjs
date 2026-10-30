import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const meta = JSON.parse(/<script type="application\/json" id="cmo-app-meta">([\s\S]*?)<\/script>/.exec(read('../index.html'))[1]);

test('firma CMO: la versión de la firma es la declarada en package.json; sin versión de algoritmo', () => {
  assert.equal(meta.schema, 'cmo-app-meta/1');
  assert.equal(meta.appVersion, JSON.parse(read('../package.json')).version);
  assert.equal(meta.algorithm, null, 'el código no declara versión del algoritmo');
});

test('firma CMO: fecha solo con estado publicado y nunca generada en tiempo de ejecución', () => {
  if (meta.status === 'released') assert.match(meta.releaseDate, /^\d{4}-\d{2}-\d{2}$/);
  else assert.equal(meta.releaseDate, null);
  assert.doesNotMatch(read('../vendor/cmo-ds/cmo-author-signature.js'), /new Date\(|Date\.now\(/);
});

test('firma CMO: atribución sin titularidades ni avales no declarados', () => {
  assert.deepEqual(meta.credits, [{ role: 'Desarrollo digital', name: 'Dr. Ramón Morillo Verdugo' }]);
  assert.equal(meta.copyright, null);
  assert.match(read('../index.html'), /<footer class="footer">[\s\S]*<cmo-author-signature meta="cmo-app-meta">[\s\S]*<\/footer>/);
});

test('CMO Design System: copia fijada íntegra (sin ediciones manuales)', () => {
  const dir = new URL('../vendor/cmo-ds/', import.meta.url);
  const man = JSON.parse(fs.readFileSync(new URL('CMO-DS-VERSION.json', dir), 'utf8'));
  assert.equal(man.version, meta.designSystem);
  for (const [f, h] of Object.entries(man.files)) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(f, dir))).digest('hex'), h, f);
  }
});
