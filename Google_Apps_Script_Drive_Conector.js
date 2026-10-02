/**
 * =========================================================================
 * LTP v2.0 — Conector Maestro Google Drive & Calendar
 * Cuenta Oficial: ltp.campanario@eduvallediguillin.gob.cl
 * Versión: 2.1 — Completo con historial de calendarios
 * Cumplimiento Ley 21.096 / 19.628, Ley 21.430 y Ley Karin
 * =========================================================================
 *
 * ESTRUCTURA AUTOMÁTICA DE CARPETAS EN "MI UNIDAD" DE ltp.campanario:
 * ├── 📁 Files - Perfiles           (fotos de perfil codificadas)
 * ├── 📁 Evaluaciones Originales    (ID: 13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3)
 * │    └── 📁 [Curso] → 📁 [Asignatura] → 📄 Instrumento
 * ├── 📁 Evaluaciones PIE Aparte    (ID: 1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED)
 * │    └── 📁 [Curso] → 📁 [Asignatura] → 📄 Adecuación PIE
 * └── 📁 Calendarios Institucionales
 *
 * CALENDARIOS CONECTADOS:
 * - Uso Sala de Computación : c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com
 * - Evaluaciones 2° Semestre: c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com
 *
 * ACCIONES DISPONIBLES (doPost):
 *  ping                  → verifica conexión
 *  upload_evaluation     → sube evaluación original o PIE con jerarquía
 *  upload_profile_avatar → sube foto de perfil codificada
 *  upload                → sube archivo genérico a bóveda
 *  get_calendar_events   → lee eventos históricos y futuros de un calendario
 *  sync_all_calendars    → vuelca TODOS los eventos de ambos calendarios (para Supabase)
 *  create_folders        → crea la estructura completa de carpetas institucionales
 */

// =========================================================================
// CONFIGURACIÓN GLOBAL
// =========================================================================
var SECURITY_AUTH_TOKEN       = "LTP_SEC_2026_LEGAL_VAULT_KEY";
var DEFAULT_ORIGINALS_FOLDER_ID = "13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3";
var DEFAULT_PIE_FOLDER_ID       = "1JoE4n5kgVYoXQxqh6XlLLE78thRQlEED";

// Calendarios institucionales
var CAL_SALA_COMPUTACION_ID = "c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com";
var CAL_EVALUACIONES_ID     = "c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com";

// =========================================================================
// HELPERS DE DRIVE
// =========================================================================
function getOrCreateSubFolder(parentFolder, childName) {
  var cleanName = String(childName || "General").trim().replace(/[\/\\:*?"<>|]/g, "-");
  var iter = parentFolder.getFoldersByName(cleanName);
  if (iter.hasNext()) return iter.next();
  return parentFolder.createFolder(cleanName);
}

function getRootFolderByIdOrName(folderId, fallbackName) {
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) {}
  }
  var iter = DriveApp.getFoldersByName(fallbackName);
  if (iter.hasNext()) return iter.next();
  return DriveApp.createFolder(fallbackName);
}

// =========================================================================
// HELPERS DE CALENDARIO
// =========================================================================
/**
 * Lee TODOS los eventos de un calendario (históricos + futuros).
 * @param {string} calendarId - ID del Google Calendar
 * @param {Date}   [since]    - Desde qué fecha (default: 2024-01-01)
 * @param {Date}   [until]    - Hasta qué fecha (default: 2 años futuro)
 * @returns {Array} Lista de eventos serializados
 */
function readAllCalendarEvents(calendarId, since, until) {
  var fromDate = since  || new Date("2024-01-01T00:00:00.000Z");
  var toDate   = until  || new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000);

  var cal    = CalendarApp.getCalendarById(calendarId);
  if (!cal) return [];

  var events = cal.getEvents(fromDate, toDate);
  return events.map(function(ev) {
    var allDay = ev.isAllDayEvent();
    return {
      id:           ev.getId(),
      title:        ev.getTitle(),
      description:  ev.getDescription() || "",
      location:     ev.getLocation()    || "",
      start:        allDay ? ev.getAllDayStartDate().toISOString() : ev.getStartTime().toISOString(),
      end:          allDay ? ev.getAllDayEndDate().toISOString()   : ev.getEndTime().toISOString(),
      allDay:       allDay,
      status:       ev.getMyStatus().toString(),
      created:      ev.getDateCreated().toISOString(),
      updated:      ev.getLastUpdated().toISOString(),
      calendarId:   calendarId,
      calendarName: cal.getName()
    };
  });
}

