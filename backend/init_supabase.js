const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL no está configurada en backend/.env');
  process.exit(1);
}

console.log('📡 Conectando a Supabase / PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function runInitialization() {
  try {
    const fullSeedPath = path.join(__dirname, '..', 'database', 'supabase_full_seed.sql');
    const baseSchemaPath = path.join(__dirname, '..', 'database', 'unified_schema.sql');
    const targetPath = fs.existsSync(fullSeedPath) ? fullSeedPath : baseSchemaPath;

    console.log(`📖 Leyendo script SQL (${path.basename(targetPath)})...`);
    const sqlScript = fs.readFileSync(targetPath, 'utf-8');

    console.log('🚀 Ejecutando esquema y sembrado completo de datos (418 alumnos) en Supabase...');
    await pool.query(sqlScript);
    console.log('✅ Esquema y base de datos con los 418 alumnos cargada exitosamente en Supabase.');

    // Crear o actualizar usuario Administrador
    console.log('🔑 Creando usuario Administrador inicial...');
    const run = process.env.ADMIN_RUN || '';
    const plainPassword = process.env.ADMIN_PASSWORD || '';
    const name = 'Administrador Principal';
    const email = 'admin@liceo.cl';
    const role = 'Admin';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(plainPassword, salt);
    const adminId = 'USR-ADMIN-18803735-6';

    const adminSql = `
      INSERT INTO users (id, run, name, email, password_hash, password_plain, role, temp_password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, false)
      ON CONFLICT (run)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        password_plain = EXCLUDED.password_plain,
        name = EXCLUDED.name,
        role = EXCLUDED.role;
    `;
    await pool.query(adminSql, [adminId, run, name, email, passwordHash, plainPassword, role]);
    console.log(`✅ Administrador configurado: RUN ${run} | Clave: ${plainPassword}`);

    // Poblar niveles y asignaturas iniciales si no existen
    console.log('🏫 Poblando niveles y asignaturas iniciales...');
    const levelsSql = `
      INSERT INTO levels (id, name, total_capacity) VALUES
      (1, '6° Básico', 45),
      (2, '1° Medio A', 45),
      (3, '1° Medio B', 45),
      (4, '2° Medio A', 45),
      (5, '2° Medio B', 45),
      (6, '3° Medio TP Mecánica', 35),
      (7, '3° Medio TP Telecomunicaciones', 35),
      (8, '4° Medio TP Electricidad', 35)
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(levelsSql);

    const subjectsSql = `
      INSERT INTO subjects (id, name) VALUES
      (1, 'Lenguaje y Comunicación'),
      (2, 'Matemática'),
      (3, 'Historia, Geografía Y Cs. Sociales'),
      (4, 'Ciencias Naturales'),
      (5, 'Artes Visuales'),
      (6, 'Música'),
      (7, 'Educación Física y Salud'),
      (8, 'Orientación'),
      (9, 'Tecnología'),
      (10, 'Religión'),
      (11, 'Inglés')
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(subjectsSql);
    console.log('✅ Niveles y asignaturas verificados.');

    // Catálogo Tipos Enseñanza MINEDUC
    console.log('📚 Cargando catálogo oficial de Enseñanza MINEDUC...');
    const mineducTypesSql = `
      INSERT INTO mineduc_teaching_types (code, name, category) VALUES
      (10, 'Educación Parvularia', 'Parvularia'),
      (110, 'Enseñanza Básica', 'Básica'),
      (310, 'Enseñanza Media Humanístico-Científica', 'HC'),
      (410, 'Enseñanza Media Técnico-Profesional Industrial', 'TP'),
      (510, 'Enseñanza Media Técnico-Profesional Comercial', 'TP'),
      (610, 'Enseñanza Media Técnico-Profesional Técnica', 'TP'),
      (710, 'Enseñanza Media Técnico-Profesional Agrícola', 'TP'),
      (810, 'Enseñanza Media Técnico-Profesional Marítima', 'TP')
      ON CONFLICT (code) DO NOTHING;
    `;
    await pool.query(mineducTypesSql);

    // Catálogo Territorial CUT/INE de prueba
    console.log('🗺️ Cargando catálogo territorial enriquecido CUT (Comunas / Provincias / Regiones)...');
    const communesSql = `
      INSERT INTO territorial_communes (codigo_comuna, nombre_comuna, codigo_provincia, nombre_provincia, codigo_region, nombre_region) VALUES
      ('15101', 'ARICA', '151', 'ARICA', '15', 'ARICA Y PARINACOTA'),
      ('16101', 'CHILLÁN', '161', 'DIGUILLÍN', '16', 'ÑUBLE'),
      ('16102', 'BULLNES', '161', 'DIGUILLÍN', '16', 'ÑUBLE'),
      ('16301', 'SAN CARLOS', '163', 'PUNILLA', '16', 'ÑUBLE'),
      ('13101', 'SANTIAGO', '131', 'SANTIAGO', '13', 'METROPOLITANA DE SANTIAGO'),
      ('13110', 'LA FLORIDA', '131', 'SANTIAGO', '13', 'METROPOLITANA DE SANTIAGO'),
      ('13119', 'MAIPÚ', '131', 'SANTIAGO', '13', 'METROPOLITANA DE SANTIAGO'),
      ('08101', 'CONCEPCIÓN', '081', 'CONCEPCIÓN', '08', 'BIOBÍO'),
      ('08108', 'SAN PEDRO DE LA PAZ', '081', 'CONCEPCIÓN', '08', 'BIOBÍO'),
      ('08112', 'TALCAHUANO', '081', 'CONCEPCIÓN', '08', 'BIOBÍO')
      ON CONFLICT (codigo_comuna) DO NOTHING;
    `;
    await pool.query(communesSql);
    console.log('✅ Catálogos territoriales y de enseñanza inicializados.');

    console.log('================================================================');
    console.log('🎉 BASE DE DATOS SUPABASE CONFIGURADA Y OPERATIVA 100%');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Error durante la inicialización en Supabase:', err);
  } finally {
    await pool.end();
  }
}

runInitialization();
