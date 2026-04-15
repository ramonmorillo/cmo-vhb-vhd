/* Configuración central editable para adaptar pesos, umbrales y textos clínicos. */
const APP_CONFIG = {
  appName: 'CMO-HBV/HDV Pro',
  subtitle: 'Herramienta de apoyo a la priorización farmacéutica en pacientes con VHB o VHB-VHD.',
  thresholds: [
    { min: 26, level: 1, label: 'Nivel 1 (alta complejidad / prioritario)' },
    { min: 16, level: 2, label: 'Nivel 2 (complejidad intermedia)' },
    { min: 0, level: 3, label: 'Nivel 3 (baja complejidad)' }
  ],
  domains: [
    {
      key: 'severidad',
      title: 'A. Severidad de enfermedad hepática',
      items: [
        { id: 'cirrosis', label: 'Cirrosis', points: 4 },
        { id: 'cirrosis_descompensada', label: 'Cirrosis descompensada (últimos 3 meses)', points: 4 },
        { id: 'trasplante', label: 'Trasplante hepático', points: 3 }
      ]
    },
    {
      key: 'comorbilidad',
      title: 'B. Comorbilidad y complejidad clínica',
      items: [
        { id: 'vih_coinfeccion', label: 'Coinfección por VIH', points: 3 },
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
  interventions: {
    1: [
      'Revisión integral de la medicación.',
      'Evaluación de interacciones.',
      'Valoración e intervención sobre adherencia.',
      'Entrevista clínica estructurada.',
      'Coordinación con hepatología.',
      'Seguimiento por telefarmacia.',
      'Educación al paciente y apoyo al automanejo.'
    ],
    2: [
      'Revisión periódica de medicación.',
      'Evaluación de adherencia.',
      'Educación al paciente.',
      'Monitorización de interacciones.',
      'Seguimiento estructurado.',
      'Posible seguimiento telemático.'
    ],
    3: [
      'Consulta breve de atención farmacéutica.',
      'Confirmación de adherencia.',
      'Monitorización rutinaria.',
      'Prevención de futuras complicaciones.'
    ]
  },
  disclaimers: [
    'Herramienta de apoyo a la práctica clínica farmacéutica; no sustituye el juicio clínico profesional.',
    'Umbrales y pesos preliminares, pendientes de calibración y validación futura.',
    'No es un producto sanitario.',
    'Evite introducir datos identificativos directos del paciente.'
  ]
};

const state = {
  lastResult: null,
  preferences: {
    detailsOpen: JSON.parse(localStorage.getItem('hbv_hdv_details_open') || 'false')
  }
};

function init() {
  document.getElementById('appName').textContent = APP_CONFIG.appName;
  document.getElementById('appSubtitle').textContent = APP_CONFIG.subtitle;
  renderDomains();
  renderDisclaimers();
  bindEvents();

  const details = document.getElementById('detailsPanel');
  details.open = state.preferences.detailsOpen;
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
        <span>
          <input type="checkbox" data-item-id="${item.id}" data-domain="${domain.key}" />
          ${item.label}
        </span>
        <small>${item.points} puntos</small>
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
    localStorage.setItem('hbv_hdv_details_open', JSON.stringify(detailsPanel.open));
  });
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
}

function onReset() {
  document.getElementById('resultCard').classList.add('hidden');
  document.getElementById('validationMsg').textContent = '';
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
      activeFactors.push({ label: itemDef.label, points: itemDef.points });
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
    interventions: APP_CONFIG.interventions[assignedLevel]
  };
}

function determineLevelByThreshold(totalScore) {
  const match = APP_CONFIG.thresholds.find((t) => totalScore >= t.min);
  return match;
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

  const interventions = [...result.interventions];
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
