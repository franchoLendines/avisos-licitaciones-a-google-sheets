// ============================================================
//  AVISOS DE LICITACIONES PÚBLICAS → GOOGLE SHEETS
// ============================================================
//
//  QUÉ HACE:
//   Muchas plataformas de contratación pública envían un correo
//   periódico con una tabla HTML de licitaciones/expedientes que
//   coinciden con tus suscripciones. Este script:
//   1. Busca correos sin leer con un asunto concreto.
//   2. Extrae, parseando el HTML del correo, las filas de la tabla
//      cuyo estado coincide con un filtro (p. ej. "en plazo").
//   3. Añade cada fila a un Google Sheet, con formato (moneda,
//      ajuste de texto, cabeceras con color) y dos columnas en
//      blanco para que revises manualmente si el expediente encaja
//      con tu negocio (veredicto + justificación).
//   4. Marca los correos como leídos, para no duplicar filas si el
//      script se ejecuta varias veces.
//
//  ACTIVADOR (Editor de Apps Script > Activadores):
//   • procesarCorreosLicitaciones → diario, a la hora configurada
//     en HORA_EJECUCION. Puedes crearlo ejecutando una vez la
//     función configurarTrigger() (ver más abajo), o manualmente
//     desde el menú de Activadores.
//
// ============================================================
// --- CONFIGURACIÓN — RELLENA AQUÍ TUS DATOS ---
const HORA_EJECUCION   = 8;
const ASUNTO_CORREO    = "TU_ASUNTO_DE_CORREO"; // Asunto del correo de avisos de tu plataforma de licitaciones
const ESTADO_FILTRO    = "en plazo";            // Solo se importan filas cuyo estado contenga este texto
const SPREADSHEET_ID   = "TU_SHEET_ID";
// ------------------------------------------------------------
// FUNCIÓN PRINCIPAL
// ------------------------------------------------------------
function procesarCorreosLicitaciones() {
  const sheet = obtenerOCrearHoja();
  const hilos = GmailApp.search(`subject:"${ASUNTO_CORREO}" is:unread`);
  if (hilos.length === 0) {
    Logger.log("No se encontraron correos sin leer con el asunto indicado.");
    return;
  }
  let filasInsertadas = 0;
  hilos.forEach(hilo => {
    hilo.getMessages().forEach(mensaje => {
      if (mensaje.isUnread()) {
        const filas = extraerFilasDeHtml(mensaje.getBody(), mensaje.getDate());
        filas.forEach(fila => {
          sheet.appendRow(fila);
          const ultimaFila = sheet.getLastRow();
          const rangoFila = sheet.getRange(ultimaFila, 1, 1, 10);
          rangoFila.setVerticalAlignment("middle");
          rangoFila.setHorizontalAlignment("left");
          sheet.getRange(ultimaFila, 4).setNumberFormat('#,##0.00 "€"');
          sheet.getRange(ultimaFila, 1).setWrap(true);
          sheet.getRange(ultimaFila, 6).setWrap(true);
          sheet.getRange(ultimaFila, 10).setWrap(true);
          // Columnas 9 y 10 (Veredicto y Justificación) se dejan en blanco
          Utilities.sleep(2000);
          sheet.autoResizeRows(ultimaFila, 1);
        });
        filasInsertadas += filas.length;
        mensaje.markRead();
      }
    });
  });
  Logger.log(`Proceso completado. Filas insertadas: ${filasInsertadas}`);
}
// ------------------------------------------------------------
// OBTENER HOJA Y CREAR CABECERAS SI ESTÁ VACÍA
// ------------------------------------------------------------
function obtenerOCrearHoja() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    const cabeceras = [
      "Órgano de contratación",
      "Expediente",
      "Estado",
      "Presupuesto",
      "Límite",
      "Objeto del contrato",
      "Enlace expediente",
      "Fecha volcado",
      "Veredicto",
      "Justificación"
    ];
    sheet.appendRow(cabeceras);
    const rango = sheet.getRange(1, 1, 1, cabeceras.length);
    rango.setBackground("#1a3a5c");
    rango.setFontColor("#ffffff");
    rango.setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 280);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 110);
    sheet.setColumnWidth(5, 110);
    sheet.setColumnWidth(6, 400);
    sheet.setColumnWidth(7, 250);
    sheet.setColumnWidth(8, 110);
    sheet.setColumnWidth(9, 160);
    sheet.setColumnWidth(10, 450);
  }
  return sheet;
}
// ------------------------------------------------------------
// EXTRAER FILAS DEL HTML
// ------------------------------------------------------------
// Asume que la tabla del correo alterna filas: una fila con los
// datos principales (órgano, expediente, estado, presupuesto,
// límite) seguida de una fila con el objeto del contrato. Ajusta
// esta función si la plantilla de tu proveedor tiene otra estructura.
function extraerFilasDeHtml(html, fechaCorreo) {
  const filas = [];
  const regexFila = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const bloques = [];
  let matchFila;
  while ((matchFila = regexFila.exec(html)) !== null) {
    bloques.push(matchFila[1]);
  }
  for (let i = 0; i < bloques.length - 1; i++) {
    const celdas = extraerCeldas(bloques[i]);
    if (celdas.length >= 5) {
      const organo      = limpiarTexto(celdas[0].html);
      const expediente  = limpiarTexto(celdas[1].html);
      const enlace      = celdas[1].href;
      const estado      = limpiarTexto(celdas[2].html);
      const presupuesto = limpiarTexto(celdas[3].html);
      const limite      = limpiarTexto(celdas[4].html);
      if (estado.toLowerCase().includes(ESTADO_FILTRO)) {
        const celdasSiguiente = extraerCeldas(bloques[i + 1] || "");
        const objeto = celdasSiguiente.length > 0 ? limpiarTexto(celdasSiguiente[0].html) : "";
        filas.push([
          organo, expediente, estado, presupuesto, limite, objeto, enlace,
          Utilities.formatDate(fechaCorreo, Session.getScriptTimeZone(), "dd/MM/yyyy"),
          "", "" // Veredicto y Justificación vacíos, para revisión manual
        ]);
      }
    }
  }
  return filas;
}
// ------------------------------------------------------------
// EXTRAER CELDAS - devuelve { html, href }
// ------------------------------------------------------------
function extraerCeldas(html) {
  const celdas = [];
  const regex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const contenido = match[1];
    const hrefMatch = contenido.match(/href=["']([^"']+)["']/i);
    let href = "";
    if (hrefMatch) {
      href = hrefMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
    celdas.push({ html: contenido, href: href });
  }
  return celdas;
}
// ------------------------------------------------------------
// LIMPIAR TEXTO HTML
// ------------------------------------------------------------
function limpiarTexto(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
// ------------------------------------------------------------
// CONFIGURAR TRIGGER (ejecutar UNA SOLA VEZ)
// ------------------------------------------------------------
function configurarTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === "procesarCorreosLicitaciones") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("procesarCorreosLicitaciones")
    .timeBased()
    .everyDays(1)
    .atHour(HORA_EJECUCION)
    .create();
  Logger.log(`Trigger configurado: cada día a las ${HORA_EJECUCION}:00h`);
}
