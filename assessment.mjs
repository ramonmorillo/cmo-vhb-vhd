// Adaptador de CMO-HBV/HDV al informe único y al registro de actuaciones del núcleo CMO (vendor/cmo-ds/).
// No contiene reglas clínicas: el único motor es calculateStratification() de app.js (sin cambios), que se recibe
// como parámetro (`engine`), de modo que este módulo se puede probar en Node y usar en el navegador.
import { INTERVENTION_STATUSES, parseEnvelope } from './vendor/cmo-ds/cmo-report.js';

export const CASE_SCHEMA = 'cmo-hbv-case/1';
export const APP_ID = 'cmo-vhb-vhd';
export const TOOL_NAME = 'CMO-HBV/HDV Pro';
export const MIN_JUSTIFICATION = 12;
export const PATIENT_TYPES = ['VHB', 'VHB-VHD'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const factorIds = engine => engine.APP_CONFIG.domains.flatMap(d => d.items.map(i => i.id));

/** Formulario saneado: solo factores del modelo; un factor es Sí, No o Pendiente (nunca ambos). */
export function cleanForm(engine, raw = {}) {
  const ids = factorIds(engine);
  const pending = new Set((Array.isArray(raw.pendingFactors) ? raw.pendingFactors : []).filter(id => ids.includes(id)));
  const factors = {};
  for (const id of ids) factors[id] = !pending.has(id) && raw.factors?.[id] === true;
  const o = raw.override && typeof raw.override === 'object' ? raw.override : null;
  return {
    patientType: PATIENT_TYPES.includes(raw.patientType) ? raw.patientType : '', patientId: str(raw.patientId, 40), notes: str(raw.notes, 2000),
    factors, pendingFactors: ids.filter(id => pending.has(id)),
    override: o && [1, 2, 3].includes(Number(o.level)) ? { level: Number(o.level), justification: str(o.justification, 2000) } : null,
    statuses: Object.fromEntries(Object.entries(raw.statuses && typeof raw.statuses === 'object' ? raw.statuses : {}).filter(([k, v]) => /^[123]\.\d{1,2}$/.test(k) && Object.hasOwn(INTERVENTION_STATUSES, v) && v !== 'recommended')),
    plan: { nextReview: /^\d{4}-\d{2}-\d{2}$/.test(raw.plan?.nextReview || '') ? raw.plan.nextReview : '', notes: str(raw.plan?.notes, 2000) }
  };
}

const dataFor = (engine, form, factors) => {
  const domainScores = {}, activeFactors = [];
  engine.APP_CONFIG.domains.forEach(d => { domainScores[d.key] = 0; });
  for (const d of engine.APP_CONFIG.domains) for (const item of d.items) if (factors[item.id]) { domainScores[d.key] += item.points; activeFactors.push({ id: item.id, label: item.label, points: item.points, domainKey: d.key }); }
  return { patientType: form.patientType, patientId: form.patientId, notes: form.notes, factors, domainScores, activeFactors };
};

/** Motor original + modificación profesional + información de flujo (pendientes y cota superior calculada con el motor). */
export function evaluate(engine, rawForm) {
  const form = cleanForm(engine, rawForm);
  const result = engine.calculateStratification(dataFor(engine, form, form.factors));
  const worstFactors = Object.fromEntries(Object.entries(form.factors).map(([id, v]) => [id, v || form.pendingFactors.includes(id)]));
  const worst = form.pendingFactors.length ? engine.calculateStratification(dataFor(engine, form, worstFactors)) : result;
  const override = form.override && form.override.justification.length >= MIN_JUSTIFICATION && form.override.level !== result.assignedLevel ? form.override : null;
  const finalLevel = override ? override.level : result.assignedLevel;
  const meta = engine.APP_CONFIG.thresholds.find(t => t.level === finalLevel);
  return {
    form, result, finalLevel, finalLabel: override ? meta.label : result.levelMeta.label, override,
    overrideNotApplied: !!form.override && !override && form.override.level !== result.assignedLevel,
    overrideLowers: !!override && override.level > result.assignedLevel,
    pending: form.pendingFactors, provisional: form.pendingFactors.length > 0,
    maxPossible: { total: worst.totalScore, level: worst.assignedLevel }, levelMayChange: worst.assignedLevel < result.assignedLevel
  };
}

/** Intervenciones del plan del nivel final, con identificador estable (nivel.posición). */
export const interventionCatalog = (engine, level) => engine.APP_CONFIG.carePlanByLevel[level].interventions.map((label, i) => ({ id: `${level}.${i}`, label }));
export const interventionStatus = (form, id) => (Object.hasOwn(INTERVENTION_STATUSES, form.statuses?.[id]) ? form.statuses[id] : 'recommended');

export function needsByDomain(engine, ev) {
  return engine.APP_CONFIG.domains.map(d => ({ domain: d, confirmed: ev.result.activeFactors.filter(f => f.domainKey === d.key), potential: d.items.filter(i => ev.pending.includes(i.id)) }));
}

export function buildReportInput(engine, form, ev, { version = '', date = '' } = {}) {
  const r = ev.result, cfg = engine.APP_CONFIG;
  const plan = cfg.carePlanByLevel[ev.finalLevel];
  const catalog = interventionCatalog(engine, ev.finalLevel);
  const by = s => catalog.filter(i => interventionStatus(ev.form, i.id) === s).map(i => ({ group: '', label: i.label }));
  const warnings = [];
  if (ev.provisional) {
    warnings.push(`Resultado provisional: ${ev.pending.length} factor(es) pendiente(s) de valoración. Un factor pendiente no se ha considerado ausente: no puntúa hasta que se valore.`);
    warnings.push(`Si los factores pendientes estuvieran presentes, la puntuación podría alcanzar ${ev.maxPossible.total} puntos y el nivel podría llegar a ${ev.maxPossible.level}${ev.levelMayChange ? '' : '; el nivel no cambiaría'}.`);
  }
  if (ev.overrideLowers) warnings.push('La modificación profesional disminuye el nivel asignado por el modelo: requiere justificación reforzada.');
  if (ev.overrideNotApplied) warnings.push(`Modificación no aplicada: la justificación debe tener al menos ${MIN_JUSTIFICATION} caracteres.`);
  return {
    title: 'Atención farmacéutica en hepatitis B/delta — Modelo CMO', tool: { name: TOOL_NAME, version },
    model: { name: 'Estratificación CMO VHB/VHB-VHD', source: 'Basado en la metodología CMO (MAPEX-SEFH). Modelo preliminar pendiente de validación.' },
    evaluationDate: date, status: ev.provisional ? 'provisional' : 'final', patientId: ev.form.patientId,
    context: [{ label: 'Tipo de paciente', value: ev.form.patientType }],
    stratification: {
      score: r.totalScore, subtotals: cfg.domains.map(d => ({ label: d.title, points: r.domainScores[d.key] })),
      calculatedLevel: r.levelMeta.label, finalLevel: ev.finalLabel, levelCode: ev.finalLevel,
      rules: r.overrideResolution.triggered.map(t => `Regla de seguridad: ${t}`),
      override: ev.override ? { level: ev.finalLabel, motive: '', justification: ev.override.justification } : null,
      pending: ev.pending.map(id => cfg.domains.flatMap(d => d.items).find(i => i.id === id)?.label || id)
    },
    factors: r.activeFactors.map(f => ({ dimension: cfg.domains.find(d => d.key === f.domainKey).title, label: f.label, points: f.points })),
    needs: { confirmed: [], potential: [] },
    interventions: { done: by('done'), planned: by('planned'), recommended: by('recommended'), notApplicableCount: by('not_applicable').length },
    plan: { periodicity: `${cfg.followUp.baseline} ${cfg.followUp[ev.finalLevel]}`, nextReview: ev.form.plan.nextReview, notes: [`Objetivo asistencial: ${plan.objective}`, ev.form.plan.notes].filter(Boolean).join(' · ') },
    warnings, disclaimer: 'Herramienta de apoyo profesional: no diagnóstica, no prescriptiva, no sustitutiva del juicio clínico, no producto sanitario certificado y pendiente de validación asistencial. Modelo preliminar.'
  };
}

/** Registro de paciente validado (copia de seguridad o importación). El resultado se recalcula siempre con el motor. */
export function sanitizeRecord(engine, rec) {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
  const id = typeof rec.id === 'string' && /^[\w-]{1,80}$/.test(rec.id) ? rec.id : '';
  const pseudonym = typeof rec.pseudonym_id === 'string' && /^[\w-]{1,80}$/.test(rec.pseudonym_id) ? rec.pseudonym_id : '';
  if (!id || !pseudonym || !PATIENT_TYPES.includes(rec.patient_type)) return null;
  const lr = rec.latest_result && typeof rec.latest_result === 'object' ? rec.latest_result : {};
  const form = cleanForm(engine, { patientType: rec.patient_type, patientId: rec.patient_identifier_local, notes: rec.notes_non_identifying, factors: lr.factors, pendingFactors: lr.pending_factors, override: rec.professional_override, statuses: rec.intervention_statuses, plan: rec.plan });
  const ev = evaluate(engine, form);
  const date = v => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date(0).toISOString());
  return {
    id, pseudonym_id: pseudonym, patient_identifier_local: form.patientId || null, patient_type: form.patientType, notes_non_identifying: form.notes || null,
    created_at: date(rec.created_at), updated_at: date(rec.updated_at),
    latest_result: { total_score: ev.result.totalScore, stratification_level: ev.result.assignedLevel, stratification_label: ev.result.levelMeta.label, factors: form.factors, pending_factors: form.pendingFactors, domain_scores: ev.result.domainScores },
    professional_override: form.override, intervention_statuses: form.statuses, plan: form.plan,
    evaluations: (Array.isArray(rec.evaluations) ? rec.evaluations : []).slice(0, 200).map(e => {
      const f = cleanForm(engine, { patientType: e?.patient_type, factors: e?.factors, pendingFactors: e?.pending_factors });
      const r = evaluate(engine, f).result;
      return { evaluation_id: typeof e?.evaluation_id === 'string' && /^[\w-]{1,80}$/.test(e.evaluation_id) ? e.evaluation_id : `eval-${Math.random().toString(36).slice(2, 10)}`, evaluation_date: date(e?.evaluation_date), patient_type: f.patientType, total_score: r.totalScore, stratification_level: r.assignedLevel, stratification_label: r.levelMeta.label, factors: f.factors, pending_factors: f.pendingFactors, domain_scores: r.domainScores };
    })
  };
}

