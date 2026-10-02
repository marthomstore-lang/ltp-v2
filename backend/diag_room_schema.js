require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  // Esquema de la tabla
  const schema = await pool.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'room_reservations' ORDER BY ordinal_position"
  );
  console.log('=== ESQUEMA room_reservations ===');
  schema.rows.forEach(c => console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(25)} nullable:${c.is_nullable}`));

  const count = await pool.query('SELECT COUNT(*) as total FROM room_reservations');
  console.log('\nRegistros actuales:', count.rows[0].total);

  // Probar insert de un evento de prueba
  console.log('\n=== PROBANDO INSERT ===');
  try {
    await pool.query(`
      INSERT INTO room_reservations (id, title, description, start_time, end_time, teacher_email, status, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET title=$2
    `, ['TEST-DIAG-001', 'Prueba Diagnóstico', 'test', '2026-10-01T08:00:00Z', '2026-10-01T09:00:00Z', 'ltp.campanario@eduvallediguillin.gob.cl', 'Confirmada', 'google_calendar']);
    console.log('✅ Insert OK con columnas: id, title, description, start_time, end_time, teacher_email, status, source');
    await pool.query("DELETE FROM room_reservations WHERE id = 'TEST-DIAG-001'");
  } catch(e) {
    console.log('❌ Error insert estándar:', e.message);

    // Intentar sin source
    try {
      await pool.query(`
        INSERT INTO room_reservations (id, title, description, start_time, end_time, teacher_email, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET title=$2
      `, ['TEST-DIAG-001', 'Prueba Diagnóstico', 'test', '2026-10-01T08:00:00Z', '2026-10-01T09:00:00Z', 'ltp.campanario@eduvallediguillin.gob.cl', 'Confirmada']);
      console.log('✅ Insert OK SIN columna source');
      await pool.query("DELETE FROM room_reservations WHERE id = 'TEST-DIAG-001'");
    } catch(e2) {
      console.log('❌ Error sin source:', e2.message);
    }
  }

  await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
