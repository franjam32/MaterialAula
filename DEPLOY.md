# Publicacion en GitHub

Este proyecto puede subirse a GitHub como repositorio normal.

## Opcion recomendada

Usar GitHub como repositorio del codigo y ejecutar la app con:

```bash
python3 server.py
```

Esta opcion conserva:

- Busqueda automatica de imagenes en paginas de venta de material sanitario.
- Descripciones breves automaticas.
- Proxy local de imagenes para evitar bloqueos del navegador.
- App movil/escritorio desde `http://127.0.0.1:4173`.

## GitHub Pages para alumnos

GitHub Pages sirve la app como web publica. Es la opcion adecuada para que el alumnado la abra desde un QR.

Pasos:

1. En GitHub entra en `Settings`.
2. Entra en `Pages`.
3. En `Build and deployment`, selecciona `Deploy from a branch`.
4. Selecciona rama `main` y carpeta `/root`.
5. Guarda.
6. Espera a que GitHub indique la URL publicada.

La URL prevista sera:

```text
https://franjam32.github.io/MaterialAula/
```

Las etiquetas QR de la app ya generan enlaces de alumno con este formato:

```text
https://franjam32.github.io/MaterialAula/?qr=LOC-CAJA-A03&modo=alumno
```

GitHub Pages no puede ejecutar `server.py`.

Por eso, en GitHub Pages la busqueda automatica en tiendas sanitarias no funcionara igual. Para conservar esa funcion completa en internet hace falta desplegar el servidor Python en un hosting que soporte backend. Para el uso del alumnado con QR, busqueda e inventario, la app estatica si puede funcionar.

## Conectar Google Sheets

1. Crea una hoja de calculo en Google Sheets.
2. Abre `Extensiones` -> `Apps Script`.
3. Copia el archivo `google-apps-script/Code.gs` en el editor.
4. Implementa como `Aplicacion web`.
5. Configura:
   - Ejecutar como: `Yo`.
   - Quien tiene acceso: `Cualquier usuario`.
6. Copia la URL de la aplicacion web.
7. En la app publicada, entra en `Practica`, pega la URL y guarda.

Los alumnos no necesitan cuenta ni login. Cada envio se guarda en la hoja `Entregas`.

Antes de imprimir etiquetas, entra en la app publicada, abre `Practica`, pega la URL de Apps Script y guarda. Despues ve a `Etiquetas QR`: los QR incluiran esa URL para que el movil del alumno pueda enviar respuestas a tu hoja.

## Pasos para crear el repositorio en GitHub

1. Entra en `https://github.com/`.
2. Crea un repositorio nuevo, por ejemplo `material-docente-sanitario`.
3. Elige `Private` si el inventario real puede contener datos internos.
4. No marques opciones de README, `.gitignore` o licencia si vas a subir esta carpeta completa.
5. Copia los comandos que GitHub muestra para "push an existing repository".

Ejemplo:

```bash
git remote add origin https://github.com/TU_USUARIO/material-docente-sanitario.git
git branch -M main
git push -u origin main
```
