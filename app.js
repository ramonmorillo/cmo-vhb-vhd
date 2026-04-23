/* Configuración central editable para adaptar pesos, umbrales y textos clínicos. */
const APP_CONFIG = {
  appName: 'CMO-HBV/HDV Pro',
  subtitle: 'Herramienta de apoyo a la priorización farmacéutica en pacientes con VHB o VHB-VHD.',
  thresholds: [
    { min: 26, level: 1, label: 'Nivel 1 (alta complejidad / prioritario)' },
    { min: 16, level: 2, label: 'Nivel 2 (complejidad intermedia)' },
    { min: 0, level: 3, label: 'Nivel 3 (baja complejidad)' }
  ],
  levelLegend: [
    { level: 1, title: 'Nivel 1', description: 'Alta complejidad: intervención farmacéutica intensiva y proactiva.' },
    { level: 2, title: 'Nivel 2', description: 'Complejidad intermedia: seguimiento estructurado y foco en adherencia.' },
    { level: 3, title: 'Nivel 3', description: 'Baja complejidad: mantenimiento de estabilidad terapéutica.' }
  ],
  domains: [
    {
      key: 'severidad',
      title: 'A. Severidad de enfermedad hepática',
      items: [
        { id: 'cirrosis', label: 'Cirrosis', points: 4 },
        { id: 'cirrosis_descompensada', label: 'Cirrosis descompensada (últimos 3 meses)', points: 2 },
        { id: 'trasplante', label: 'Trasplante hepático', points: 3 }
      ]
    },
    {
      key: 'comorbilidad',
      title: 'B. Comorbilidad y complejidad clínica',
      items: [
        { id: 'vih_coinfeccion', label: 'Coinfección por VIH y/o VHD', points: 3 },
        { id: 'insuficiencia_renal', label: 'Función renal alterada / insuficiencia renal', points: 3 }
      ]
    },
    {
      key: 'farmacoterapia',
      title: 'C. Complejidad farmacoterapéutica',
      items: [
        {
          id: 'tratamiento_complejo',
          label: 'Tratamiento con bulevirtida, interferón o fármaco de nueva comercialización (últimos 12 meses)',
          points: 3
        },
        { id: 'cambio_antiviral', label: 'Inicio o cambio reciente de antiviral (<12 meses)', points: 2 },
        { id: 'polimedicacion', label: 'Polimedicación clínicamente relevante (≥5 medicamentos crónicos)', points: 3 },
        { id: 'interacciones', label: 'Interacciones farmacológicas potencialmente significativas', points: 3 }
      ]
    },
    {
      key: 'adherencia',
      title: 'D. Adherencia y automanejo',
      items: [
        { id: 'adherencia_suboptima', label: 'Adherencia subóptima documentada', points: 4 },
        { id: 'autoadministracion', label: 'Dificultades de autoadministración', points: 2 }
      ]
    },
    {
      key: 'contexto',
      title: 'E. Acceso y factores contextuales',
      items: [
        { id: 'barreras_seguimiento', label: 'Barreras de seguimiento (idioma, vulnerabilidad social, acceso, etc.)', points: 3 }
      ]
    }
  ],
  overrides: [
    {
      id: 'no_nivel3_cirrosis_descompensada',
      description: 'Cirrosis descompensada impide clasificación en Nivel 3.',
      evaluate: (factors) => factors.cirrosis_descompensada,
      minLevel: 2
    },
    {
      id: 'no_nivel3_trasplante_mas_tratamiento_complejo',
      description: 'Trasplante hepático + tratamiento complejo impide clasificación en Nivel 3.',
      evaluate: (factors) => factors.trasplante && factors.tratamiento_complejo,
      minLevel: 2
    },
    {
      id: 'no_nivel3_adherencia_mas_barreras',
      description: 'Adherencia subóptima + barreras de seguimiento impide clasificación en Nivel 3.',
      evaluate: (factors) => factors.adherencia_suboptima && factors.barreras_seguimiento,
      minLevel: 2
    }
  ],
  followUp: {
    baseline: 'Todos los pacientes VHB/VHB-VHD: evaluación al inicio del tratamiento.',
    1: 'Reevaluación cada 3 meses.',
    2: 'Reevaluación cada 6 meses y luego anual salvo criterio profesional o cercanía a cambio de nivel.',
    3: 'Reevaluación cada 12 meses y luego anual salvo criterio profesional o cercanía a cambio de nivel.'
  },
  carePlanByLevel: {
    1: {
      objective: 'Atención farmacéutica intensiva y manejo proactivo del riesgo.',
      interventions: [
        'Revisión integral de la medicación.',
        'Evaluación de interacciones farmacológicas.',
        'Valoración e intervención sobre adherencia.',
        'Entrevista clínica estructurada.',
        'Coordinación con el equipo de hepatología.',
        'Seguimiento mediante telefarmacia.',
        'Educación al paciente y apoyo al automanejo.'
      ]
    },
    2: {
      objective: 'Refuerzo de la adherencia y monitorización de la complejidad terapéutica.',
      interventions: [
        'Revisión periódica de la medicación.',
        'Evaluación de adherencia.',
        'Educación al paciente.',
        'Monitorización de interacciones potenciales.',
        'Visitas de seguimiento estructuradas.',
        'Posible seguimiento telemático / telefarmacia.'
      ]
    },
    3: {
      objective: 'Mantenimiento de la estabilidad terapéutica y prevención de complicaciones futuras.',
      interventions: [
        'Consulta breve de atención farmacéutica.',
        'Confirmación de adherencia.',
        'Monitorización rutinaria de la farmacoterapia.',
        'Prevención de futuras complicaciones.'
      ]
    }
  },
  disclaimers: [
    'Herramienta de apoyo a la práctica clínica farmacéutica; no sustituye el juicio clínico profesional.',
    'Umbrales y pesos preliminares, pendientes de calibración y validación futura.',
    'No es un producto sanitario.',
    'Evite introducir datos identificativos directos del paciente.'
  ]
};

