# Changelog

## 1.0.0 — 2026-10-30 — Primera versión declarada

PROPUESTA (pendiente de confirmación del autor): el repositorio no declaraba ninguna versión, así que «subir la versión menor» no tenía base. Se declara 1.0.0 en `package.json` y `cmo-app-meta` (la prueba exige que coincidan); `status: "released"`, `releaseDate: "2026-10-30"`. Sin versión de algoritmo declarada. Sin cambios en `APP_CONFIG`.

Incluye lo fusionado el 2026-10-30:
- Casos de referencia (`npm test`), PR #10.
- `xlsx` 0.18.5 en copia local fijada con SRI (sin CDN) y «No es un producto sanitario certificado», PR #11. Decisión sobre `xlsx`: mantener la copia fijada (ver `vendor/xlsx/README.md`).
- Identidad CMO Design System 0.2.0, firma de autoría y correcciones de accesibilidad, PR #12.
- Etiqueta de nivel coherente cuando actúa una regla de seguridad («asignado por regla de seguridad», también en `stratification_label` exportado) y extractor heurístico más preciso (palabras completas, negación en la frase, todas las apariciones, tipo de paciente con negación), tras revisión clínica del autor, PR #15. Sin cambios en pesos, umbrales ni reglas.
