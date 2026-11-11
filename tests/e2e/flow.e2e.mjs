// Recorrido extremo a extremo de CMO-HBV/HDV en Chromium (Playwright). Datos ficticios.
//   npm run test:e2e            (requiere Playwright con Chromium)
//   AXE_PATH=<axe.min.js>       añade la auditoría WCAG A/AA
//   E2E_OUT=<carpeta>           guarda PDF, texto y capturas
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {loadApp} from '../load-app.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { try { ({chromium} = await import('playwright')); } catch { chromium = null; } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.env.E2E_OUT;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json'};
const ALL = loadApp().APP_CONFIG.domains.flatMap(d => d.items.map(i => i.id));
let server, browser, origin;
const external = [];

before(async () => {
  if (!chromium) return;
  server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (file.endsWith(path.sep)) file += 'index.html';
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
  });
  await new Promise(r => server.listen(0, r));
  origin = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, {recursive: true});
});
after(async () => { await browser?.close(); server?.close(); });

async function open(viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:srcdoc') external.push(u); });
  await page.goto(origin);
  await page.waitForSelector('input[data-tri]');
  return {page, errors};
}
const state = (page, id, value) => page.click(`label:has(input[data-tri="${id}"][value="${value}"])`);
const answerAll = async (page, yes = []) => { for (const id of ALL) await state(page, id, yes.includes(id) ? 'yes' : 'no'); };
const stratify = async page => { await page.selectOption('#patientType', 'VHB'); await page.fill('#patientId', 'HEP-0001'); await page.click('button[type="submit"]'); await page.waitForSelector('#flowExtras:not([hidden])'); };
const save = async (download, name) => { const file = path.join(OUT || fs.mkdtempSync('/tmp/cmo-hbv-'), name); await download.saveAs(file); return file; };
const dialog = (page, label) => page.click(`dialog.cmo-modal button:has-text("${label}")`);
async function axe(page, label) {
  if (!process.env.AXE_PATH) return;
  await page.evaluate(() => { const t = document.querySelector('.cmo-toast'); if (t) t.hidden = true; });
  await page.addScriptTag({path: process.env.AXE_PATH});
  const violations = await page.evaluate(async () => (await window.axe.run(document, {preload: false, runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']})).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`));
  assert.deepEqual(violations, [], `axe ${label}`);
}
const skip = {skip: !chromium && 'Playwright no disponible'};

test('recorrido completo: provisional → completo, modificación, actuaciones, plan, informe, exportación, casos y copia de seguridad', skip, async () => {
  const {page, errors} = await open();
  await axe(page, 'inicio');
  assert.equal(await page.evaluate(() => document.querySelectorAll('input[data-tri][value="pending"]:checked').length), ALL.length, 'por defecto todo está pendiente');
  assert.equal(await page.textContent('#liveScoreValue'), '0');
  await state(page, ALL[0], 'yes');
  await stratify(page);
  assert.match(await page.textContent('#flowExtras'), /Resultado provisional/);
  assert.match(await page.textContent('#flowExtras'), /podría alcanzar \d+ puntos/);
  await axe(page, 'resultado provisional');
  // Completar la valoración
  await answerAll(page, [ALL[0], ALL[3]]);
  await page.click('button[type="submit"]');
  assert.doesNotMatch(await page.textContent('#flowExtras'), /Resultado provisional/);
  // Modificación profesional
  const model = Number((await page.textContent('#assignedLevel')).match(/Nivel (\d)/)[1]);
  const other = model === 1 ? '2' : '1';
  await page.selectOption('#profLevel', other);
  assert.match(await page.textContent('#profState'), /No se aplica/);
  await page.fill('#profJustification', 'Justificación clínica ficticia suficientemente larga'); await page.locator('#profJustification').blur();
  assert.match(await page.textContent('#profState'), /Modificación aplicada/);
  // Actuaciones y plan
  await page.selectOption('select[data-int] >> nth=0', 'done');
  await page.selectOption('select[data-int] >> nth=1', 'planned');
  await page.fill('#nextReview', '2027-02-10');
  await page.fill('#planNotes', '<img src=x onerror="window.__xss=1"> Llamada.'); await page.locator('#planNotes').blur();
  await axe(page, 'resultado completo');
  // Informes
  await page.click('#copyBtn');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /Identificador del paciente \(seudonimizado\): HEP-0001/); assert.match(text, /Modificación por criterio profesional:/); assert.match(text, /Realizadas en esta consulta:\n\s+- [^\n]+/);
  assert.match(text, /Próxima valoración prevista: 10\/02\/2027/); assert.match(text, /RESULTADO DE ESTRATIFICACIÓN:/);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('#pdfBtn')]);
  const bytes = fs.readFileSync(await save(pdf, 'informe-ficticio.pdf'));
  assert.equal(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4'); assert.ok(bytes.toString('latin1').includes('HEP-0001'));
  const [txt] = await Promise.all([page.waitForEvent('download'), page.click('#txtBtn')]);
  assert.equal(fs.readFileSync(await save(txt, 'informe-ficticio.txt'), 'utf8'), text);
  const printed = page.evaluate(() => new Promise(r => document.addEventListener('cmo:print', () => r(document.querySelector('iframe.cmo-print-frame').contentDocument.body.textContent), {once: true})));
  await page.click('#printBtn');
  assert.ok((await printed).includes('Resultado de estratificación'));
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('#caseJsonBtn')]);
  const env = JSON.parse(fs.readFileSync(await save(json, 'caso-ficticio.json'), 'utf8'));
  assert.equal(env.schema, 'cmo-export/1'); assert.equal(env.dataSchema, 'cmo-hbv-case/1'); assert.equal(env.app.id, 'cmo-vhb-vhd');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#caseCsvBtn')]);
  assert.match(fs.readFileSync(await save(csv, 'caso-ficticio.csv'), 'utf8'), /"nivel_final";/);
  // Guardar, recargar, cargar y eliminar con confirmación
  await page.click('#savePatientBtn');
  await page.waitForFunction(() => /Paciente guardado/.test(document.getElementById('storageStatus').textContent));
  await page.reload(); await page.waitForSelector('input[data-tri]');
  assert.equal(await page.textContent('#storedCount'), '1');
  await page.selectOption('#savedPatientsSelect', {index: 1}); await page.click('#loadPatientBtn');
  await page.waitForSelector('#flowExtras:not([hidden])');
  assert.match(await page.textContent('#profState'), /Modificación aplicada/, 'la modificación y el plan se guardan con el paciente');
  assert.equal(await page.inputValue('#nextReview'), '2027-02-10');
  await page.click('#deletePatientBtn'); await dialog(page, 'Cancelar');
  assert.equal(await page.textContent('#storedCount'), '1', 'cancelar conserva el paciente');
  await page.click('#deletePatientBtn'); await dialog(page, 'Eliminar');
  await page.waitForFunction(() => document.getElementById('storedCount').textContent === '0');
  assert.deepEqual(errors, []);
});