const STORAGE_KEYS = {
  detailsOpen: 'hbv_hdv_details_open',
  patients: 'hbv_hdv_patients_v1'
};

const state = {
  lastResult: null,
  currentPatientId: null,
  preferences: {
    detailsOpen: JSON.parse(localStorage.getItem(STORAGE_KEYS.detailsOpen) || 'false')
  }
};

const patientRepository = {
  list() {
    return safeJsonParse(localStorage.getItem(STORAGE_KEYS.patients), []);
  },
  getById(id) {
    return this.list().find((record) => record.id === id) || null;
  },
  save(record) {
    const records = this.list();
    records.push(record);
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(records));
    return record;
  },
  update(id, updater) {
    const records = this.list();
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) return null;
    records[index] = updater(records[index]);
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(records));
    return records[index];
  },
  replaceAll(records) {
    localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(records));
  }
};

function init() {
  document.getElementById('appName').textContent = APP_CONFIG.appName;
  document.getElementById('appSubtitle').textContent = APP_CONFIG.subtitle;
  renderLevelLegend();
  renderDomains();
  renderDisclaimers();
  bindEvents();

  const details = document.getElementById('detailsPanel');
  details.open = state.preferences.detailsOpen;

  refreshPatientsList();
}

function safeJsonParse(text, fallback) {
  try {
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

function renderLevelLegend() {
  const legend = document.getElementById('levelLegend');
  legend.innerHTML = '';

  APP_CONFIG.levelLegend.forEach((item) => {
    const article = document.createElement('article');
    article.className = `legend-item legend-${item.level}`;
    article.innerHTML = `
      <strong>${item.title}</strong>
      <p>${item.description}</p>
    `;
    legend.appendChild(article);
  });
}

function renderDomains() {
  const container = document.getElementById('domainsContainer');
  APP_CONFIG.domains.forEach((domain) => {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'domain';

    const legend = document.createElement('legend');
    legend.textContent = domain.title;
    fieldset.appendChild(legend);

    domain.items.forEach((item) => {
      const row = document.createElement('label');
      row.className = 'option-row';
      row.innerHTML = `
        <span class="option-main">
          <input type="checkbox" data-item-id="${item.id}" data-domain="${domain.key}" />
          <span>${item.label}</span>
        </span>
        <small class="point-chip">${item.points} puntos</small>
      `;
      fieldset.appendChild(row);
    });

    container.appendChild(fieldset);
  });
}

function renderDisclaimers() {
  const list = document.getElementById('disclaimers');
  APP_CONFIG.disclaimers.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
}

function bindEvents() {
  const form = document.getElementById('stratificationForm');
  const resetBtn = document.getElementById('resetBtn');
  const copyBtn = document.getElementById('copyBtn');
  const printBtn = document.getElementById('printBtn');
  const detailsPanel = document.getElementById('detailsPanel');

  form.addEventListener('submit', onSubmit);
  resetBtn.addEventListener('click', onReset);
  copyBtn.addEventListener('click', copySummary);
  printBtn.addEventListener('click', () => window.print());

  detailsPanel.addEventListener('toggle', () => {
    localStorage.setItem(STORAGE_KEYS.detailsOpen, JSON.stringify(detailsPanel.open));
  });

  document.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      checkbox.closest('.option-row')?.classList.toggle('is-selected', checkbox.checked);
    });
  });

  document.getElementById('savePatientBtn').addEventListener('click', onSavePatient);
  document.getElementById('updatePatientBtn').addEventListener('click', onUpdatePatient);
  document.getElementById('loadPatientBtn').addEventListener('click', onLoadPatient);
  document.getElementById('newRecordBtn').addEventListener('click', startNewRecord);

  document.getElementById('exportExcelBtn').addEventListener('click', () => exportResearchData('xlsx'));
  document.getElementById('exportCsvBtn').addEventListener('click', () => exportResearchData('csv'));
  document.getElementById('exportJsonBtn').addEventListener('click', () => exportResearchData('json'));
  document.getElementById('backupExportBtn').addEventListener('click', exportBackupJson);
  document.getElementById('backupImportInput').addEventListener('change', importBackupJson);
}

