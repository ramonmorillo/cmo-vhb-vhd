# CMO-HBV/HDV Pro

Aplicación web estática para estratificación farmacéutica preliminar en pacientes con VHB o VHB-VHD.

## Estructura

- `index.html`: estructura principal de la interfaz.
- `styles.css`: diseño responsive, impresión y estilo clínico.
- `app.js`: configuración central, lógica de scoring, persistencia local y exportación de datasets.

## Uso local

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.
3. Opcionalmente pega un resumen no identificativo en **Extracción asistida de variables (reglas locales)** para prellenar variables.
4. Completa o revisa el formulario y pulsa **Estratificar paciente**.
5. Usa **Guardar paciente** para persistir en el mismo navegador/equipo.
6. Usa **Extracción de datos para investigación** para exportar en Excel, CSV o JSON.

## Capacidades de extracción asistida (reglas locales)

- Módulo local para pegar análisis de IA o resúmenes clínicos no identificativos.
- Detección heurística de tipo de paciente y variables clínicas de la escala con evidencia y confianza orientativa.
- Aplicación de variables al formulario solo tras revisión humana; no envía datos a servidores.

## Capacidades de persistencia y extracción

- Persistencia local mediante `localStorage` con repositorio central (`hbv_hdv_patients_v1`).
- Lista de pacientes guardados, carga de registros, actualización y trazabilidad con historial de evaluaciones.
- Exportación para investigación en:
  - Excel (`.xlsx`) con hojas: `Patients`, `Evaluations`, `DataDictionary`.
  - CSV (ficheros separados por dataset).
  - JSON (paquete de investigación + metadata de privacidad).
- Backup completo JSON e importación de backup.

## Privacidad de exportación

La extracción excluye por defecto identificadores directos y campos potencialmente identificativos de texto libre.
Se exporta `patient_id` pseudonimizado estable para análisis estadístico.

## Despliegue en GitHub Pages

1. Sube estos archivos al repositorio.
2. Ve a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama (por ejemplo `main`) y carpeta `/ (root)`.
5. Guarda cambios; GitHub Pages publicará la app estática.

## Notas

- Los umbrales y pesos son preliminares y están centralizados en `APP_CONFIG` dentro de `app.js`.
- Herramienta de apoyo: no sustituye el juicio clínico profesional.

## Pruebas

`npm test` (Node ≥ 20, sin dependencias) ejecuta los casos de referencia de `tests/casos-referencia.test.mjs`. Congelan con valores literales el modelo (`tests/fixtures/modelo-clinico.snapshot.json`), las fronteras de nivel (7/8 y 12/13), las reglas de seguridad, la extracción heurística, el pseudónimo y la estructura de exportación. `app.js` se carga sin modificar en un contexto `vm` (`tests/load-app.mjs`). Si una prueba falla, el comportamiento ha cambiado y requiere revisión explícita.

Las pruebas marcadas como **HALLAZGO** fijan comportamientos actuales pendientes de decisión del autor (no corregidos):

1. Con una regla de seguridad, el texto del nivel cita un rango de puntos que no corresponde a la puntuación (p. ej., 2 puntos → «Nivel 2 (… 8-12 puntos)»).
2. Extracción heurística: la negación solo se reconoce si precede inmediatamente al término («sin signos de descompensación» → detectada); el patrón `erc` coincide como subcadena («tercera», «cerca» → insuficiencia renal); «últimos 12 meses» activa «cambio de antiviral»; solo se examina la primera aparición de cada patrón; el tipo de paciente ignora la negación («VHB sin VHD» → VHB-VHD).
3. `pseudonym_id` es un hash de 32 bits sin sal del identificador local: determinista y reproducible por fuerza bruta sobre identificadores de espacio pequeño (p. ej., NHC numéricos).

## Identidad visual (CMO Design System)

Copia fijada del CMO Design System en `vendor/cmo-ds/` (`CMO-DS-VERSION.json` con SHA-256; prueba `tests/cmo-ds.test.mjs`). `cmo-visual.css` es el tema «Estratos» y se carga después de `styles.css`. La firma `<cmo-author-signature>` del pie lee los metadatos de `cmo-app-meta` en `index.html` (sin versión declarada en el código: `appVersion: null`; la fecha solo se fija en el commit de publicación).
