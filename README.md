# CMO-HBV/HDV Pro

Aplicación web estática para estratificación farmacéutica preliminar en pacientes con VHB o VHB-VHD.

## Estructura

- `index.html`: estructura principal de la interfaz.
- `styles.css`: diseño responsive, impresión y estilo clínico.
- `app.js`: configuración central, lógica de scoring, persistencia local y exportación de datasets.

## Uso local

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.
3. Completa el formulario y pulsa **Estratificar paciente**.
4. Usa **Guardar paciente** para persistir en el mismo navegador/equipo.
5. Usa **Extracción de datos para investigación** para exportar en Excel, CSV o JSON.

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