function onSubmit(event) {
  event.preventDefault();

  const validationMsg = document.getElementById('validationMsg');
  validationMsg.textContent = '';

  const patientType = document.getElementById('patientType').value;
  if (!patientType) {
    validationMsg.textContent = 'Seleccione el tipo de paciente antes de continuar.';
    return;
  }

  const formData = collectFormData();
  const result = calculateStratification(formData);
  state.lastResult = result;
  renderResult(result);
  setStorageStatus('Estratificación calculada. Use “Guardar paciente” o “Actualizar paciente” para persistir.');
}

function onReset() {
  document.getElementById('resultCard').classList.add('hidden');
  document.getElementById('validationMsg').textContent = '';
  document.querySelectorAll('.option-row.is-selected').forEach((row) => row.classList.remove('is-selected'));
  state.lastResult = null;
}

function collectFormData() {
  const factors = {};
  const domainScores = {};
  const activeFactors = [];

  APP_CONFIG.domains.forEach((domain) => {
    domainScores[domain.key] = 0;
  });

  const checkboxes = document.querySelectorAll('input[type="checkbox"][data-item-id]');
  checkboxes.forEach((checkbox) => {
    const itemId = checkbox.dataset.itemId;
    const domainKey = checkbox.dataset.domain;
    const itemDef = findItem(itemId);
    const checked = checkbox.checked;

    factors[itemId] = checked;
    if (checked) {
      domainScores[domainKey] += itemDef.points;
      activeFactors.push({ id: itemDef.id, label: itemDef.label, points: itemDef.points, domainKey });
    }
  });

  return {
    patientType: document.getElementById('patientType').value,
    patientId: document.getElementById('patientId').value.trim(),
    notes: document.getElementById('clinicalNotes').value.trim(),
    factors,
    domainScores,
    activeFactors
  };
}

function findItem(itemId) {
  for (const domain of APP_CONFIG.domains) {
    for (const item of domain.items) {
      if (item.id === itemId) return item;
    }
  }
  return null;
}

