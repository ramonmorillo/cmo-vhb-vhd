# Changelog

## 1.1.0 — sin publicar (rama `claude/zen-pasteur-u8tn7z`)

Factores Sí/No/Pendiente, resultado provisional, modificación profesional, informe único con PDF, actuaciones con estado, plan, copias de seguridad validadas y corrección de defectos. **Sin cambios en el modelo clínico**: la configuración (`APP_CONFIG`) y el cálculo (`calculateStratification`, umbrales y reglas de seguridad) de `app.js` son idénticos byte a byte (huellas en `tests/fixtures/motor.sha256.json`). La fecha y el estado de publicación se fijan en el commit de publicación.

### Novedades
- **Cada factor es Sí, No o Pendiente** (por defecto Pendiente). Antes, una casilla sin marcar era «ausente» y no había forma de distinguir «no valorado». Un factor pendiente no puntúa; el resultado se rotula **provisional** con la puntuación y el nivel máximos posibles (calculados con el motor) si estuvieran presentes. El progreso cuenta factores valorados.
- **Extracción asistida**: lo detectado se incorpora como «Sí»; lo no mencionado conserva su estado (antes se desmarcaban todos los demás, y la ausencia de mención equivalía a «No»).
- **Modificación por criterio profesional** (nueva): nivel y justificación de al menos 12 caracteres; el nivel del modelo se conserva y se muestra; si rebaja el nivel se advierte. Se guarda con el paciente.
- **Necesidades** por dominio (confirmadas y potenciales), **estado de cada actuación** del plan del nivel (realizada, planificada, no procede) y plan (próxima valoración, observaciones).
- **Informe único** (`cmo-report/1`): copiar para historia clínica, PDF real, impresión y `.txt` salen de la misma estructura (antes: texto armado aparte e impresión de la página completa). Exportación del caso en JSON (`cmo-export/1` + `cmo-hbv-case/1`) y CSV.
- **Eliminar paciente** guardado, con confirmación (antes no era posible).
- Confirmaciones accesibles y avisos no bloqueantes en lugar de `alert()`; aviso al salir con cambios sin guardar.

### Defectos corregidos
- **Copia de seguridad**: la importación sustituía todos los registros sin validar ni confirmar y un fichero malformado dejaba un error persistente. Ahora se valida registro a registro (identificadores, tipo de paciente, factores del modelo), el resultado se recalcula con el motor, se descartan duplicados e inválidos (con recuento) y sustituir exige confirmación. Los backups anteriores siguen siendo importables (sus factores no marcados son «No»).
- «Nueva estratificación» dejaba la puntuación en vivo obsoleta («2 puntos · Nivel 2» con el formulario vacío): el reinicio nativo del formulario ocurría después del recálculo.
- Investigación: un factor pendiente se exporta vacío (no como «No») y el alcance «solo registros completos» excluye los que tienen pendientes. CSV con fórmulas neutralizadas.
- XSS por tablas construidas con `innerHTML` (ya en la rama).

### Pruebas
- `npm test`: 30 (20 previas + 10 del adaptador: huellas, umbrales, pendientes y cota, reglas de seguridad, modificación, informe, copia de seguridad hostil, registro anterior, CSV). `npm run test:e2e`: 5 recorridos en Chromium con axe WCAG A/AA opcional (`AXE_PATH`).

### Pendiente de decisión del autor
- Hallazgos clínicos heredados (ya registrados): etiqueta de nivel con regla de seguridad (ramonmorillo/cmo-vhb-vhd#15); coinfección VIH/VHD solo activable desde el extractor; «cirrosis descompensada» sin «cirrosis»; la negación posterior («VIH negativo») del extractor.
- `pseudonym_id` sigue siendo el de la versión anterior en los registros existentes.
- Sigue siendo una página única; el modelo está marcado como preliminar.

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
