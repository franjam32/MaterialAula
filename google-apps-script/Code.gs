const SHEET_NAME = "Entregas";
const DRIVE_FOLDER_NAME = "MaterialAula fotos";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents || "{}");
  const sheet = getSheet_();
  const photoUrl = savePhoto_(payload.photo, payload.student, payload.boxCode, payload.materialName);

  sheet.appendRow([
    new Date(),
    payload.submittedAt || "",
    payload.student || "",
    payload.boxCode || "",
    payload.locationName || "",
    payload.locationPath || "",
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

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Recibido",
      "Fecha alumno",
      "Grupo/alumno",
      "Codigo caja",
      "Ubicacion",
      "Ruta",
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

function savePhoto_(photo, student, boxCode, materialName) {
  if (!photo || !photo.dataUrl) return "";
  const folder = getOrCreateFolder_(DRIVE_FOLDER_NAME);
  const parts = photo.dataUrl.split(",");
  const meta = parts[0] || "";
  const base64 = parts[1] || "";
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : photo.mimeType || "image/jpeg";
  const bytes = Utilities.base64Decode(base64);
  const safeName = [student, boxCode, materialName, new Date().toISOString()]
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
