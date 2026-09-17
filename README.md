# Material Docente Sanitario

App web publica para gestionar material docente sanitario distribuido en estanterias, cajas y otras ubicaciones.

## Que permite hacer

- Registrar ubicaciones con codigo QR.
- Registrar material con cantidad, stock minimo, lote opcional y caducidad opcional.
- Buscar un material y ver su ubicacion exacta.
- Escanear el QR de una caja o estanteria para ver su contenido.
- Prestar material a un tutor con fecha de salida y fecha prevista de regreso.
- Marcar prestamos como devueltos y detectar retrasos.
- Imprimir etiquetas QR de ubicaciones.
- Generar QR publicos para que el alumnado abra una caja o estanteria desde el movil.
- Modo alumno simplificado para identificar material de cajas durante una practica presencial.
- 6 cajas de practica y 4 grupos de alumnos preparados por defecto.
- Exportar e importar una copia de datos en JSON.
- Cargar imagen y descripcion del producto desde internet cuando haya conexion.

## Uso para alumnos con QR

Publica la app con GitHub Pages. La direccion esperada sera:

```text
https://franjam32.github.io/MaterialAula/
```

Despues entra en `Etiquetas QR` e imprime las etiquetas. Cada QR abre directamente la ubicacion correspondiente, por ejemplo:

```text
https://franjam32.github.io/MaterialAula/?qr=LOC-CAJA-A03&modo=alumno
```

Asi el alumno solo tiene que escanear el QR de la caja o estanteria para abrir el formulario de identificacion de esa ubicacion.

## Entregas en Google Sheets

Para centralizar las respuestas:

1. Crea una hoja de calculo en Google Sheets.
2. Entra en `Extensiones` -> `Apps Script`.
3. Pega el contenido de `google-apps-script/Code.gs`.
4. Pulsa `Implementar` -> `Nueva implementacion`.
5. Tipo: `Aplicacion web`.
6. Ejecutar como: `Yo`.
7. Acceso: `Cualquier usuario`.
8. Copia la URL que empieza por `https://script.google.com/macros/s/...`.
9. En la app, entra en `Practica`, pega esa URL y guarda.

Cada envio de un alumno creara una fila en la hoja `Entregas`. Si adjunta foto, la foto se guardara en una carpeta de Drive llamada `MaterialAula fotos` y la hoja guardara el enlace.

En modo alumno, el QR no muestra la solucion del inventario: abre un formulario sencillo para que identifiquen el material, unidades, estado, clasificacion por color, caducidad opcional, observaciones, descripcion e imagen. Si la imagen automatica no cuadra, pueden sacar una foto con el movil.

## Como probarla en local

Abre la app desde su servidor local para que el movil o navegador pueda usar la camara y la busqueda automatica de productos:

```bash
python3 server.py
```

Despues entra en:

```text
http://127.0.0.1:4173
```

Los datos se guardan en el navegador usando almacenamiento local. Para conservar una copia externa, usa el boton `Exportar`.

La carga automatica prioriza paginas de venta de material sanitario para obtener una imagen descriptiva del producto. Si no encuentra una coincidencia clara, deja una descripcion docente breve y se puede repetir desde el boton `Completar`.

Los productos se clasifican por color:

- ROJO: circulatorio.
- AZUL: respiratorio.
- VERDE: otros.
- AMARILLO: pediatrico.

Nota: en materiales docentes muy concretos, la imagen encontrada puede ser generica. Conviene revisar visualmente los productos importantes antes de imprimir etiquetas o usar el inventario definitivo.