// =========================================================================
// doGet — VERIFICACIÓN DE ESTADO (GET público)
// =========================================================================
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status:    "ONLINE",
    service:   "LTP v2.0 Conector Maestro Google Drive & Calendar",
    account:   Session.getActiveUser().getEmail() || "ltp.campanario@eduvallediguillin.gob.cl",
    version:   "2.1",
    timestamp: new Date().toISOString(),
    calendars: {
      sala_computacion: CAL_SALA_COMPUTACION_ID,
      evaluaciones:     CAL_EVALUACIONES_ID
    }
  })).setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// doPost — PUNTO DE ENTRADA PRINCIPAL
// =========================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _err("Petición vacía o no válida");
    }

    var data = JSON.parse(e.postData.contents);

    if (data.authToken !== SECURITY_AUTH_TOKEN) {
      return _err("401 No autorizado: Token de seguridad inválido.");
    }

    var action = data.action || "upload";

    // ------------------------------------------------------------------
    // 1. PING — Estado de conexión
    // ------------------------------------------------------------------
    if (action === "ping") {
      return _ok({
        message:      "Conexión activa con Google Drive y Google Calendar",
        user:         Session.getActiveUser().getEmail() || "ltp.campanario@eduvallediguillin.gob.cl",
        vaultStatus:  "ACTIVE",
        version:      "2.1"
      });
    }

    // ------------------------------------------------------------------
    // 2. SUBIR EVALUACIÓN ORIGINAL O PIE (jerarquía Curso → Asignatura)
    // ------------------------------------------------------------------
    if (action === "upload_evaluation") {
      var isPie          = !!data.isPie;
      var rootId         = isPie ? (data.pieFolderId || DEFAULT_PIE_FOLDER_ID) : (data.originalsFolderId || DEFAULT_ORIGINALS_FOLDER_ID);
      var fallbackName   = isPie ? "LTP_EVALUACIONES_PIE_2026" : "LTP_EVALUACIONES_ORIGINALES_2026";
      var rootFolder     = getRootFolderByIdOrName(rootId, fallbackName);
      var courseFolder   = getOrCreateSubFolder(rootFolder,   data.courseName   || "Sin Curso");
      var subjectFolder  = getOrCreateSubFolder(courseFolder, data.subjectName  || "General");
      var decodedBytes   = Utilities.base64Decode(data.base64);
      var fileName       = data.fileName || ("Evaluacion_" + new Date().getTime() + ".pdf");
      var blob           = Utilities.newBlob(decodedBytes, data.mimeType || "application/pdf", fileName);
      var file           = subjectFolder.createFile(blob);
      return _ok({
        fileId:          file.getId(),
        fileName:        fileName,
        fileUrl:         file.getUrl(),
        downloadUrl:     "https://drive.google.com/uc?export=download&id=" + file.getId(),
        folderPath:      (isPie ? "PIE" : "Originales") + " / " + (data.courseName || "Sin Curso") + " / " + (data.subjectName || "General"),
        courseFolderId:  courseFolder.getId(),
        subjectFolderId: subjectFolder.getId()
      });
    }

    // ------------------------------------------------------------------
    // 3. SUBIR FOTO DE PERFIL CODIFICADA (nombre aleatorio anónimo)
    // ------------------------------------------------------------------
    if (action === "upload_profile_avatar") {
      var avatarsRoot    = getRootFolderByIdOrName(data.profilesFolderId || "", "Files - Perfiles");
      var randomFileName = data.storageFileName || ("AVT_" + Utilities.getUuid().replace(/-/g, "") + ".jpg");
      var avatarBytes    = Utilities.base64Decode(data.base64);
      var avatarBlob     = Utilities.newBlob(avatarBytes, data.mimeType || "image/jpeg", randomFileName);
      var avatarFile     = avatarsRoot.createFile(avatarBlob);
      return _ok({
        fileId:          avatarFile.getId(),
        storageFileName: randomFileName,
        fileUrl:         avatarFile.getUrl(),
        folderId:        avatarsRoot.getId(),
        anonymized:      true
      });
    }

    // ------------------------------------------------------------------
    // 4. SUBIDA GENERAL / BÓVEDA ANÓNIMA
    // ------------------------------------------------------------------
    if (action === "upload") {
      var rootFolderName  = data.rootFolderName || "LTP_EXPEDIENTES_CIFRADOS_2026";
      var subFolderName   = data.secureFolder   || ("SEC_DIR_" + Utilities.getUuid().substring(0, 8).toUpperCase());
      var storageFileName = data.storageFileName || ("ENC_DOC_" + Utilities.getUuid().replace(/-/g, "") + ".dat");
      var vaultRoot       = getRootFolderByIdOrName(data.rootFolderId || "", rootFolderName);
      var targetFolder    = getOrCreateSubFolder(vaultRoot, subFolderName);
      if (data.nestedSubFolder) targetFolder = getOrCreateSubFolder(targetFolder, data.nestedSubFolder);
      var bytes     = Utilities.base64Decode(data.base64);
      var docBlob   = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", storageFileName);
      var savedFile = targetFolder.createFile(docBlob);
      return _ok({
        fileId:          savedFile.getId(),
        storageFileName: storageFileName,
        fileUrl:         savedFile.getUrl(),
        downloadUrl:     "https://drive.google.com/uc?export=download&id=" + savedFile.getId(),
        folderId:        targetFolder.getId(),
        secureFolder:    subFolderName,
        size:            savedFile.getSize(),
        anonymized:      true
      });
    }

    // ------------------------------------------------------------------
    // 5. LEER EVENTOS DE UN CALENDARIO (históricos + futuros)
    //    Payload: { calendarId, since?, until? }
    // ------------------------------------------------------------------
    if (action === "get_calendar_events") {
      var calId  = data.calendarId;
      if (!calId) return _err("Se requiere calendarId.");
      var since  = data.since ? new Date(data.since) : new Date("2024-01-01T00:00:00.000Z");
      var until  = data.until ? new Date(data.until) : new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000);
      var events = readAllCalendarEvents(calId, since, until);
      return _ok({
        calendarId: calId,
        total:      events.length,
        events:     events
      });
    }

    // ------------------------------------------------------------------
    // 6. SINCRONIZAR AMBOS CALENDARIOS COMPLETOS (para Supabase)
    //    Retorna eventos de Sala de Computación Y Evaluaciones
    // ------------------------------------------------------------------
    if (action === "sync_all_calendars") {
      var since2 = data.since ? new Date(data.since) : new Date("2024-01-01T00:00:00.000Z");
      var until2 = data.until ? new Date(data.until) : new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000);

      var roomEvents  = readAllCalendarEvents(CAL_SALA_COMPUTACION_ID, since2, until2);
      var evalEvents  = readAllCalendarEvents(CAL_EVALUACIONES_ID,     since2, until2);

      return _ok({
        total:             roomEvents.length + evalEvents.length,
        room_reservations: roomEvents,
        pedagogical_evaluations: evalEvents,
        syncedAt:          new Date().toISOString()
      });
    }

    // ------------------------------------------------------------------
    // 7. CREAR ESTRUCTURA COMPLETA DE CARPETAS INSTITUCIONALES
    // ------------------------------------------------------------------
    if (action === "create_folders") {
      var root        = DriveApp.getRootFolder();

      // Files - Perfiles
      var perfilesFolder = getOrCreateSubFolder(root, "Files - Perfiles");

      // Evaluaciones Originales (intentar con ID primero)
      var originalesFolder = getRootFolderByIdOrName(DEFAULT_ORIGINALS_FOLDER_ID, "Evaluaciones Originales");

      // Evaluaciones PIE Aparte
      var pieFolder = getRootFolderByIdOrName(DEFAULT_PIE_FOLDER_ID, "Evaluaciones PIE Aparte");

      // Calendarios Institucionales (carpeta informativa)
      var calsFolder = getOrCreateSubFolder(root, "Calendarios Institucionales");

      return _ok({
        message:          "Estructura de carpetas verificada/creada correctamente",
        folders: {
          perfiles:           { id: perfilesFolder.getId(),    name: perfilesFolder.getName() },
          evaluacionesOrig:   { id: originalesFolder.getId(),  name: originalesFolder.getName() },
          evaluacionesPie:    { id: pieFolder.getId(),         name: pieFolder.getName() },
          calendarios:        { id: calsFolder.getId(),        name: calsFolder.getName() }
        }
      });
    }

    return _err("Acción no soportada: " + action);

  } catch (error) {
    return _err(error.toString());
  }
}

// =========================================================================
// HELPERS DE RESPUESTA
// =========================================================================
function _ok(payload) {
  return ContentService.createTextOutput(
    JSON.stringify(Object.assign({ success: true }, payload))
  ).setMimeType(ContentService.MimeType.JSON);
}

function _err(msg) {
  return ContentService.createTextOutput(
    JSON.stringify({ success: false, error: msg })
  ).setMimeType(ContentService.MimeType.JSON);
}
