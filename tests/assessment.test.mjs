// Adaptador de CMO-HBV/HDV (assessment.mjs). La configuración clínica y el cálculo de app.js no se modifican.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { loadApp } from './load-app.mjs';
import * as A from '../assessment.mjs';
import { createReport, validateReport, reportToText, toCsv } from '../vendor/cmo-ds/cmo-report.js';
import { reportToPdf } from '../vendor/cmo-ds/cmo-pdf.js';

const E = loadApp();
const ALL = E.APP_CONFIG.domains.flatMap(d => d.items);
const form = (over = {}) => ({ patientType: 'VHB', patientId: 'HEP-0001', notes: '', factors: {}, pendingFactors: [], ...over });
const allNo = (over = {}) => form({ factors: Object.fromEntries(ALL.map(i => [i.id, false])), ...over });
const yes = ids => allNo({ factors: Object.fromEntries(ALL.map(i => [i.id, ids.includes(i.id)])) });
// Subconjunto de factores cuyo total es exactamente n (sin reglas de seguridad activas).
function idsFor(n) {
  const best = new Map([[0, []]]);
  for (const i of ALL) for (const [sum, ids] of [...best]) if (!best.has(sum + i.points) && sum + i.points <= n) best.set(sum + i.points, [...ids, i.id]);
  return best.get(n);
}

test('la configuración clínica y el cálculo de app.js no se han modificado (huellas)', () => {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const h = t => crypto.createHash('sha256').update(t).digest('hex');
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/motor.sha256.json', import.meta.url), 'utf8'));
  assert.equal(h(src.slice(0, src.indexOf('const STORAGE_KEYS'))), expected.configuracion);
  assert.equal(h(src.slice(src.indexOf('function calculateStratification'), src.indexOf('function renderResult'))), expected.calculo);
});

test('umbrales: el flujo nuevo devuelve exactamente el resultado del motor', () => {
  for (const t of E.APP_CONFIG.thresholds) for (const n of [t.min - 1, t.min]) {
    if (n < 0) continue;
    const ids = idsFor(n); if (!ids) continue;
    const ev = A.evaluate(E, yes(ids));
    if (ev.result.overrideResolution.triggered.length) continue;
    assert.equal(ev.result.totalScore, n); assert.equal(ev.finalLevel, E.determineLevelByThreshold(n).level); assert.equal(ev.provisional, false);
  }
});

test('«Pendiente» no es «No»: sin valorar es provisional con cota superior calculada con el motor', () => {
  const ev = A.evaluate(E, form({ pendingFactors: ALL.map(i => i.id) }));
  assert.equal(ev.result.totalScore, 0); assert.equal(ev.provisional, true); assert.equal(ev.pending.length, ALL.length);
  assert.equal(ev.maxPossible.total, E.calculateStratification({ patientType: 'VHB', factors: Object.fromEntries(ALL.map(i => [i.id, true])), domainScores: Object.fromEntries(E.APP_CONFIG.domains.map(d => [d.key, d.items.reduce((n, i) => n + i.points, 0)])), activeFactors: ALL.map(i => ({ id: i.id, label: i.label, points: i.points, domainKey: E.APP_CONFIG.domains.find(d => d.items.includes(i)).key })) }).totalScore);
  assert.equal(ev.levelMayChange, true);
  const full = A.evaluate(E, allNo()); assert.equal(full.provisional, false); assert.equal(full.maxPossible.total, full.result.totalScore);
  assert.deepEqual(A.cleanForm(E, { factors: { [ALL[0].id]: true }, pendingFactors: [ALL[0].id] }).factors[ALL[0].id], false, 'pendiente y «Sí» a la vez: gana pendiente');
});

test('reglas de seguridad: se conservan y se citan en el informe', () => {
  const rule = E.APP_CONFIG.overrides[0];
  const ev = ALL.map(i => i.id).map(id => A.evaluate(E, yes([id]))).find(e => e.result.overrideResolution.triggered.length);
  assert.ok(ev, 'algún factor activa una regla de seguridad');
  assert.match(reportToText(createReport(A.buildReportInput(E, form(), ev))), /Regla especial: Regla de seguridad/);
  assert.ok(rule);
});

