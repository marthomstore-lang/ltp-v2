const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ltp_v2'
});

async function createAdmin() {
  const run = process.env.ADMIN_RUN || '';
  const plainPassword = process.env.ADMIN_PASSWORD || '';
  const name = 'Administrador Sistema';
  const email = 'admin@liceo.cl';
  const role = 'Admin';

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);
    const id = 'USR-ADMIN-' + Date.now();

    const sql = `
      INSERT INTO users (id, run, name, email, password_hash, password_plain, role, temp_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      ON CONFLICT (run)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        password_plain = EXCLUDED.password_plain,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
    `;

    await pool.query(sql, [id, run, name, email, passwordHash, plainPassword, role]);
    console.log(`✅ Usuario Administrador registrado exitosamente:`);
    console.log(`   RUT: ${run}`);
    console.log(`   Rol: ${role}`);
    console.log(`   Contraseña: ${plainPassword}`);
  } catch (err) {
    console.error('❌ Error al crear usuario administrador:', err);
  } finally {
    await pool.end();
  }
}

createAdmin();
