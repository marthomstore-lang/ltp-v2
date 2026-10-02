/**
 * sync_room_reservations.js
 * Inserta los 203 eventos del calendario de Sala de Computación
 * en room_reservations según el esquema real de Supabase
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

function generarBloques(desde, hasta, meses = 3) {
  const bloques = [];
  let actual = new Date(desde);
  while (actual < hasta) {
    const fin = new Date(actual);
    fin.setMonth(fin.getMonth() + meses);
    if (fin > hasta) fin.setTime(hasta.getTime());
    bloques.push({ desde: new Date(actual), hasta: new Date(fin) });
    actual = new Date(fin);
  }
  return bloques;
}

/**
 * Parsea el título de un evento del calendario de Sala para extraer:
 * teacher_name, course_name, subject_name, activity_detail, block_label
 * Formato típico: "Nombre Docente - Asignatura - Curso - Bloque" o libre
 */
function parsearEventoSala(ev) {
  const titulo    = ev.title || '';
  const desc      = ev.description || '';
  const start     = new Date(ev.start);
  const fechaStr  = ev.start.substring(0, 10); // YYYY-MM-DD

  // Intentar parsear formato "Docente | Curso | Asignatura | Bloque"
  const partes = titulo.split(/[|\-–]/).map(p => p.trim()).filter(Boolean);

  return {
    id:               ev.id,
    teacher_name:     partes[0] || 'Docente',
    teacher_email:    DRIVE_EMAIL,
    course_name:      partes[1] || '',
    subject_name:     partes[2] || '',
    activity_detail:  desc || titulo,
    reservation_date: fechaStr,
    block_label:      partes[3] || `${start.getHours()}:00 - ${start.getHours() + 1}:00`,
    start_time:       ev.start.substring(0, 19).replace('T', ' '),
    end_time:         ev.end.substring(0, 19).replace('T', ' '),
    status:           'Confirmada',
    calendar_event_id: ev.id
  };
}

async function main() {
  console.log('\n💻 SINCRONIZANDO SALA DE COMPUTACIÓN → room_reservations');
  console.log('==========================================================');

  const desde  = new Date('2026-04-01T00:00:00.000Z'); // Desde donde hay datos
  const hasta  = new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000);
  const bloques = generarBloques(desde, hasta, 3);

  const todosEventos = [];
  console.log(`\nLeyendo ${bloques.length} bloques desde Google Calendar...`);

  for (const bloque of bloques) {
    const label = `${bloque.desde.toISOString().substring(0,7)} → ${bloque.hasta.toISOString().substring(0,7)}`;
    try {
      const r = await callGas('get_calendar_events', {
        calendarId: CAL_SALA,
        since: bloque.desde.toISOString(),
        until: bloque.hasta.toISOString()
      });
      todosEventos.push(...(r.events || []));
      console.log(`  ✓ ${label}: ${r.total} evento(s)`);
    } catch(e) {
      console.log(`  ⚠️ ${label}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Deduplicar
  const unicos = Object.values(
    todosEventos.reduce((acc, ev) => { acc[ev.id] = ev; return acc; }, {})
  );
  console.log(`\nTotal únicos: ${unicos.length} eventos`);

  // Insertar en room_reservations con esquema correcto
  console.log('\nInsertando en Supabase (room_reservations)...');
  let ok = 0, skip = 0;

  for (const ev of unicos) {
    const d = parsearEventoSala(ev);
    try {
      await pool.query(`
        INSERT INTO room_reservations (
          id, teacher_name, teacher_email, course_name, subject_name,
          activity_detail, reservation_date, block_label,
          start_time, end_time, status, calendar_event_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE SET
          teacher_name     = EXCLUDED.teacher_name,
          activity_detail  = EXCLUDED.activity_detail,
          reservation_date = EXCLUDED.reservation_date,
          block_label      = EXCLUDED.block_label,
          start_time       = EXCLUDED.start_time,
          end_time         = EXCLUDED.end_time,
          status           = EXCLUDED.status
      `, [
        d.id, d.teacher_name, d.teacher_email, d.course_name, d.subject_name,
        d.activity_detail, d.reservation_date, d.block_label,
        d.start_time, d.end_time, d.status, d.calendar_event_id
      ]);
      ok++;
    } catch(e) {
      console.warn(`  ⚠️ Skip ${ev.id}: ${e.message}`);
      skip++;
    }
  }

  const total = await pool.query('SELECT COUNT(*) as c FROM room_reservations');

  console.log('\n==========================================================');
  console.log('✅ FINALIZADO');
  console.log(`   Insertadas/actualizadas : ${ok}`);
  console.log(`   Omitidas con error      : ${skip}`);
  console.log(`   Total en Supabase       : ${total.rows[0].c}`);
  console.log('==========================================================\n');

  await pool.end();
}

main().catch(e => {
  console.error('\n❌ Error:', e.message);
  pool.end().catch(() => {});
  process.exit(1);
});
