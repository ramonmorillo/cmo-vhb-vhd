// Flujo común CMO de CMO-HBV/HDV: provisional, modificación profesional, necesidades, actuaciones con estado, plan,
// informe único (texto, PDF, impresión), copias de seguridad validadas y confirmaciones. Sin lógica clínica.
import * as A from './assessment.mjs';
import { createReport, reportToText, reportToHtml, exportEnvelope, toCsv, escapeHtml as esc, INTERVENTION_STATUSES } from './vendor/cmo-ds/cmo-report.js';
import { reportToPdf } from './vendor/cmo-ds/cmo-pdf.js';
import { confirmDialog, copyText, download, guardUnsaved, printHtml, safeFilename, toast } from './vendor/cmo-ds/cmo-flow.js';

const E = window.CMO_ENGINE;
const $ = id => document.getElementById(id);
const VERSION = (() => { try { return JSON.parse($('cmo-app-meta').textContent).appVersion || ''; } catch { return ''; } })();
let lastForm = null, dirty = false;

const rawForm = data => ({ ...data, override: E.state.extras.override, statuses: E.state.extras.statuses, plan: E.state.extras.plan });
const current = () => { if (!lastForm) return null; const ev = A.evaluate(E, rawForm(lastForm)); return { ev, report: createReport(A.buildReportInput(E, lastForm, ev, { version: VERSION, date: new Date().toISOString() })) }; };
const fileBase = () => safeFilename('cmo-hbv', lastForm?.patientId || 'caso', new Date().toISOString().slice(0, 10));

function renderExtras() {
  const box = $('flowExtras');
  const cur = current();
  if (!cur) { box.hidden = true; return; }
  const { ev } = cur;
  box.hidden = false;
  const levelOptions = E.APP_CONFIG.thresholds.map(t => `<option value="${t.level}"${E.state.extras.override?.level === t.level ? ' selected' : ''}>Nivel ${t.level}</option>`).join('');
  const needs = A.needsByDomain(E, ev).map(n => `<h4>${esc(n.domain.title)}</h4><ul>${n.confirmed.map(f => `<li>${esc(f.label)} (+${f.points})</li>`).join('') || '<li>Ninguna confirmada</li>'}</ul>${n.potential.length ? `<p class="muted">Potenciales, pendientes de evaluación: ${n.potential.map(i => esc(i.label)).join('; ')}.</p>` : ''}`).join('');
  const cat = A.interventionCatalog(E, ev.finalLevel);
  box.innerHTML = `
    ${ev.provisional ? `<p class="notice-warn" role="status"><strong>Resultado provisional:</strong> ${ev.pending.length} factor(es) pendiente(s) no puntúan (no se consideran ausentes). Si estuvieran presentes, la puntuación podría alcanzar ${ev.maxPossible.total} puntos y el nivel podría llegar a ${ev.maxPossible.level}${ev.levelMayChange ? '' : '; no cambiaría'}.</p>` : ''}
    <article class="report-block"><h3>Modificación por criterio profesional</h3>
      <p class="muted">El resultado del modelo se conserva siempre. La modificación solo se aplica con una justificación de al menos ${A.MIN_JUSTIFICATION} caracteres.</p>
      <div class="grid two">
        <label>Nivel final<select id="profLevel"><option value="">Sin modificación</option>${levelOptions}</select></label>
        <label>Justificación clínica<textarea id="profJustification" rows="2" maxlength="2000">${esc(E.state.extras.override?.justification || '')}</textarea></label>
      </div>
      <p class="muted" id="profState" aria-live="polite">${ev.override ? `Modificación aplicada: ${esc(ev.finalLabel)} (el modelo asigna Nivel ${ev.result.assignedLevel}).` : ev.overrideNotApplied ? `No se aplica: la justificación debe tener al menos ${A.MIN_JUSTIFICATION} caracteres.` : 'Sin modificación profesional.'}</p>
      ${ev.overrideLowers ? '<p class="notice-warn" role="status">La modificación disminuye el nivel del modelo: documente una justificación reforzada.</p>' : ''}
    </article>
    <article class="report-block"><h3>Necesidades detectadas</h3>${needs}</article>
    <article class="report-block"><h3>Estado de las actuaciones (Nivel ${ev.finalLevel})</h3><p class="muted">Registre cuáles ha realizado, cuáles quedan planificadas y cuáles no proceden.</p>
      <ul class="status-list">${cat.map((i, n) => `<li><span id="int-${n}">${esc(i.label)}</span><select data-int="${i.id}" aria-labelledby="int-${n}">${Object.entries(INTERVENTION_STATUSES).map(([k, l]) => `<option value="${k}"${A.interventionStatus(ev.form, i.id) === k ? ' selected' : ''}>${l}</option>`).join('')}</select></li>`).join('')}</ul>
      <div class="grid two"><label>Próxima valoración prevista<input type="date" id="nextReview" value="${esc(E.state.extras.plan.nextReview)}" /></label><label>Observaciones y acuerdos<textarea id="planNotes" rows="2" maxlength="2000">${esc(E.state.extras.plan.notes)}</textarea></label></div>
    </article>`;
  $('profLevel').onchange = $('profJustification').onchange = () => {
    const level = Number($('profLevel').value);
    E.state.extras.override = level ? { level, justification: $('profJustification').value.trim() } : null;
    dirty = true; renderExtras();
  };
  box.querySelectorAll('select[data-int]').forEach(sel => { sel.onchange = () => { const st = { ...E.state.extras.statuses }; if (sel.value === 'recommended') delete st[sel.dataset.int]; else st[sel.dataset.int] = sel.value; E.state.extras.statuses = st; dirty = true; }; });
  $('nextReview').onchange = e => { E.state.extras.plan = { ...E.state.extras.plan, nextReview: e.target.value }; dirty = true; };
  $('planNotes').onchange = e => { E.state.extras.plan = { ...E.state.extras.plan, notes: e.target.value }; dirty = true; };
}

