/**
 * sync_calendarios_por_bloques.js
 * Lee los calendarios en bloques trimestrales para evitar timeout del GAS
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const GAS_ID      = 'AKfycbzuaS4l3DCDOpkEV70J9_3RFejncNrAfuWAyRHxzbY7ioW-zk0i2kDrlOEhwawu6hDi0g';
const TOKEN       = 'LTP_SEC_2026_LEGAL_VAULT_KEY';
const DRIVE_EMAIL = 'ltp.campanario@eduvallediguillin.gob.cl';
const CAL_SALA    = 'c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com';
const CAL_EVAL    = 'c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com';
const DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/13tWiU2Ot0Jn9S2vQZYrTT0eyBqGb5NC3';

async function callGas(action, extra = {}) {
  const res = await fetch(`https://script.google.com/macros/s/${GAS_ID}/exec`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ authToken: TOKEN, action, ...extra }),
    signal:  AbortSignal.timeout(60000)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

/** Genera bloques trimestrales entre dos fechas */
function generarBloques(desde, hasta, mesesPorBloque = 3) {
  const bloques = [];
  let actual = new Date(desde);
  while (actual < hasta) {
    const fin = new Date(actual);
    fin.setMonth(fin.getMonth() + mesesPorBloque);
    if (fin > hasta) fin.setTime(hasta.getTime());
    bloques.push({ desde: new Date(actual), hasta: new Date(fin) });
    actual = new Date(fin);
  }
  return bloques;
}

/** Lee todos los eventos de un calendario por bloques */
async function leerCalendarioPorBloques(nombre, calId, desde, hasta) {
  const bloques = generarBloques(desde, hasta, 3); // trimestres
  const todosEventos = [];
  console.log(`\n   📅 ${nombre} — ${bloques.length} bloques a leer:`);

  for (const bloque of bloques) {
    const label = `${bloque.desde.toISOString().substring(0,7)} → ${bloque.hasta.toISOString().substring(0,7)}`;
    try {
      const r = await callGas('get_calendar_events', {
        calendarId: calId,
        since: bloque.desde.toISOString(),
        until: bloque.hasta.toISOString()
      });
      todosEventos.push(...(r.events || []));
      process.stdout.write(`      ✓ ${label}: ${r.total} evento(s)\n`);
    } catch(e) {
      process.stdout.write(`      ⚠️ ${label}: ${e.message}\n`);
    }
    // Pequeña pausa entre bloques para no saturar el GAS
    await new Promise(r => setTimeout(r, 1500));
  }

  // Deduplicar por ID
  const unicos = Object.values(
    todosEventos.reduce((acc, ev) => { acc[ev.id] = ev; return acc; }, {})
  );
  console.log(`   → Total ${nombre}: ${unicos.length} eventos únicos`);
  return unicos;
}

async function insertarRoomReservations(eventos) {
  if (eventos.length === 0) return;
  console.log(`\n💻 Insertando ${eventos.length} reservas de Sala de Computación en Supabase...`);
  let ok = 0, skip = 0;
  for (const ev of eventos) {
    try {
      await pool.query(`
        INSERT INTO room_reservations (id, title, description, start_time, end_time, teacher_email, status, source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          title=$2, description=$3, start_time=$4, end_time=$5
      `, [ev.id, ev.title, ev.description||'', ev.start, ev.end, DRIVE_EMAIL, 'Confirmada', 'google_calendar']);
      ok++;
    } catch(e) {
      skip++;
    }
  }
  console.log(`   ✅ room_reservations: ${ok} insertadas, ${skip} omitidas`);
}

async function insertarPedagogicalEvaluations(eventos) {
  if (eventos.length === 0) return;
  console.log(`\n📝 Insertando ${eventos.length} evaluaciones en Supabase...`);
  let ok = 0, skip = 0;
  for (const ev of eventos) {
    try {
      await pool.query(`
        INSERT INTO pedagogical_evaluations (
          id, teacher_name, teacher_email, evaluation_title, course_name,
          subject_name, evaluation_date, block_label, status, original_file_name, original_file_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO UPDATE SET
          evaluation_title=$4, evaluation_date=$7, status=$9
      `, [
        ev.id,
        'Docente Institucional',
        DRIVE_EMAIL,
        ev.title,
        ev.location || 'Sin Curso',
        ev.description || 'Evaluación',
        ev.start.substring(0,10),
        'Jornada Escolar',
        'Completado',
        ev.title,
        DRIVE_FOLDER_URL
      ]);
      ok++;
    } catch(e) {
      skip++;
    }
  }
  console.log(`   ✅ pedagogical_evaluations: ${ok} insertadas, ${skip} omitidas`);
}

async function main() {
  console.log('\n🚀 SINCRONIZACIÓN COMPLETA DE CALENDARIOS → SUPABASE');
  console.log('=========================================================');
  console.log(`Cuenta: ${DRIVE_EMAIL}`);
  console.log(`GAS ID: ${GAS_ID}\n`);

  const ping = await callGas('ping');
  console.log(`✓ GAS online: ${ping.user} v${ping.version}`);

  const desde = new Date('2024-01-01T00:00:00.000Z');
  const hasta = new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000); // +2 años

  console.log(`\nRango total: ${desde.toISOString().substring(0,10)} → ${hasta.toISOString().substring(0,10)}`);

  // Leer ambos calendarios por bloques
  const salaEventos = await leerCalendarioPorBloques('Sala de Computación', CAL_SALA, desde, hasta);
  const evalEventos = await leerCalendarioPorBloques('Evaluaciones 2° Sem', CAL_EVAL, desde, hasta);

  // Insertar en Supabase
  await insertarRoomReservations(salaEventos);
  await insertarPedagogicalEvaluations(evalEventos);

  console.log('\n=========================================================');
  console.log('✅ SINCRONIZACIÓN FINALIZADA');
  console.log(`   Sala Computación  : ${salaEventos.length} eventos`);
  console.log(`   Evaluaciones      : ${evalEventos.length} eventos`);
  console.log(`   Total en Supabase : ${salaEventos.length + evalEventos.length} eventos`);
  console.log('=========================================================\n');

  await pool.end();
}

main().catch(e => {
  console.error('\n❌ Error fatal:', e.message);
  pool.end().catch(()=>{});
  process.exit(1);
});
