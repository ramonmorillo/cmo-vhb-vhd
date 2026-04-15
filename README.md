# CMO-HBV/HDV Pro

Aplicación web estática para estratificación farmacéutica preliminar en pacientes con VHB o VHB-VHD.

## Estructura

- `index.html`: estructura principal de la interfaz.
- `styles.css`: diseño responsive, impresión y estilo clínico.
- `app.js`: configuración central, lógica de scoring, overrides y renderizado.

## Uso local

1. Descarga o clona el repositorio.
2. Abre `index.html` en tu navegador.
3. Completa el formulario y pulsa **Estratificar paciente**.

## Despliegue en GitHub Pages

1. Sube estos archivos al repositorio.
2. Ve a **Settings → Pages**.
3. En **Build and deployment**, selecciona **Deploy from a branch**.
4. Elige la rama (por ejemplo `main`) y carpeta `/ (root)`.
5. Guarda cambios; GitHub Pages publicará la app estática.

## Notas

- No almacena datos clínicos en localStorage.
- Solo guarda preferencia de UI (expandir/contraer detalle).
- Los umbrales y pesos son preliminares y están centralizados en `APP_CONFIG` dentro de `app.js`.
