// Casos de referencia (pruebas de caracterización) de CMO-HBV/HDV Pro.
// Congelan el comportamiento ACTUAL de app.js (APP_CONFIG, cálculo, reglas de seguridad, extracción
// heurística, pseudónimo y estructura de exportación) con valores literales. Si una prueba falla, el
// comportamiento clínico o de datos ha cambiado: exige revisión explícita, nunca actualizar la prueba sin ella.
// Ejecutar: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadApp } from './load-app.mjs';

const A = loadApp();
const ALL = A.APP_CONFIG.domains.flatMap((d) => d.items.map((i) => i.id));
// Construye la entrada de calculateStratification igual que collectFormData() (casillas marcadas).
const caso = (ids, patientType = 'VHB') => {
  const factors = Object.fromEntries(ALL.map((id) => [id, ids.includes(id)]));
  return { patientType, patientId: '', notes: '', factors, domainScores: {}, activeFactors: ids.map((id) => ({ ...A.findItem(id) })) };
};
const run = (ids) => A.calculateStratification(caso(ids));
// Los objetos del contexto vm tienen prototipos de otro «realm»: se normalizan con JSON antes de deepEqual.
const plain = (v) => JSON.parse(JSON.stringify(v));
const detect = (texto) => Object.entries(A.extractFromAiAnalysis(texto).factors).filter(([, v]) => v).map(([k]) => k);

test('instantánea del modelo: umbrales, dominios y pesos, reglas, seguimiento y claves de almacenamiento sin cambios', () => {
  const snap = JSON.parse(fs.readFileSync(new URL('./fixtures/modelo-clinico.snapshot.json', import.meta.url), 'utf8'));
  const C = A.APP_CONFIG;
  const now = {
    thresholds: C.thresholds,
    domains: C.domains.map((d) => ({ key: d.key, items: d.items.map((i) => [i.id, i.points]) })),
    overrides: C.overrides.map((o) => ({ id: o.id, minLevel: o.minLevel })),
    followUp: C.followUp,
    storageKeys: A.STORAGE_KEYS
  };
  assert.deepEqual(plain(now), snap);
});

test('literales críticos: umbrales 13/8/0, 12 factores, máximo 35 puntos, clave hbv_hdv_patients_v1', () => {
  assert.deepEqual(plain(A.APP_CONFIG.thresholds.map((t) => [t.min, t.level])), [[13, 1], [8, 2], [0, 3]]);
  assert.equal(ALL.length, 12);
  assert.equal(run(ALL).totalScore, 35);
  assert.equal(A.STORAGE_KEYS.patients, 'hbv_hdv_patients_v1');
});

test('sin factores: 0 puntos, Nivel 3', () => {
  const r = run([]);
  assert.equal(r.totalScore, 0);
  assert.equal(r.assignedLevel, 3);
  assert.deepEqual(plain(r.overrideResolution.triggered), []);
});

test('frontera Nivel 3/2: 7 puntos → 3; 8 puntos → 2', () => {
  const r7 = run(['cirrosis', 'insuficiencia_renal']); // 4 + 3
  assert.equal(r7.totalScore, 7); assert.equal(r7.assignedLevel, 3);
  const r8 = run(['cirrosis', 'adherencia_suboptima']); // 4 + 4
  assert.equal(r8.totalScore, 8); assert.equal(r8.assignedLevel, 2);
});

test('frontera Nivel 2/1: 12 puntos → 2; 13 puntos → 1', () => {
  const r12 = run(['cirrosis', 'adherencia_suboptima', 'autoadministracion', 'cambio_antiviral']); // 4+4+2+2
  assert.equal(r12.totalScore, 12); assert.equal(r12.assignedLevel, 2);
  const r13 = run(['cirrosis', 'adherencia_suboptima', 'polimedicacion', 'cirrosis_descompensada']); // 4+4+3+2
  assert.equal(r13.totalScore, 13); assert.equal(r13.assignedLevel, 1);
});

test('reglas de seguridad: elevan a Nivel 2 como mínimo y nunca rebajan un Nivel 1', () => {
  const desc = run(['cirrosis_descompensada']); // 2 puntos
  assert.equal(desc.baseLevel.level, 3); assert.equal(desc.assignedLevel, 2);
  assert.deepEqual(plain(desc.overrideResolution.triggered), ['Cirrosis descompensada impide clasificación en Nivel 3.']);
  assert.equal(run(['trasplante', 'tratamiento_complejo']).assignedLevel, 2); // 6 puntos
  assert.equal(run(['trasplante']).assignedLevel, 3, 'trasplante sin tratamiento complejo no activa la regla');
  assert.equal(run(['adherencia_suboptima', 'barreras_seguimiento']).assignedLevel, 2); // 7 puntos
  assert.equal(run(['adherencia_suboptima']).assignedLevel, 3);
  const alto = run(['cirrosis', 'cirrosis_descompensada', 'trasplante', 'tratamiento_complejo', 'adherencia_suboptima']); // 16
  assert.equal(alto.assignedLevel, 1);
  assert.equal(alto.overrideResolution.triggered.length, 2);
});