function calculateStratification(data) {
  const totalScore = data.activeFactors.reduce((acc, item) => acc + item.points, 0);
  const baseLevel = determineLevelByThreshold(totalScore);
  const overrideResolution = applyClinicalOverrides(baseLevel.level, data.factors);

  const assignedLevel = overrideResolution.finalLevel;
  const levelMeta = APP_CONFIG.thresholds.find((x) => x.level === assignedLevel);
  const reevalText = `${APP_CONFIG.followUp.baseline} ${APP_CONFIG.followUp[assignedLevel]}`;

  const driverList = data.activeFactors.map((f) => f.label);
  const reasonText = driverList.length
    ? `por presencia de ${driverList.slice(0, 3).join(', ')}${driverList.length > 3 ? ', entre otros factores' : ''}`
    : 'sin factores de riesgo activados en esta versión preliminar';

  const narrative = `Paciente ${data.patientType}${data.patientId ? ` (${data.patientId})` : ''} clasificado como ${
    levelMeta.label
  } ${reasonText}, con una puntuación total de ${totalScore} puntos. Se recomienda seguimiento farmacéutico ${
    assignedLevel === 1 ? 'intensivo' : assignedLevel === 2 ? 'estructurado' : 'de rutina reforzada'
  } con ${APP_CONFIG.followUp[assignedLevel].toLowerCase()}`;

  return {
    ...data,
    totalScore,
    baseLevel,
    assignedLevel,
    levelMeta,
    overrideResolution,
    reevalText,
    narrative,
    carePlan: APP_CONFIG.carePlanByLevel[assignedLevel]
  };
}

function determineLevelByThreshold(totalScore) {
  return APP_CONFIG.thresholds.find((t) => totalScore >= t.min);
}

/*
 * Reglas clínicas de seguridad separadas del cálculo por umbral.
 * Si varias reglas se activan, prevalece el nivel de mayor complejidad (nivel numéricamente menor).
 */
function applyClinicalOverrides(currentLevel, factors) {
  let finalLevel = currentLevel;
  const triggered = [];

  APP_CONFIG.overrides.forEach((rule) => {
    if (rule.evaluate(factors)) {
      triggered.push(rule.description);
      if (finalLevel > rule.minLevel) {
        finalLevel = rule.minLevel;
      }
    }
  });

  return { finalLevel, triggered };
}

function renderResult(result) {
  document.getElementById('resultCard').classList.remove('hidden');

  const badge = document.getElementById('levelBadge');
  badge.textContent = result.levelMeta.label;
  badge.className = `level-badge level-${result.assignedLevel}`;

  document.getElementById('narrative').textContent = result.narrative;
  document.getElementById('totalScore').textContent = String(result.totalScore);
  document.getElementById('assignedLevel').textContent = result.levelMeta.label;
  document.getElementById('reevalPlan').textContent = result.reevalText;
  document.getElementById('careObjective').textContent = `Objetivo asistencial: ${result.carePlan.objective}`;

  fillList(
    document.getElementById('domainBreakdown'),
    APP_CONFIG.domains.map((d) => `${d.title}: ${result.domainScores[d.key]} puntos`)
  );

  fillList(
    document.getElementById('activeFactors'),
    result.activeFactors.length
      ? result.activeFactors.map((f) => `${f.label} (+${f.points})`)
      : ['Ninguna variable activada.']
  );

  const interventions = [...result.carePlan.interventions];
  if (result.overrideResolution.triggered.length) {
    interventions.unshift(`Reglas de seguridad aplicadas: ${result.overrideResolution.triggered.join(' | ')}`);
  }
  fillList(document.getElementById('interventions'), interventions);

  document.getElementById('notesEcho').textContent = result.notes || 'Sin observaciones.';

  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fillList(element, items) {
  element.innerHTML = '';
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    element.appendChild(li);
  });
}

function buildEvaluationFromResult(result) {
  const now = new Date().toISOString();
  return {
    evaluation_id: generateId('eval'),
    evaluation_date: now,
    patient_type: result.patientType,
    total_score: result.totalScore,
    stratification_level: result.assignedLevel,
    stratification_label: result.levelMeta.label,
    factors: result.factors,
    domain_scores: result.domainScores
  };
}

