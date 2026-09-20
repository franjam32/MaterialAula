# MaterialAula · Inventario sanitario UF0679

Aplicación web colaborativa para inventariar material sanitario por grupos y ubicaciones físicas (cajas, mochilas, cajones, armarios, maletines, ambulancias, estanterías, etc.).

## Arquitectura

- **GitHub Pages**: interfaz web.
- **Supabase**: base de datos, autenticación anónima, RLS, almacenamiento de fotografías y actualizaciones en tiempo real.
- **QR estable por ubicación**: el código identifica la caja/mochila física, no al grupo.
- **Wikimedia/Wikipedia**: búsqueda auxiliar de imágenes y descripciones, siempre editables.

## Funciones

- Acceso de grupo mediante nombre + PIN.
- Acceso docente mediante PIN.
- Clasificación: 🔴 Respiratorio · 🔵 Circulatorio · 🟡 Pediátrico · 🟢 Otros.
- Cantidad, estado, caducidad opcional, fotografía, imagen sugerida y descripción editable.
- Estados: Correcto / Deteriorado / Abierto / Incompleto.
- Panel docente con grupos, ubicaciones, inventario e incidencias.
- Exportación Excel y vista imprimible/PDF.
- Trabajo simultáneo y actualización en tiempo real.

## Puesta en marcha

1. En Supabase, activar **Authentication → Providers → Anonymous Sign-Ins**.
2. En GitHub, activar **Settings → Pages → Deploy from a branch → main → /(root)** si Pages todavía no está activo.
3. Abrir la URL pública de GitHub Pages y entrar como docente.
4. Crear grupos y ubicaciones desde la propia aplicación.

La versión anterior basada en Google Sheets se conserva en la rama `backup-google-sheets`.

> La clave incluida en el frontend es únicamente la **publishable key** de Supabase. La autorización real se aplica con Auth + RLS. No se incluye ninguna secret/service-role key en el repositorio.
