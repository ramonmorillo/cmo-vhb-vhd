# SheetJS `xlsx` 0.18.5 (copia local fijada)

- Origen: paquete npm `xlsx@0.18.5`, fichero `dist/xlsx.full.min.js`, sin modificar. Licencia Apache-2.0 (`LICENSE`).
- Integridad del tarball (registro npm): `sha512-dmg3LCjBPHZnQp5/F/+nnTa+miPJxUXB6vtk42YjBBKayDNagxGEeIdWApkYPOf3Z3pm3k62Knjzp7lMeTEtFQ==`.
- SRI del fichero (comprobado por `index.html` y por `tests/seguridad.test.mjs`): `sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw`.
- Sustituye a la carga desde `cdn.jsdelivr.net` sin SRI: la app ya no hace peticiones a terceros.
- Uso en la app: solo **escritura** de XLSX (`book_new`, `json_to_sheet`, `book_append_sheet`, `writeFile`); la importación de copias de seguridad es JSON. Las vulnerabilidades conocidas de esta versión afectan al **parseo** de ficheros y no se ejercitan.
- **Decisión (2026-10-30, delegada por el autor): mantener esta copia fijada.** Sin peticiones a terceros, con SRI comprobada por las pruebas y sin uso de las funciones de lectura afectadas. Revisar si la app pasa a **leer** XLSX (entonces actualizar o sustituir), o si aparece una vulnerabilidad en la escritura. Alternativas descartadas por ahora: actualizar a SheetJS ≥0.20 (fuera de npm, nueva procedencia que verificar) o escribir un exportador XLSX propio (más código que mantener por un beneficio que hoy no existe).