function onSavePatient() {
  if (!state.lastResult) {
    setStorageStatus('Primero calcule la estratificación del paciente para poder guardarla.', true);
    return;
  }
  if (state.currentPatientId) {
    setStorageStatus('Ya existe un registro cargado. Use “Actualizar paciente” para conservar trazabilidad.', true);
    return;
  }

  const now = new Date().toISOString();
  const record = {
    id: generateId('pat'),
    pseudonym_id: generateStablePseudoId(state.lastResult.patientId),
    patient_identifier_local: state.lastResult.patientId || null,
    patient_type: state.lastResult.patientType,
    notes_non_identifying: state.lastResult.notes || null,
    created_at: now,
    updated_at: now,
    latest_result: {
      total_score: state.lastResult.totalScore,
      stratification_level: state.lastResult.assignedLevel,
      stratification_label: state.lastResult.levelMeta.label,
      factors: state.lastResult.factors,
      domain_scores: state.lastResult.domainScores
    },
    evaluations: [buildEvaluationFromResult(state.lastResult)]
  };

  patientRepository.save(record);
  state.currentPatientId = record.id;
  refreshPatientsList();
  setStorageStatus(`Paciente guardado localmente (${record.pseudonym_id}).`);
}

function onUpdatePatient() {
  if (!state.lastResult) {
    setStorageStatus('Primero calcule la estratificación antes de actualizar.', true);
    return;
  }
  if (!state.currentPatientId) {
    setStorageStatus('No hay paciente cargado. Use “Guardar paciente” para crear uno nuevo.', true);
    return;
  }

  const updated = patientRepository.update(state.currentPatientId, (existing) => {
    const now = new Date().toISOString();
    return {
      ...existing,
      patient_identifier_local: state.lastResult.patientId || null,
      patient_type: state.lastResult.patientType,
      notes_non_identifying: state.lastResult.notes || null,
      updated_at: now,
      latest_result: {
        total_score: state.lastResult.totalScore,
        stratification_level: state.lastResult.assignedLevel,
        stratification_label: state.lastResult.levelMeta.label,
        factors: state.lastResult.factors,
        domain_scores: state.lastResult.domainScores
      },
      evaluations: [...existing.evaluations, buildEvaluationFromResult(state.lastResult)]
    };
  });

  if (!updated) {
    setStorageStatus('No se pudo actualizar el paciente. Recargue la lista y reintente.', true);
    return;
  }

  refreshPatientsList();
  setStorageStatus(`Paciente actualizado (${updated.pseudonym_id}). Se añadió una nueva evaluación.`);
}

function onLoadPatient() {
  const selector = document.getElementById('savedPatientsSelect');
  const id = selector.value;
  if (!id) {
    setStorageStatus('Seleccione un paciente guardado para cargarlo.', true);
    return;
  }

  const record = patientRepository.getById(id);
  if (!record) {
    setStorageStatus('Registro no encontrado en almacenamiento local.', true);
    return;
  }

  state.currentPatientId = record.id;
  loadRecordIntoForm(record);
  setStorageStatus(`Paciente cargado (${record.pseudonym_id}).`);
}

function loadRecordIntoForm(record) {
  document.getElementById('patientType').value = record.patient_type || '';
  document.getElementById('patientId').value = record.patient_identifier_local || '';
  document.getElementById('clinicalNotes').value = record.notes_non_identifying || '';

  const factors = record.latest_result?.factors || {};
  document.querySelectorAll('input[type="checkbox"][data-item-id]').forEach((checkbox) => {
    const active = Boolean(factors[checkbox.dataset.itemId]);
    checkbox.checked = active;
    checkbox.closest('.option-row')?.classList.toggle('is-selected', active);
  });

  const formData = collectFormData();
  const result = calculateStratification(formData);
  state.lastResult = result;
  renderResult(result);
}

function startNewRecord() {
  state.currentPatientId = null;
  document.getElementById('stratificationForm').reset();
  onReset();
  setStorageStatus('Formulario reiniciado para nueva estratificación no vinculada.');
}

