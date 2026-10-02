/**
 * =========================================================================
 * sync_google_evaluations.js — Sincronización Completa Google → Supabase
 * Cuenta GAS: ltp.campanario@eduvallediguillin.gob.cl
 *
 * INSTRUCCIONES:
 * 1. Despliega Google_Apps_Script_Drive_Conector.js desde script.google.com
 *    (sesión: ltp.campanario@eduvallediguillin.gob.cl)
 * 2. Copia el nuevo Deployment ID y reemplaza NUEVO_GAS_DEPLOYMENT_ID abajo
 * 3. Ejecuta: node scratch/sync_google_evaluations.js
 *
 * ACCIONES QUE REALIZA:
 *  ✓ Guarda el nuevo script ID en integration_settings de Supabase
 *  ✓ Sincroniza historial de Sala de Computación → room_reservations
 *  ✓ Sincroniza historial de Evaluaciones 2° Sem → pedagogical_evaluations
 *  ✓ Crea la estructura de carpetas institucionales en Drive de ltp.campanario
 * =========================================================================
 */

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ⚠️  REEMPLAZA CON EL NUEVO DEPLOYMENT ID TRAS DESPLEGAR EL SCRIPT DESDE ltp.campanario@
const NUEVO_GAS_DEPLOYMENT_ID = 'AKfycbzuaS4l3DCDOpkEV70J9_3RFejncNrAfuWAyRHxzbY7ioW-zk0i2kDrlOEhwawu6hDi0g';

const AUTH_TOKEN  = 'LTP_SEC_2026_LEGAL_VAULT_KEY';
const DRIVE_EMAIL = 'ltp.campanario@eduvallediguillin.gob.cl';
const CAL_SALA    = 'c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com';
const CAL_EVAL    = 'c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com';

function gasUrl() {
  return `https://script.google.com/macros/s/${NUEVO_GAS_DEPLOYMENT_ID}/exec`;
}

/** Llama al GAS vía doPost con authToken */
async function callGas(action, extra = {}) {
  const payload = { authToken: AUTH_TOKEN, action, ...extra };
  const res = await fetch(gasUrl(), {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(90000)
  });
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.success) throw new Error(`GAS Error: ${json.error}`);
  return json;
}

