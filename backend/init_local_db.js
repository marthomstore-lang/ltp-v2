const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ltp_local_db';

console.log('🚀 Inicializando Base de Datos Local...');
console.log('📌 Conexión objetivo:', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : false
});

async function runLocalSetup() {
  try {
    const sqlPath = path.join(__dirname, 'schema_and_seed_local.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Ejecutando script DDL e inserción de datos de prueba...');
    await pool.query(sqlScript);

    console.log('✅ Base de datos local configurada y poblada exitosamente.');
    console.log('💡 Ahora puedes agregar, editar o eliminar registros libremente en tu entorno local.');
  } catch (err) {
    console.error('❌ Error al inicializar la Base de Datos Local:', err.message);
  } finally {
    await pool.end();
  }
}

runLocalSetup();