test('modificación profesional: exige justificación, conserva el nivel del modelo y avisa si lo rebaja', () => {
  const ids = idsFor(E.APP_CONFIG.thresholds[0].min) || [];
  const base = A.evaluate(E, yes(ids)), modelLevel = base.result.assignedLevel;
  const lower = modelLevel < 3 ? modelLevel + 1 : modelLevel - 1;
  let ev = A.evaluate(E, yes(ids).override === undefined ? { ...yes(ids), override: { level: lower, justification: 'corta' } } : null);
  assert.equal(ev.finalLevel, modelLevel); assert.equal(ev.overrideNotApplied, true);
  ev = A.evaluate(E, { ...yes(ids), override: { level: lower, justification: 'Justificación clínica documentada' } });
  assert.equal(ev.finalLevel, lower); assert.equal(ev.result.assignedLevel, modelLevel); assert.equal(ev.overrideLowers, lower > modelLevel);
  const text = reportToText(createReport(A.buildReportInput(E, form(), ev)));
  assert.match(text, /Modificación por criterio profesional:/); assert.match(text, /Resultado calculado por el modelo:/);
  assert.equal(A.cleanForm(E, { override: { level: 9, justification: 'x'.repeat(30) } }).override, null);
});

test('informe: cada factor que puntúa aparece una vez; actuaciones con estado; plan; PDF', () => {
  const ids = idsFor(10) || ALL.slice(0, 2).map(i => i.id);
  const raw = { ...yes(ids), statuses: { '1.0': 'done', '1.1': 'planned', '2.0': 'done', '3.0': 'done' }, plan: { nextReview: '2027-02-10', notes: 'Llamada.' } };
  const ev = A.evaluate(E, raw), report = createReport(A.buildReportInput(E, raw, ev, { version: '1.1.0', date: '2026-11-11T10:00:00' }));
  assert.deepEqual(validateReport(report), []); assert.equal(report.status, 'final');
  assert.equal(report.factors.length, ev.result.activeFactors.length);
  const text = reportToText(report);
  assert.match(text, /Próxima valoración prevista: 10\/02\/2027/); assert.match(text, /Objetivo asistencial:/);
  assert.ok(Buffer.from(reportToPdf(report)).toString('latin1').includes('HEP-0001'));
});

test('copia de seguridad hostil: registros validados, resultado recalculado, duplicados y tipos descartados', () => {
  const good = { id: 'pat-1', pseudonym_id: 'PS-1', patient_type: 'VHB', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', latest_result: { factors: { [ALL[0].id]: true }, total_score: 99, stratification_level: 1, stratification_label: '<img src=x onerror=1>' }, evaluations: [{ evaluation_id: 'eval-1', factors: { [ALL[0].id]: true }, total_score: 99 }] };
  const evil = { ...good, id: 'pat-2', pseudonym_id: '<img src=x onerror=1>' };
  const res = A.importBackup(E, JSON.stringify({ records: [good, good, evil, { id: 'x' }, null, { ...good, id: 'pat-3', patient_type: 'otro' }, { ...good, id: 'pat-4', pseudonym_id: 'PS-4', patient_type: 'VHB-VHD', latest_result: { factors: { inventado: true } } }] }));
  assert.equal(res.ok, true); assert.deepEqual(res.records.map(r => r.id), ['pat-1', 'pat-4']); assert.equal(res.rejected, 5);
  assert.equal(res.records[0].latest_result.total_score, ALL[0].points, 'el resultado se recalcula; no se toma del fichero');
  assert.ok(!res.records[0].latest_result.stratification_label.includes('<'));
  for (const bad of ['', 'no json', '{"records":1}', JSON.stringify({ records: [{ id: 'x' }] })]) assert.equal(A.importBackup(E, bad).ok, false, bad);
  assert.equal(A.importBackup(E, JSON.stringify({ records: [] })).ok, true);
});

test('registro anterior sin pendientes: lo no marcado es «No» (no se reinterpreta)', () => {
  const rec = A.sanitizeRecord(E, { id: 'pat-9', pseudonym_id: 'PS-9', patient_type: 'VHB', latest_result: { factors: { [ALL[1].id]: true } }, evaluations: [] });
  assert.equal(rec.latest_result.pending_factors.length, 0); assert.equal(rec.latest_result.factors[ALL[0].id], false);
});

test('CSV: fórmulas neutralizadas; exportación de caso con esquema', () => {
  const raw = allNo({ patientId: '=HYPERLINK("x")' }), ev = A.evaluate(E, raw);
  assert.ok(toCsv(A.csvRows(E, ev)).includes(`"'=HYPERLINK(""x"")"`));
  assert.equal(A.serializeCase(E, raw).schema, 'cmo-hbv-case/1');
  assert.equal(A.importCase(E, 'no json').ok, false);
});

test('la aplicación no contiene red', () => {
  for (const f of ['assessment.mjs', 'flow.mjs', 'engine-bridge.js']) assert.doesNotMatch(fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//, f);
});