function refreshPatientsList() {
  const records = patientRepository.list();
  const selector = document.getElementById('savedPatientsSelect');
  selector.innerHTML = '<option value="">Seleccione paciente guardado...</option>';

  records
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .forEach((record) => {
      const option = document.createElement('option');
      option.value = record.id;
      option.textContent = `${record.pseudonym_id} · ${record.patient_type} · ${formatDateTime(record.updated_at)}`;
      selector.appendChild(option);
    });

  document.getElementById('storedCount').textContent = String(records.length);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('es-ES');
}

function setStorageStatus(message, isError = false) {
  const el = document.getElementById('storageStatus');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function generateId(prefix) {
  const uid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${uid}`;
}

function generateStablePseudoId(seed) {
  const source = seed || `${Date.now()}-${Math.random()}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i);
    hash |= 0;
  }
  return `PSEUDO-${Math.abs(hash).toString(36).padStart(8, '0').toUpperCase()}`;
}

function getSelectedRecordsForExport() {
  const mode = document.getElementById('exportScope').value;
  const records = patientRepository.list();

  let selected = records;
  if (mode === 'current') {
    selected = state.currentPatientId ? records.filter((r) => r.id === state.currentPatientId) : [];
  }
  if (mode === 'complete') {
    selected = selected.filter((r) => Boolean(r.latest_result?.stratification_label));
  }
  return selected;
}

function buildResearchDatasets(records) {
  const allFactorIds = APP_CONFIG.domains.flatMap((d) => d.items.map((item) => item.id));

  const patients = records.map((record) => {
    const row = {
      patient_id: record.pseudonym_id,
      created_at: record.created_at,
      updated_at: record.updated_at,
      patient_type: record.patient_type,
      total_score: record.latest_result?.total_score ?? null,
      stratification_level: record.latest_result?.stratification_level ?? null,
      stratification_label: record.latest_result?.stratification_label ?? null
    };

    allFactorIds.forEach((factorId) => {
      row[`factor_${factorId}`] = normalizeBoolean(record.latest_result?.factors?.[factorId]);
    });

    return row;
  });

  const evaluations = records.flatMap((record) =>
    (record.evaluations || []).map((evaluation) => {
      const row = {
        evaluation_id: evaluation.evaluation_id,
        patient_id: record.pseudonym_id,
        evaluation_date: evaluation.evaluation_date,
        patient_type: evaluation.patient_type,
        total_score: evaluation.total_score,
        stratification_level: evaluation.stratification_level,
        stratification_label: evaluation.stratification_label
      };
      allFactorIds.forEach((factorId) => {
        row[`factor_${factorId}`] = normalizeBoolean(evaluation.factors?.[factorId]);
      });
      return row;
    })
  );

  const dataDictionary = buildDataDictionary(allFactorIds);

  return { patients, evaluations, dataDictionary };
}

function buildDataDictionary(allFactorIds) {
  const factorMap = new Map();
  APP_CONFIG.domains.forEach((domain) => {
    domain.items.forEach((item) => factorMap.set(item.id, { ...item, domain: domain.title }));
  });

  const base = [
    {
      variable_name: 'patient_id',
      label: 'Identificador pseudonimizado estable',
      type: 'string',
      allowed_values: 'PSEUDO-*',
      description: 'No incluye identificadores directos.',
      source: 'Local storage',
      notes: 'Nombre, DNI, teléfono, email y dirección excluidos por diseño.'
    },
    {
      variable_name: 'created_at / updated_at / evaluation_date',
      label: 'Fechas en ISO 8601',
      type: 'datetime',
      allowed_values: 'YYYY-MM-DDTHH:mm:ss.sssZ',
      description: 'Fechas de creación, actualización y evaluación.',
      source: 'Aplicación',
      notes: 'Formato homogéneo para análisis estadístico.'
    }
  ];

  const factorRows = allFactorIds.map((factorId) => {
    const factor = factorMap.get(factorId);
    return {
      variable_name: `factor_${factorId}`,
      label: factor?.label || factorId,
      type: 'boolean',
      allowed_values: 'true|false',
      description: `Criterio clínico (${factor?.points ?? '-'} puntos).`,
      source: factor?.domain || 'Formulario',
      notes: 'Booleano normalizado para SPSS/R/Stata.'
    };
  });

  return [...base, ...factorRows];
}

