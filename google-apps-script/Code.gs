const SHEET_NAME = "Entregas";
const DRIVE_FOLDER_NAME = "MaterialAula fotos";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet_();
  const photoUrl = savePhoto_(payload.photo, payload.group, payload.boxCode, payload.materialName);

  sheet.appendRow([
    new Date(),
    payload.submittedAt || "",
    payload.group || "",
    payload.boxCode || "",
    payload.boxName || "",
    payload.materialName || "",
    payload.units || "",
    payload.state || "",
    payload.category || "",
    payload.categoryColor || "",
    payload.expiry || "",
    payload.observations || "",
    payload.description || "",
    payload.imageUrl || "",
    photoUrl || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, photoUrl }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action || "";
  if (action !== "list") {
    return output_({ ok: true, message: "MaterialAula activo" }, e);
  }
  const sheet = getSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).map(rowToEntry_);
  return output_({ ok: true, entries: rows }, e);
}

function rowToEntry_(row) {
  return {
    receivedAt: stringifyDate_(row[0]),
    submittedAt: row[1],
    group: row[2],
    boxCode: row[3],
    boxName: row[4],
    materialName: row[5],
    units: row[6],
    state: row[7],
    category: row[8],
    categoryColor: row[9],
    expiry: row[10],
    observations: row[11],
    description: row[12],
    imageUrl: row[13],
    photoUrl: row[14],
  };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Recibido",
      "Fecha alumno",
      "Grupo",
      "Codigo caja",
      "Caja",
      "Material identificado",
      "Unidades",
      "Estado",
      "Clasificacion",
      "Color",
      "Caducidad",
      "Observaciones",
      "Descripcion",
      "Imagen automatica",
      "Foto alumno",
    ]);
  }
  return sheet;
}

function savePhoto_(photo, group, boxCode, materialName) {
  if (!photo || !photo.dataUrl) return "";
  const folder = getOrCreateFolder_(DRIVE_FOLDER_NAME);
  const parts = photo.dataUrl.split(",");
  const meta = parts[0] || "";
  const base64 = parts[1] || "";
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : photo.mimeType || "image/jpeg";
  const bytes = Utilities.base64Decode(base64);
  const safeName = [group, boxCode, materialName, new Date().toISOString()]
    .join(" - ")
    .replace(/[\\/:*?"<>|#%{}~&]/g, "-");
  const blob = Utilities.newBlob(bytes, mimeType, `${safeName}.jpg`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function output_(payload, e) {
  const callback = e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(payload)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function stringifyDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  }
  return value || "";
}
