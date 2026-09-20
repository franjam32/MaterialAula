# Material Aula

App para una practica presencial donde los alumnos identifican y clasifican material sanitario entregado en cajas.

## Flujo

1. El profesor configura la URL de Google Apps Script.
2. La app genera QR para 6 cajas o mas.
3. Cada alumno escanea el QR de su caja.
4. El alumno registra material, unidades, estado, clasificacion por color, caducidad opcional, observaciones, descripcion e imagen/foto.
5. Todo se guarda en Google Sheets.
6. El profesor puede ver las entregas desde la app o directamente en Sheets.

## Clasificacion por colores

- Rojo: circulatorio.
- Azul: respiratorio.
- Amarillo: pediatrico.
- Verde: otros.

## Google Sheets

1. Crea una hoja de calculo.
2. Ve a `Extensiones` -> `Apps Script`.
3. Pega `google-apps-script/Code.gs`.
4. Implementa como `Aplicacion web`.
5. Ejecutar como: `Yo`.
6. Acceso: `Cualquier usuario`.
7. Copia la URL del Web App.
8. Pegala en la app, pestaña `Google Sheets`.

## GitHub Pages

Publica el repositorio desde `Settings` -> `Pages` -> `Deploy from a branch`, rama `main`, carpeta `/root`.
