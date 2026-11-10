# Changelog

## Sin publicar (rama `claude/zen-pasteur-u8tn7z`) — corrección de seguridad

- **XSS corregido**: las tablas de pacientes y de extracción se construían con `innerHTML` a partir de datos de un backup importado (`app.js`); ahora usan `textContent`. Sin cambios en el modelo clínico, el motor ni las reglas del analizador. Prueba de regresión: `tests/xss-escape.test.mjs`.
- Origen: auditoría funcional del ecosistema (hub, `docs/ECOSISTEMA_CMO_AUDIT.md`). La versión se fija en el commit de publicación.

## 1.0.0 — 2026-10-30 — Primera versión declarada

Primera versión declarada (confirmada por el autor): el repositorio no declaraba ninguna versión. Se declara 1.0.0 en `package.json` y `cmo-app-meta` (la prueba exige que coincidan); `status: "released"`, `releaseDate: "2026-10-30"`. Sin versión de algoritmo declarada. Sin cambios en pesos, umbrales ni reglas de `APP_CONFIG`.

Incluye lo fusionado el 2026-10-30:
- Casos de referencia (`npm test`), PR #10.
- `xlsx` 0.18.5 en copia local fijada con SRI (sin CDN) y «No es un producto sanitario certificado», PR #11. Decisión sobre `xlsx`: mantener la copia fijada (ver `vendor/xlsx/README.md`).
- Identidad CMO Design System 0.2.0, firma de autoría y correcciones de accesibilidad, PR #12.
- Extractor: «idioma» deja de activar «barreras de seguimiento» (cualquier mención al idioma lo activaba); decisión del autor.
- Etiqueta de nivel coherente cuando actúa una regla de seguridad («asignado por regla de seguridad», también en `stratification_label` exportado) y extractor heurístico más preciso (palabras completas, negación en la frase, todas las apariciones, tipo de paciente con negación), tras revisión clínica del autor, PR #15. Sin cambios en pesos, umbrales ni reglas.