function normalizeBoolean(value) {
  return Boolean(value);
}

function exportResearchData(format) {
  const records = getSelectedRecordsForExport();
  if (!records.length) {
    setExportStatus('No hay registros para exportar con el filtro seleccionado.', true);
    return;
  }

  const datasets = buildResearchDatasets(records);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

  try {
    if (format === 'json') {
      const payload = {
        exported_at: new Date().toISOString(),
        privacy: {
          direct_identifiers_exported: false,
          excluded_fields: ['patient_identifier_local', 'notes_non_identifying']
        },
        datasets
      };
      downloadBlob(`hbv-hdv-research-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    }

    if (format === 'csv') {
      downloadBlob(`hbv-hdv-patients-${stamp}.csv`, toDelimited(datasets.patients, ','), 'text/csv;charset=utf-8');
      if (datasets.evaluations.length) {
        downloadBlob(`hbv-hdv-evaluations-${stamp}.csv`, toDelimited(datasets.evaluations, ','), 'text/csv;charset=utf-8');
      }
      downloadBlob(`hbv-hdv-dictionary-${stamp}.csv`, toDelimited(datasets.dataDictionary, ','), 'text/csv;charset=utf-8');
    }

    if (format === 'xlsx') {
      if (typeof XLSX === 'undefined') {
        throw new Error('Librería XLSX no disponible en este navegador.');
      }
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(datasets.patients), 'Patients');
      if (datasets.evaluations.length) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(datasets.evaluations), 'Evaluations');
      }
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(datasets.dataDictionary), 'DataDictionary');
      XLSX.writeFile(workbook, `hbv-hdv-research-${stamp}.xlsx`);
    }

    setExportStatus(`Exportación ${format.toUpperCase()} completada (${records.length} registro/s).`);
  } catch (error) {
    setExportStatus(`Error en exportación ${format.toUpperCase()}: ${error.message}`, true);
  }
}

function toDelimited(rows, delimiter) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(delimiter)];

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header] ?? '';
      const text = String(value).replace(/"/g, '""');
      return `"${text}"`;
    });
    lines.push(values.join(delimiter));
  });

  return `\ufeff${lines.join('\n')}`;
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function setExportStatus(message, isError = false) {
  const el = document.getElementById('exportStatus');
  el.textContent = message;
  el.classList.toggle('error', isError);
}

function exportBackupJson() {
  const payload = {
    exported_at: new Date().toISOString(),
    source: APP_CONFIG.appName,
    records: patientRepository.list()
  };
  downloadBlob('hbv-hdv-backup.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  setExportStatus('Backup JSON completo generado.');
}

function importBackupJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed.records)) {
        throw new Error('El archivo no contiene un array de registros válido.');
      }
      patientRepository.replaceAll(parsed.records);
      refreshPatientsList();
      setExportStatus(`Backup importado correctamente (${parsed.records.length} registros).`);
    } catch (error) {
      setExportStatus(`Error al importar backup: ${error.message}`, true);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
}

async function copySummary() {
  if (!state.lastResult) return;

  const r = state.lastResult;
  const summary = [
    `${APP_CONFIG.appName} - Resumen de estratificación`,
    `Tipo de paciente: ${r.patientType}`,
    `ID no nominativo: ${r.patientId || 'No informado'}`,
    `Puntuación total: ${r.totalScore}`,
    `Nivel final: ${r.levelMeta.label}`,
    `Periodicidad: ${r.reevalText}`,
    `Objetivo asistencial: ${r.carePlan.objective}`,
    `Intervenciones sugeridas: ${r.carePlan.interventions.join('; ')}`,
    `Factores activos: ${r.activeFactors.length ? r.activeFactors.map((f) => f.label).join('; ') : 'Ninguno'}`,
    `Narrativa: ${r.narrative}`
  ].join('\n');

  try {
    await navigator.clipboard.writeText(summary);
    alert('Resumen copiado al portapapeles.');
  } catch {
    alert('No se pudo copiar automáticamente. Use imprimir informe o copie manualmente.');
  }
}

init();