test('copia de seguridad hostil: se valida, se recalcula y no ejecuta nada', skip, async () => {
  const {page, errors} = await open();
  const dir = fs.mkdtempSync('/tmp/cmo-hbv-bk-');
  const rec = (over = {}) => ({id: 'pat-1', pseudonym_id: 'PS-1', patient_type: 'VHB', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', latest_result: {factors: {[ALL[0]]: true}, total_score: 99, stratification_label: '<img src=x onerror="window.__xss=1">'}, evaluations: [], ...over});
  fs.writeFileSync(path.join(dir, 'evil.json'), JSON.stringify({records: [rec(), rec({id: 'pat-2', pseudonym_id: '<img src=x onerror="window.__xss=1">'}), {id: 'x'}, null]}));
  await page.setInputFiles('#backupImportInput', path.join(dir, 'evil.json'));
  await page.waitForFunction(() => /importado correctamente/.test(document.getElementById('exportStatus').textContent));
  assert.match(await page.textContent('#exportStatus'), /1 registros, 3 descartados/);
  assert.equal(await page.textContent('#storedCount'), '1');
  assert.equal(await page.evaluate(() => window.__xss), undefined); assert.equal(await page.locator('img[src="x"]').count(), 0);
  fs.writeFileSync(path.join(dir, 'malo.json'), '{"records":"no"}');
  await page.setInputFiles('#backupImportInput', path.join(dir, 'malo.json'));
  await page.waitForFunction(() => /Error al importar backup/.test(document.getElementById('exportStatus').textContent));
  assert.equal(await page.textContent('#storedCount'), '1', 'un fichero inválido no borra lo guardado');
  fs.writeFileSync(path.join(dir, 'ok.json'), JSON.stringify({records: [rec({id: 'pat-7', pseudonym_id: 'PS-7'})]}));
  await page.setInputFiles('#backupImportInput', path.join(dir, 'ok.json'));
  await dialog(page, 'Importar y sustituir');
  await page.waitForFunction(() => /importado correctamente \(1 registros\)/.test(document.getElementById('exportStatus').textContent));
  assert.deepEqual(errors, []);
});

test('reinicio y extracción asistida: la puntuación en vivo se actualiza y lo no mencionado sigue pendiente', skip, async () => {
  const {page, errors} = await open();
  await answerAll(page, [ALL[0], ALL[1]]);
  assert.notEqual(await page.textContent('#liveScoreValue'), '0');
  await page.click('#resetBtn');
  await page.waitForFunction(() => document.getElementById('liveScoreValue').textContent === '0');
  assert.equal(await page.evaluate(() => document.querySelectorAll('input[data-tri][value="pending"]:checked').length), ALL.length, 'el reinicio devuelve todo a pendiente');
  await page.fill('#aiAnalysisInput', 'Paciente VHB-VHD con cirrosis descompensada y función renal alterada. <img src=x onerror="window.__xss=1">');
  await page.click('#runAiExtractionBtn');
  await page.waitForFunction(() => !document.getElementById('applyAiExtractionBtn').disabled);
  assert.equal(await page.textContent('#liveScoreValue'), '0', 'analizar no puntúa');
  await page.click('#applyAiExtractionBtn');
  assert.notEqual(await page.textContent('#liveScoreValue'), '0');
  const pending = await page.evaluate(() => document.querySelectorAll('input[data-tri][value="pending"]:checked').length);
  assert.ok(pending > 0 && pending < ALL.length, 'lo detectado pasa a «Sí»; lo no mencionado sigue pendiente (no se convierte en «No»)');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.deepEqual(errors, []);
});

test('móvil 375 px: sin desbordamiento horizontal', skip, async () => {
  const {page, errors} = await open({width: 375, height: 740});
  await answerAll(page, [ALL[0]]);
  await stratify(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 0, `desbordamiento ${overflow}px`);
  if (OUT) await page.screenshot({path: path.join(OUT, 'movil-375.png'), fullPage: true});
  assert.deepEqual(errors, []);
});

test('sin peticiones a terceros en todo el recorrido', skip, () => { assert.deepEqual(external, []); });
