/**
 * =========================================================================
 * LTP v2.0 — Conector Maestro Google Drive (Jerarquía Automática) & Calendar
 * Cuenta Oficial: ltp.camapanrio@eduvallediguillin.gob.cl
 * Cumplimiento Ley 21.096 / 19.628, Ley 21.430 y Ley Karin
 * =========================================================================
 *
 * ESTRUCTURA AUTOMÁTICA DE CARPETAS EN GOOGLE DRIVE:
 * 1. Evaluaciones Originales (ID: 13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3):
 *    └── 📁 [Curso] (ej. 1° Medio A)
 *        └── 📁 [Asignatura] (ej. Matemática)
 *            └── 📄 Instrumento Original
 *
 * 2. Evaluaciones Adecuadas PIE (ID: 1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED):
 *    └── 📁 [Curso] (ej. 1° Medio A)
 *        └── 📁 [Asignatura] (ej. Matemática)
 *            └── 📄 Evaluación Adaptada PIE
 *
 * 3. Fotos de Perfil e Imágenes del Sistema (Carpeta: LTP_PERFILES_CODIFICADOS_2026):
 *    └── 🖼️ AVT_<codigo_aleatorio_hex>.jpg (Nombre aleatorio anónimo codificado internamente en BD)
 *
 * 4. Expedientes Cifrados (Carpeta: LTP_EXPEDIENTES_CIFRADOS_2026):
 *    └── 📁 SEC_VAULT_<hash> / ENC_DOC_<hash>.dat
 */

var SECURITY_AUTH_TOKEN = "LTP_SEC_2026_LEGAL_VAULT_KEY";
var DEFAULT_ORIGINALS_FOLDER_ID = "13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3";
var DEFAULT_PIE_FOLDER_ID = "1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED";
var DEFAULT_EVAL_CALENDAR_ID = "c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com";

function getOrCreateSubFolder(parentFolder, childName) {
  var cleanName = String(childName || "General").trim().replace(/[\/\\:*?"<>|]/g, "-");
  var iter = parentFolder.getFoldersByName(cleanName);
  if (iter.hasNext()) {
    return iter.next();
  }
  return parentFolder.createFolder(cleanName);
}

function getRootFolderByIdOrName(folderId, fallbackName) {
  if (folderId) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }
  var iter = DriveApp.getFoldersByName(fallbackName);
  if (iter.hasNext()) {
    return iter.next();
  }
  return DriveApp.createFolder(fallbackName);
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ONLINE",
    service: "LTP v2.0 Conector Maestro Google Drive & Calendar",
    account: Session.getActiveUser().getEmail() || "ltp.camapanrio@eduvallediguillin.gob.cl",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Petición vacía o no válida"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    if (data.authToken !== SECURITY_AUTH_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "401 No autorizado: Token de seguridad inválido."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = data.action || "upload";

    // 1. PING / ESTADO DE CONEXIÓN
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Conexión activa con Google Drive y Google Calendar",
        user: Session.getActiveUser().getEmail() || "ltp.camapanrio@eduvallediguillin.gob.cl",
        vaultStatus: "ACTIVE_HIERARCHICAL_DRIVE"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. SUBIDA DE EVALUACIÓN ORIGINAL O PIE (JERARQUÍA AUTOMÁTICA: CURSO -> ASIGNATURA)
    if (action === "upload_evaluation") {
      var isPie = !!data.isPie;
      var rootId = isPie
        ? (data.pieFolderId || DEFAULT_PIE_FOLDER_ID)
        : (data.originalsFolderId || DEFAULT_ORIGINALS_FOLDER_ID);
      var fallbackRootName = isPie ? "LTP_EVALUACIONES_PIE_2026" : "LTP_EVALUACIONES_ORIGINALES_2026";

      var rootFolder = getRootFolderByIdOrName(rootId, fallbackRootName);
      var courseFolder = getOrCreateSubFolder(rootFolder, data.courseName || "Sin Curso");
      var subjectFolder = getOrCreateSubFolder(courseFolder, data.subjectName || "General");

      var decodedBytes = Utilities.base64Decode(data.base64);
      var fileName = data.fileName || ("Evaluacion_" + new Date().getTime() + ".pdf");
      var blob = Utilities.newBlob(decodedBytes, data.mimeType || "application/pdf", fileName);
      var file = subjectFolder.createFile(blob);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        fileName: fileName,
        fileUrl: file.getUrl(),
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + file.getId(),
        folderPath: (isPie ? "PIE" : "Originales") + " / " + (data.courseName || "Sin Curso") + " / " + (data.subjectName || "General"),
        courseFolderId: courseFolder.getId(),
        subjectFolderId: subjectFolder.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. SUBIDA DE IMAGEN DE PERFIL CODIFICADA (NOMBRE ALEATORIO ANÓNIMO)
    if (action === "upload_profile_avatar") {
      var avatarsRoot = getRootFolderByIdOrName(data.profilesFolderId || "", "LTP_PERFILES_CODIFICADOS_2026");
      var randomFileName = data.storageFileName || ("AVT_" + Utilities.getUuid().replace(/-/g, "") + ".jpg");
      var avatarBytes = Utilities.base64Decode(data.base64);
      var avatarBlob = Utilities.newBlob(avatarBytes, data.mimeType || "image/jpeg", randomFileName);
      var avatarFile = avatarsRoot.createFile(avatarBlob);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: avatarFile.getId(),
        storageFileName: randomFileName,
        fileUrl: avatarFile.getUrl(),
        folderId: avatarsRoot.getId(),
        anonymized: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. SUBIDA GENERAL / BÓVEDA ANÓNIMA
    if (action === "upload") {
      var rootFolderName = data.rootFolderName || "LTP_EXPEDIENTES_CIFRADOS_2026";
      var subFolderName = data.secureFolder || ("SEC_DIR_" + Utilities.getUuid().substring(0, 8).toUpperCase());
      var storageFileName = data.storageFileName || ("ENC_DOC_" + Utilities.getUuid().replace(/-/g, "") + ".dat");

      var vaultRoot = getRootFolderByIdOrName(data.rootFolderId || "", rootFolderName);
      var targetFolder = getOrCreateSubFolder(vaultRoot, subFolderName);
      if (data.nestedSubFolder) {
        targetFolder = getOrCreateSubFolder(targetFolder, data.nestedSubFolder);
      }

      var bytes = Utilities.base64Decode(data.base64);
      var docBlob = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", storageFileName);
      var savedFile = targetFolder.createFile(docBlob);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: savedFile.getId(),
        storageFileName: storageFileName,
        fileUrl: savedFile.getUrl(),
        downloadUrl: "https://drive.google.com/uc?export=download&id=" + savedFile.getId(),
        folderId: targetFolder.getId(),
        secureFolder: subFolderName,
        size: savedFile.getSize(),
        anonymized: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: "Acción no soportada: " + action
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
