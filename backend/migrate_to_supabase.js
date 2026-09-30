/**
 * Script de Exportación y Migración Completa: MySQL Local (XAMPP) -> PostgreSQL (Supabase Cloud)
 * Uso:
 *   1) Generar archivos SQL para Supabase (esquema limpio + volcado completo):
 *      node migrate_to_supabase.js
 *
 *   2) Migrar directamente hacia Supabase pasando la URL de conexión PostgreSQL:
 *      node migrate_to_supabase.js "postgresql://postgres.[ref]:[password]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Pool: PgPool } = require('pg');
require('dotenv').config();

const MYSQL_URI = process.env.MYSQL_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql://') ? process.env.DATABASE_URL : 'mysql://root:@127.0.0.1:3306/ltp_local_db');
const SUPABASE_URI = process.argv[2] || process.env.SUPABASE_DATABASE_URL || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres') ? process.env.DATABASE_URL : '');

function mapMysqlTypeToPostgres(mysqlType, colName, isAutoIncrement) {
  if (isAutoIncrement) return 'SERIAL';
  const t = String(mysqlType || '').toLowerCase();
  // En este proyecto varias columnas booleanas e enteras se consultan tanto con 0/1 como con true/false,
  // pero en PostgreSQL INTEGER soporta 0/1 y en db.ts hemos adaptado las consultas.
  // Revisemos si la columna se usa como integer o text.
  if (t.startsWith('tinyint(1)')) {
    return 'INTEGER';
  }
  if (t.includes('int')) return 'INTEGER';
  if (t.startsWith('decimal') || t.startsWith('numeric')) return t.toUpperCase();
  if (t === 'date') return 'TEXT';
  if (t === 'time') return 'TEXT';
  if (t.includes('timestamp') || t.includes('datetime')) return 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
  return 'TEXT';
}

function escapePgValue(val, mysqlType) {
  if (val === null || val === undefined) return 'NULL';
  const t = String(mysqlType || '').toLowerCase();
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return 'NULL';
    if (t === 'date') {
      return `'${val.toISOString().slice(0, 10)}'`;
    }
    return `'${val.toISOString()}'`;
  }
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

async function run() {
  console.log('🐬 Conectando a MySQL local para extraer esquema y datos...');
  const conn = await mysql.createConnection(MYSQL_URI);

  try {
    const [tableRows] = await conn.query('SHOW TABLES');
    const tables = tableRows.map(r => Object.values(r)[0]);
    console.log(`📋 Se encontraron ${tables.length} tablas en la base de datos local.`);

    let schemaSql = `-- =============================================================================\n`;
    schemaSql += `-- ESQUEMA UNIFICADO DE PRODUCCIÓN — LICEO TÉCNICO PROFESIONAL (LTP v2.0)\n`;
    schemaSql += `-- Compatible con PostgreSQL (Supabase Cloud)\n`;
    schemaSql += `-- Total de tablas: ${tables.length}\n`;
    schemaSql += `-- =============================================================================\n\n`;

    let seedSql = schemaSql;
    const tableDataForDirectMigration = [];

    for (const table of tables) {
      const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
      const [indexes] = await conn.query(`SHOW INDEX FROM \`${table}\``);

      const pkCols = indexes
        .filter(idx => idx.Key_name === 'PRIMARY')
        .sort((a, b) => a.Seq_in_index - b.Seq_in_index)
        .map(idx => idx.Column_name);

      const colDefs = cols.map(c => {
        const isAuto = String(c.Extra || '').toLowerCase().includes('auto_increment');
        const pgType = mapMysqlTypeToPostgres(c.Type, c.Field, isAuto);
        let def = `    "${c.Field}" ${pgType}`;
        if (pkCols.length === 1 && pkCols[0] === c.Field) {
          def += ' PRIMARY KEY';
        }
        return def;
      });

      if (pkCols.length > 1) {
        colDefs.push(`    PRIMARY KEY (${pkCols.map(k => `"${k}"`).join(', ')})`);
      }

      const createTableStmt = `CREATE TABLE IF NOT EXISTS "${table}" (\n${colDefs.join(',\n')}\n);\n\n`;
      schemaSql += createTableStmt;
      seedSql += createTableStmt;

      // Extraer filas de datos (excepto audit_logs masivos o password_resets temporales)
      if (table === 'password_resets') continue;

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        seedSql += `-- Datos de tabla: ${table} (${rows.length} registros)\n`;
        const colNames = cols.map(c => `"${c.Field}"`).join(', ');
        for (const row of rows) {
          const vals = cols.map(c => escapePgValue(row[c.Field], c.Type)).join(', ');
          seedSql += `INSERT INTO "${table}" (${colNames}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
        }
        seedSql += `\n`;
        tableDataForDirectMigration.push({ table, cols, rows });
      }
    }

    // Guardar database/unified_schema.sql (Esquema limpio para GitHub)
    const schemaPath = path.join(__dirname, '..', 'database', 'unified_schema.sql');
    fs.writeFileSync(schemaPath, schemaSql, 'utf8');
    console.log(`✅ Esquema PostgreSQL actualizado en: ${schemaPath}`);

    // Guardar database/supabase_full_seed.sql (Esquema + Todos los datos para Supabase)
    const seedPath = path.join(__dirname, '..', 'database', 'supabase_full_seed.sql');
    fs.writeFileSync(seedPath, seedSql, 'utf8');
    console.log(`✅ Volcado completo para Supabase generado en: ${seedPath}`);

    // Si se proporcionó URL de Supabase, ejecutar migración directa
    if (SUPABASE_URI && SUPABASE_URI.startsWith('postgres')) {
      console.log('\n⚡ Iniciando migración directa hacia Supabase Cloud...');
      const pgPool = new PgPool({
        connectionString: SUPABASE_URI,
        ssl: { rejectUnauthorized: false }
      });

      try {
        await pgPool.query(schemaSql);
        console.log('✅ Todas las tablas fueron creadas/verificadas en Supabase.');

        for (const item of tableDataForDirectMigration) {
          const { table, cols, rows } = item;
          console.log(`   -> Sincronizando ${table} (${rows.length} registros)...`);
          const colNames = cols.map(c => `"${c.Field}"`).join(', ');
          for (const row of rows) {
            const vals = cols.map(c => escapePgValue(row[c.Field], c.Type)).join(', ');
            await pgPool.query(`INSERT INTO "${table}" (${colNames}) VALUES (${vals}) ON CONFLICT DO NOTHING;`);
          }
        }
        console.log('🎉 ¡MIGRACIÓN A SUPABASE COMPLETADA AL 100%!');
      } finally {
        await pgPool.end();
      }
    } else {
      console.log('\n💡 Para migrar directamente a Supabase por consola cuando tengas tu URL:');
      console.log('   node backend/migrate_to_supabase.js "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"');
    }
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('❌ Error en migrate_to_supabase:', err);
  process.exit(1);
});