async function main() {
  if (NUEVO_GAS_DEPLOYMENT_ID === 'PENDING_NEW_DEPLOYMENT_ID') {
    console.error('❌ PRIMERO debes desplegar el script desde ltp.campanario@eduvallediguillin.gob.cl');
    console.error('   y reemplazar NUEVO_GAS_DEPLOYMENT_ID en este archivo.');
    process.exit(1);
  }

  // -----------------------------------------------------------------------
  // 1. Verificar conexión con el nuevo GAS
  // -----------------------------------------------------------------------
  console.log('\n🔌 Verificando conexión con el nuevo GAS...');
  const ping = await callGas('ping');
  console.log(`   ✓ Conectado: ${ping.user} — versión ${ping.version}`);

  // -----------------------------------------------------------------------
  // 2. Guardar el nuevo script ID en integration_settings de Supabase
  // -----------------------------------------------------------------------
  console.log('\n📋 Guardando parámetros de integración en Supabase...');
  await pool.query(`
    INSERT INTO integration_settings (setting_key, setting_value, description, updated_at) VALUES
      ('GOOGLE_DRIVE_ACCOUNT_EMAIL',   $1, 'Cuenta Google Workspace Oficial para Drive y Calendar', CURRENT_TIMESTAMP),
      ('GOOGLE_EVALUATIONS_SCRIPT_ID', $2, 'Deployment ID Google Apps Script v2.1 (ltp.campanario)', CURRENT_TIMESTAMP),
      ('GOOGLE_DRIVE_WEBHOOK_URL',     $3, 'URL Conector Activo Google Drive y Calendar v2.1', CURRENT_TIMESTAMP),
      ('GOOGLE_CAL_SALA_COMPUTO_ID',   $4, 'Calendar ID Uso Sala de Computación', CURRENT_TIMESTAMP),
      ('GOOGLE_CAL_EVALUACIONES_ID',   $5, 'Calendar ID Evaluaciones 2° Semestre', CURRENT_TIMESTAMP)
    ON CONFLICT (setting_key) DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_at    = CURRENT_TIMESTAMP
  `, [
    DRIVE_EMAIL,
    NUEVO_GAS_DEPLOYMENT_ID,
    gasUrl(),
    CAL_SALA,
    CAL_EVAL
  ]);
  console.log('   ✓ Parámetros guardados.');

  // -----------------------------------------------------------------------
  // 3. Crear estructura de carpetas institucionales en Drive de ltp.campanario
  // -----------------------------------------------------------------------
  console.log('\n📁 Creando estructura de carpetas institucionales en Google Drive...');
  const folders = await callGas('create_folders');
  console.log('   ✓ Carpetas creadas/verificadas:');
  Object.entries(folders.folders).forEach(([key, f]) => {
    console.log(`      - ${f.name} (ID: ${f.id})`);
  });

  // -----------------------------------------------------------------------
  // 4. Sincronizar ambos calendarios → Supabase
  // -----------------------------------------------------------------------
  console.log('\n📅 Sincronizando eventos históricos de ambos calendarios...');
  const syncResult = await callGas('sync_all_calendars', {
    since: '2024-01-01T00:00:00.000Z',
    until: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString()
  });

  const { room_reservations, pedagogical_evaluations: evalEvents } = syncResult;
  console.log(`   Total eventos: ${syncResult.total} (Sala: ${room_reservations.length}, Evaluaciones: ${evalEvents.length})`);

  // -----------------------------------------------------------------------
  // 4a. Insertar room_reservations (Sala de Computación)
  // -----------------------------------------------------------------------
  if (room_reservations.length > 0) {
    console.log(`\n💻 Insertando ${room_reservations.length} reservas de Sala de Computación...`);
    for (let i = 0; i < room_reservations.length; i += 50) {
      const chunk = room_reservations.slice(i, i + 50);
      for (const ev of chunk) {
        await pool.query(`
          INSERT INTO room_reservations (
            id, title, description, start_time, end_time, teacher_email, status, source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            title       = EXCLUDED.title,
            description = EXCLUDED.description,
            start_time  = EXCLUDED.start_time,
            end_time    = EXCLUDED.end_time
        `, [
          ev.id,
          ev.title,
          ev.description || '',
          ev.start,
          ev.end,
          DRIVE_EMAIL,
          'Confirmada',
          'google_calendar'
        ]).catch(e => console.warn(`   ⚠️ room_reservation skip (${ev.id}): ${e.message}`));
      }
      console.log(`   ✓ ${Math.min(i + 50, room_reservations.length)} / ${room_reservations.length}`);
    }
    console.log('   ✅ room_reservations sincronizadas.');
  }

  // -----------------------------------------------------------------------
  // 4b. Insertar pedagogical_evaluations (Evaluaciones 2° Semestre)
  // -----------------------------------------------------------------------
  if (evalEvents.length > 0) {
    console.log(`\n📝 Insertando ${evalEvents.length} evaluaciones desde Google Calendar...`);
    const driveFolderUrl = 'https://drive.google.com/drive/folders/13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3';
    for (const ev of evalEvents) {
      await pool.query(`
        INSERT INTO pedagogical_evaluations (
          id, teacher_name, teacher_email, evaluation_title, course_name, subject_name,
          evaluation_date, block_label, status, original_file_name, original_file_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          evaluation_title = EXCLUDED.evaluation_title,
          evaluation_date  = EXCLUDED.evaluation_date,
          status           = EXCLUDED.status
      `, [
        ev.id,
        'Docente Institucional',
        DRIVE_EMAIL,
        ev.title,
        ev.location || 'Sin Curso',
        ev.description || 'Evaluación',
        ev.start.substring(0, 10),
        'Jornada Escolar',
        'Completado',
        ev.title,
        driveFolderUrl
      ]).catch(e => console.warn(`   ⚠️ eval skip (${ev.id}): ${e.message}`));
    }
    console.log('   ✅ pedagogical_evaluations sincronizadas.');
  }

  // -----------------------------------------------------------------------
  // 5. Resumen final
  // -----------------------------------------------------------------------
  console.log('\n=======================================================');
  console.log('✅ SINCRONIZACIÓN COMPLETA FINALIZADA');
  console.log(`   Cuenta Drive/GAS : ${DRIVE_EMAIL}`);
  console.log(`   Script ID        : ${NUEVO_GAS_DEPLOYMENT_ID}`);
  console.log(`   Sala Computación : ${room_reservations.length} eventos`);
  console.log(`   Evaluaciones     : ${evalEvents.length} eventos`);
  console.log('=======================================================\n');

  await pool.end();
}

main().catch(err => {
  console.error('\n❌ Error:', err.message || err);
  pool.end().catch(() => {});
  process.exit(1);
});
