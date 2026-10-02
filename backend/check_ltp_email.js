const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    // Buscar usuario LTP o con correo mal escrito
    const r1 = await pool.query(
      "SELECT id, run, name, email, role FROM users WHERE email ILIKE '%ltp%' OR email ILIKE '%campanario%' OR email ILIKE '%admin%' ORDER BY email"
    );
    console.log('=== USUARIOS CON CORREO LTP/CAMPANARIO/ADMIN ===');
    console.log(JSON.stringify(r1.rows, null, 2));

    // Buscar también en staff_profiles
    const r2 = await pool.query(
      "SELECT id, run, name, email, role FROM staff_profiles WHERE email ILIKE '%ltp%' OR email ILIKE '%admin%' ORDER BY email"
    ).catch(() => ({ rows: [] }));
    console.log('\n=== STAFF PROFILES CON CORREO LTP/ADMIN ===');
    console.log(JSON.stringify(r2.rows, null, 2));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}

check();
