// Carga app.js (script clásico del navegador) en un contexto vm de Node SIN modificarlo:
// se omite solo la llamada final `init();`, que necesita el DOM. Los `const`/`function` de nivel
// superior quedan en el ámbito léxico del contexto y se recuperan con una segunda evaluación.
import fs from 'node:fs';
import vm from 'node:vm';

export function loadApp() {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const body = src.replace(/\ninit\(\);\s*$/, '\n');
  if (body === src) throw new Error('app.js ya no termina en `init();`: revisar el cargador de pruebas');
  const store = new Map();
  const ctx = vm.createContext({
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    console
  });
  vm.runInContext(body, ctx, { filename: 'app.js' });
  return vm.runInContext(
    '({ APP_CONFIG, STORAGE_KEYS, calculateStratification, determineLevelByThreshold, applyClinicalOverrides, findItem, extractFromAiAnalysis, generatePseudonym, buildResearchDatasets })',
    ctx
  );
}
