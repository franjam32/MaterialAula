# Publicacion de Material Aula

## 1. Subir a GitHub

Sube estos archivos al repositorio `franjam32/MaterialAula`:

- `index.html`
- `app.js`
- `styles.css`
- `qrcode.js`
- `manifest.webmanifest`
- `sw.js`
- `README.md`
- `DEPLOY.md`
- carpeta `google-apps-script`

No hace falta subir los ZIP antiguos ni carpetas duplicadas.

## 2. Activar GitHub Pages

1. Entra en GitHub.
2. Abre el repositorio `MaterialAula`.
3. Entra en `Settings`.
4. Entra en `Pages`.
5. En `Build and deployment`, elige `Deploy from a branch`.
6. Selecciona rama `main` y carpeta `/root`.
7. Pulsa `Save`.

La app publica deberia quedar en:

```text
https://franjam32.github.io/MaterialAula/
```

## 3. Crear Google Sheets

1. Crea una hoja de calculo nueva en Google Sheets.
2. Entra en `Extensiones` -> `Apps Script`.
3. Borra el codigo de ejemplo.
4. Pega el contenido de `google-apps-script/Code.gs`.
5. Pulsa `Implementar` -> `Nueva implementacion`.
6. Tipo: `Aplicacion web`.
7. Ejecutar como: `Yo`.
8. Quien tiene acceso: `Cualquier usuario`.
9. Pulsa `Implementar` y autoriza.
10. Copia la URL de la aplicacion web.

## 4. Conectar la app

1. Abre la app publicada.
2. Entra en `Google Sheets`.
3. Pega la URL de Apps Script.
4. Guarda.
5. Entra en `Cajas y QR`.
6. Imprime los QR.

Cada QR abre el formulario de alumno para una caja concreta. El profesor puede ver las entregas en `Seguimiento` y tambien directamente en Google Sheets.
