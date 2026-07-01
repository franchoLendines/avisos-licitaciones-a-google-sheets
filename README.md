# Avisos de licitaciones públicas → Google Sheets

Script para Google Apps Script que vuelca automáticamente en un Google Sheet las licitaciones/expedientes públicos que llegan por correo desde una plataforma de contratación pública (a través de un aviso de suscripción con una tabla HTML), filtrando solo las que están en un estado concreto (por ejemplo, "en plazo").

## Qué hace

1. **Busca correos sin leer** con un asunto determinado (el aviso periódico de tu plataforma de contratación pública).
2. **Parsea la tabla HTML** del cuerpo del correo, fila a fila, extrayendo: órgano de contratación, expediente (con su enlace), estado, presupuesto, límite y objeto del contrato.
3. **Filtra por estado**: solo se importan las filas cuyo estado contiene un texto configurable (por defecto, "en plazo").
4. **Escribe en Google Sheets**: añade cada fila con formato aplicado (moneda en presupuesto, ajuste de texto, cabeceras con color), dejando dos columnas en blanco (Veredicto y Justificación) para que las rellenes manualmente al revisar si el expediente interesa a tu negocio.
5. **Marca los correos como leídos**, así una segunda ejecución no vuelve a importar las mismas filas.

## Requisitos previos

- Un Google Sheet donde se registran las licitaciones (puede estar vacío; el script crea las cabeceras la primera vez).
- Recibir por correo, de forma periódica, un aviso con una tabla HTML de licitaciones (la mayoría de plataformas de contratación pública ofrecen este tipo de alertas por suscripción a palabras clave/CPV).

## Instalación

1. Crea un proyecto nuevo en [script.google.com](https://script.google.com).
2. Copia el contenido de `Codigo.gs` en el editor.
3. Rellena la configuración al principio del archivo:
   - `ASUNTO_CORREO`: el asunto (o parte de él) del correo de avisos de tu plataforma.
   - `SPREADSHEET_ID`: el ID del Google Sheet destino (se saca de la URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit`).
   - `ESTADO_FILTRO`: el texto que debe contener el estado de una licitación para importarse (por defecto "en plazo").
   - `HORA_EJECUCION`: la hora del día (0-23) a la que se ejecutará automáticamente.
4. Revisa `extraerFilasDeHtml()`: el script asume que la tabla del correo alterna una fila de datos principales con una fila siguiente que contiene el objeto del contrato. Si la plantilla de tu proveedor tiene otra estructura, ajusta esta función (puedes registrar en el log el HTML de un correo real para ver cómo está montada la tabla).
5. Ejecuta una vez la función `configurarTrigger()` desde el editor para crear el activador diario automáticamente (o créalo a mano desde Activadores).
6. La primera vez que ejecutes cualquier función, Google te pedirá autorizar permisos de Gmail y Sheets.

## Activador (ejecución automática)

`configurarTrigger()` crea un activador diario para `procesarCorreosLicitaciones` a la hora indicada en `HORA_EJECUCION`. También puedes gestionar el activador manualmente desde Editor → Activadores, o ejecutar la función principal con el botón ▶️ para probarla.

## Notas

- El código incluido en este repositorio usa **valores de ejemplo** (`TU_SHEET_ID`, `TU_ASUNTO_DE_CORREO`) en lugar de los datos reales del entorno original. Sustitúyelos por los tuyos antes de ejecutar.
- Las columnas "Veredicto" y "Justificación" se dejan siempre vacías por el script: están pensadas para una revisión manual posterior (o para que las rellene otro proceso, como una IA o una persona del equipo comercial).
- El pequeño `Utilities.sleep(2000)` tras cada fila existe para dar tiempo a que Sheets aplique el autoajuste de altura de fila antes de continuar; si procesas muchas filas de golpe, la ejecución puede tardar varios segundos.