/** Copia de seguridad: validada registro a registro. Devuelve los válidos y el recuento de descartados. */
export function importBackup(engine, raw) {
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'El fichero está vacío.' };
  if (raw.length > 5_000_000) return { ok: false, error: 'El fichero supera el límite de 5 MB.' };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'El fichero no es un JSON válido.' }; }
  if (!parsed || !Array.isArray(parsed.records)) return { ok: false, error: 'El archivo no contiene un array de registros válido.' };
  if (parsed.records.length > 5000) return { ok: false, error: 'El fichero supera el límite de 5000 registros.' };
  const seen = new Set(), records = [];
  let rejected = 0;
  for (const rec of parsed.records) { const k = sanitizeRecord(engine, rec); if (!k || seen.has(k.id)) { rejected += 1; continue; } seen.add(k.id); records.push(k); }
  return records.length || !parsed.records.length ? { ok: true, records, rejected } : { ok: false, error: 'Ningún registro del fichero es válido.' };
}

/** Caso individual (cmo-export/1 + cmo-hbv-case/1). */
export const serializeCase = (engine, form) => ({ schema: CASE_SCHEMA, ...cleanForm(engine, form) });
export function importCase(engine, raw) {
  const parsed = parseEnvelope(raw, { appId: APP_ID });
  if (!parsed.ok) return parsed;
  if (parsed.value.dataSchema !== CASE_SCHEMA) return { ok: false, error: `Esquema de datos no compatible (se esperaba ${CASE_SCHEMA}).` };
  return { ok: true, form: cleanForm(engine, parsed.value.data) };
}

export function csvRows(engine, ev) {
  const r = ev.result;
  return [['campo', 'valor'], ['esquema', CASE_SCHEMA], ['tipo_paciente', ev.form.patientType], ['identificador', ev.form.patientId], ['estado', ev.provisional ? 'provisional' : 'final'],
    ['puntuacion', r.totalScore], ['nivel_modelo', r.assignedLevel], ['nivel_final', ev.finalLevel], ['modificacion_profesional', ev.override ? ev.override.justification : ''], ['factores_pendientes', ev.pending.length],
    ...engine.APP_CONFIG.domains.flatMap(d => d.items.map(i => [`factor_${i.id}`, ev.pending.includes(i.id) ? 'pendiente' : ev.form.factors[i.id] ? 'si' : 'no']))];
}