test('HALLAZGO documentado: con regla de seguridad, el texto del nivel cita un rango que no corresponde a la puntuación', () => {
  // Comportamiento actual (no corregido): 2 puntos → «Nivel 2 (complejidad intermedia, 8-12 puntos)».
  const r = run(['cirrosis_descompensada']);
  assert.equal(r.levelMeta.label, 'Nivel 2 (complejidad intermedia, 8-12 puntos)');
  assert.match(r.narrative, /clasificado como Nivel 2 \(complejidad intermedia, 8-12 puntos\) .*puntuación total de 2 puntos/);
});

test('seguimiento y plan por nivel', () => {
  assert.equal(run(ALL).reevalText, 'Todos los pacientes VHB/VHB-VHD: evaluación al inicio del tratamiento. Reevaluación cada 3 meses.');
  assert.equal(run([]).carePlan.interventions.length, 4);
  assert.equal(run(ALL).carePlan.interventions.length, 7);
});

test('extracción heurística: detección básica y negación inmediata', () => {
  const e = A.extractFromAiAnalysis('Hepatitis delta. Tratamiento con bulevirtida. Mala adherencia.');
  assert.equal(e.patientType, 'VHB-VHD');
  assert.deepEqual(detect('Hepatitis delta. Tratamiento con bulevirtida. Mala adherencia.').sort(),
    ['adherencia_suboptima', 'tratamiento_complejo', 'vih_coinfeccion']);
  assert.deepEqual(detect('Sin cirrosis. Niega polimedicación.'), []);
  assert.equal(A.extractFromAiAnalysis('Hepatitis B crónica').patientType, 'VHB');
  assert.equal(A.extractFromAiAnalysis('texto sin datos').patientType, '');
});

test('HALLAZGO documentado: falsos positivos y negativos de la extracción heurística', () => {
  // Comportamiento actual (no corregido). La extracción solo prellena tras revisión humana, pero puede inducir error.
  assert.deepEqual(detect('Paciente sin signos de descompensación'), ['cirrosis_descompensada'], 'negación no inmediata');
  assert.deepEqual(detect('no presenta cirrosis'), ['cirrosis'], 'negación no inmediata');
  assert.deepEqual(detect('Tercera visita, cerca del hospital'), ['insuficiencia_renal'], 'patrón «erc» como subcadena');
  assert.deepEqual(detect('Sin ingresos en los últimos 12 meses'), ['cambio_antiviral'], 'patrón temporal genérico');
  assert.deepEqual(detect('No cirrosis. Cirrosis confirmada por biopsia'), [], 'solo se examina la primera aparición');
  assert.equal(A.extractFromAiAnalysis('VHB sin VHD').patientType, 'VHB-VHD', 'el tipo de paciente ignora la negación');
});

test('HALLAZGO documentado: el pseudónimo es un hash de 32 bits sin sal del identificador local', () => {
  // Comportamiento actual (no corregido): determinista y reproducible por fuerza bruta sobre el espacio de
  // identificadores (p. ej., NHC numéricos). Es el patient_id de todas las exportaciones de investigación.
  assert.equal(A.generateStablePseudoId('abc'), 'PSEUDO-000022CI');
  assert.equal(A.generateStablePseudoId('patient-1'), 'PSEUDO-005OKA6V');
  assert.equal(A.generateStablePseudoId('abc'), A.generateStablePseudoId('abc'));
});

test('estructura de exportación de investigación: columnas, exclusión de identificadores y diccionario', () => {
  const rec = {
    id: 'pat-x', pseudonym_id: 'PSEUDO-1', patient_identifier_local: 'NHC-123', notes_non_identifying: 'nota',
    created_at: 'c', updated_at: 'u', patient_type: 'VHB',
    latest_result: { total_score: 4, stratification_level: 3, stratification_label: 'L', factors: { cirrosis: true } },
    evaluations: [{ evaluation_id: 'e1', evaluation_date: 'd', patient_type: 'VHB', total_score: 4, stratification_level: 3, stratification_label: 'L', factors: { cirrosis: true } }]
  };
  const ds = A.buildResearchDatasets([rec]);
  const factorCols = ALL.map((id) => `factor_${id}`);
  assert.deepEqual(Object.keys(ds.patients[0]),
    ['patient_id', 'created_at', 'updated_at', 'patient_type', 'total_score', 'stratification_level', 'stratification_label', ...factorCols]);
  assert.deepEqual(Object.keys(ds.evaluations[0]),
    ['evaluation_id', 'patient_id', 'evaluation_date', 'patient_type', 'total_score', 'stratification_level', 'stratification_label', ...factorCols]);
  assert.equal(ds.patients[0].factor_cirrosis, true);
  assert.equal(ds.patients[0].factor_trasplante, false);
  const json = JSON.stringify(ds);
  assert.ok(!json.includes('NHC-123') && !json.includes('nota'), 'sin identificador local ni notas');
  assert.equal(ds.dataDictionary.length, 14);
  assert.equal(ds.dataDictionary[0].variable_name, 'patient_id');
});
