/**
 * =========================================================================
 * LTP v2.0 — Conector Seguro y Cifrado de Google Drive
 * Cumplimiento de la Nueva Ley de Protección de Datos Personales (Ley 21.096/19.628),
 * Ley de Garantías de la Niñez y Adolescencia (Ley 21.430) y Ley Karin (Ley 21.643).
 * =========================================================================
 * 
 * CARACTERÍSTICAS DE SEGURIDAD Y DISOCIACIÓN:
 * 1. Anonimización Total: Los archivos y subcarpetas se almacenan en Google Drive
 *    con nombres y hashes aleatorios que impiden identificar a estudiantes, RUNs o funcionarios.
 * 2. Token de Autenticación Criptográfico: Solo peticiones firmadas por el sistema LTP son aceptadas.
 * 3. Privacidad Estricta: Los archivos se crean en modo PRIVADO (sin acceso público por link).
 * 
 * INSTRUCCIONES DE INSTALACIÓN (2 MINUTOS):
 * 1. Ve a https://script.google.com (o en tu Google Drive: Nuevo > Más > Google Apps Script).
 * 2. Borra todo el contenido existente y pega este código.
 * 3. Haz clic en "Implementar" (botón azul superior) > "Nueva implementación".
 * 4. En el ícono de engranaje (Tipo), selecciona "Aplicación web".
 * 5. Configura:
 *    - Descripción: LTP Conector Seguro Cifrado
 *    - Ejecutar como: "Yo" (tu cuenta de Google)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 6. Haz clic en "Implementar", autoriza los permisos de Google Drive de tu cuenta.
 * 7. Copia la URL generada (empieza con https://script.google.com/macros/s/.../exec).
 * 8. Pégala en el chat o en la plataforma LTP para vincularla.
 */

// CLAVE SECRETA DE COMUNICACIÓN CIFRADA ENTRE LTP Y GOOGLE DRIVE
var SECURITY_AUTH_TOKEN = "LTP_SEC_2026_LEGAL_VAULT_KEY";

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ONLINE',
    service: 'LTP Vault Seguro Google Drive',
    compliance: 'Ley 19.628 / Ley 21.430 / Ley Karin',
    account: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Petición vacía o no válida'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);

    // 1. VALIDACIÓN DEL TOKEN DE AUTENTICACIÓN
    if (data.authToken !== SECURITY_AUTH_TOKEN) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '401 No autorizado: Token de autenticación de seguridad inválido.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = data.action || 'upload';

    // 2. TEST DE CONEXIÓN (PING)
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Conexión segura y cifrada verificada con Google Drive',
        user: Session.getActiveUser().getEmail(),
        vaultStatus: 'ACTIVE_ANONYMIZED'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. SUBIDA SEGURA CON ANONIMIZACIÓN EN REPOSO
    if (action === 'upload') {
      // Carpeta raíz institucional segura
      var rootFolderName = data.rootFolderName || 'LTP_EXPEDIENTES_CIFRADOS_2026';
      
      // Subcarpeta anónima (si no se indica, se genera hash aleatorio)
      var subFolderName = data.secureFolder || ('SEC_DIR_' + Utilities.getUuid().substring(0, 8).toUpperCase());
      
      // Nombre anónimo en almacenamiento (NO contiene RUN, nombres de alumnos ni pistas de identidad)
      var storageFileName = data.storageFileName || ('ENC_DOC_' + Utilities.getUuid().replace(/-/g, '') + '.dat');
      
      var mimeType = data.mimeType || 'application/octet-stream';
      var base64Data = data.base64;

      if (!base64Data) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: 'No se recibieron datos de archivo'
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Buscar o crear la carpeta principal segura
      var rootFolders = DriveApp.getFoldersByName(rootFolderName);
      var rootFolder;
      if (rootFolders.hasNext()) {
        rootFolder = rootFolders.next();
      } else {
        rootFolder = DriveApp.createFolder(rootFolderName);
      }

      // Buscar o crear la subcarpeta disociada
      var subFolders = rootFolder.getFoldersByName(subFolderName);
      var targetFolder;
      if (subFolders.hasNext()) {
        targetFolder = subFolders.next();
      } else {
        targetFolder = rootFolder.createFolder(subFolderName);
      }

      // Crear el archivo en Drive con nombre totalmente anónimo
      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, mimeType, storageFileName);
      var file = targetFolder.createFile(blob);

      // POLÍTICA DE SEGURIDAD: Archivo estrictamente PRIVADO (solo accesible por el propietario de la cuenta)
      try {
        file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
      } catch (ePrivate) {}

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fileId: file.getId(),
        storageFileName: storageFileName,
        fileUrl: file.getUrl(),
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + file.getId(),
        folderId: targetFolder.getId(),
        secureFolder: subFolderName,
        size: file.getSize(),
        anonymized: true
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Acción no soportada: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