document.addEventListener('cmo:result', () => { lastForm = E.collectFormData(); dirty = true; renderExtras(); });
document.addEventListener('cmo:reset', () => { lastForm = null; dirty = false; $('flowExtras').hidden = true; });

$('copyBtn').addEventListener('click', async () => {
  const c = current(); if (!c) return;
  const ok = await copyText(reportToText(c.report));
  $('copyStatus').textContent = ok ? 'Informe copiado al portapapeles. Revíselo antes de incorporarlo a la historia clínica.' : 'No se ha podido copiar automáticamente: descargue el texto y cópielo.';
});
$('printBtn').addEventListener('click', () => { const c = current(); if (c) printHtml(reportToHtml(c.report), c.report.title); });
$('pdfBtn').addEventListener('click', () => { const c = current(); if (!c) return; download(`${fileBase()}.pdf`, reportToPdf(c.report), 'application/pdf'); toast('PDF generado.'); });
$('txtBtn').addEventListener('click', () => { const c = current(); if (!c) return; download(`${fileBase()}.txt`, reportToText(c.report)); toast('Texto descargado.'); });
$('caseJsonBtn').addEventListener('click', () => {
  const c = current(); if (!c) return;
  download(`${fileBase()}.json`, JSON.stringify(exportEnvelope({ app: { id: A.APP_ID, name: A.TOOL_NAME, version: VERSION }, exportedAt: new Date().toISOString(), dataSchema: A.CASE_SCHEMA, data: A.serializeCase(E, rawForm(lastForm)), report: c.report }), null, 2), 'application/json');
  toast('Datos estructurados exportados (JSON).');
});
$('caseCsvBtn').addEventListener('click', () => { const c = current(); if (!c) return; download(`${fileBase()}.csv`, toCsv(A.csvRows(E, c.ev)), 'text/csv;charset=utf-8'); toast('Datos estructurados exportados (CSV).'); });
['savePatientBtn', 'updatePatientBtn'].forEach(id => $(id).addEventListener('click', () => setTimeout(() => { dirty = false; }, 0)));

// Copias de seguridad: validadas registro a registro; sustituir exige confirmación.
$('backupImportInput').addEventListener('change', async e => {
  const file = e.target.files?.[0]; e.target.value = '';
  if (!file) return;
  const res = A.importBackup(E, await file.text());
  if (!res.ok) { E.setExportStatus(`Error al importar backup: ${res.error}`, true); toast(`No se ha podido importar: ${res.error}`, { type: 'error' }); return; }
  const existing = E.patientRepository.list().length;
  if (existing && !(await confirmDialog({ title: 'Sustituir los pacientes guardados', message: `Se sustituirán los ${existing} registro(s) guardado(s) por ${res.records.length} registro(s) válido(s) del fichero${res.rejected ? ` (${res.rejected} descartado(s) por no ser válidos)` : ''}. Los resultados se recalculan con el motor del modelo.`, confirmLabel: 'Importar y sustituir', danger: true }))) return;
  E.patientRepository.replaceAll(res.records);
  E.refreshPatientsList();
  E.setExportStatus(`Backup importado correctamente (${res.records.length} registros${res.rejected ? `, ${res.rejected} descartados` : ''}).`);
  toast('Copia de seguridad importada y validada.');
});

// Borrar un paciente guardado (antes no era posible), con confirmación.
$('deletePatientBtn').addEventListener('click', async () => {
  const id = E.state.currentPatientId || $('savedPatientsSelect').value;
  if (!id) { E.setStorageStatus('Seleccione o cargue un paciente para eliminarlo.', true); return; }
  if (!(await confirmDialog({ title: 'Eliminar paciente guardado', message: 'Se eliminará el registro guardado en este navegador, con todas sus evaluaciones. Esta acción no se puede deshacer.', confirmLabel: 'Eliminar', danger: true }))) return;
  E.patientRepository.replaceAll(E.patientRepository.list().filter(r => r.id !== id));
  E.refreshPatientsList();
  E.startNewRecord();
  E.setStorageStatus('Paciente eliminado.');
  toast('Paciente eliminado.');
});
guardUnsaved(() => dirty && !!E.state.lastResult);
