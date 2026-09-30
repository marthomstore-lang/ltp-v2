/**
 * Script de Exportación y Migración Completa (Batch Ultra-Rápido):
 * MySQL Local (XAMPP) -> PostgreSQL (Supabase Cloud)
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
  if (t.startsWith('tinyint(1)')) return 'INTEGER';
  if (t.includes('int')) return 'INTEGER';
  if (t.startsWith('decimal') || t.startsWith('numeric')) return t.toUpperCase();
  if (t === 'date' || t === 'time') return 'TEXT';
  if (t.includes('timestamp') || t.includes('datetime')) return 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
  return 'TEXT';
}

function escapePgValue(val, mysqlType) {
  if (val === null || val === undefined) return 'NULL';
  const t = String(mysqlType || '').toLowerCase();
  if (val instanceof Date) {
    if (isNaN(val.getTime()) || val.getFullYear() < 1920) return 'NULL';
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
  const str = String(val).trim();
  if (t === 'date' && (str === '' || str.startsWith('0000') || str.startsWith('1899') || str.startsWith('1900'))) {
    return 'NULL';
  }
  return `'${String(val).replace(/'/g, "''")}'`;
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

    let dropSql = '';
    for (const table of tables) {
      dropSql += `DROP TABLE IF EXISTS "${table}" CASCADE;\n`;
    }

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

      if (table === 'password_resets') continue;

      const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
      if (rows.length > 0) {
        seedSql += `-- Datos de tabla: ${table} (${rows.length} registros)\n`;
        const colNames = cols.map(c => `"${c.Field}"`).join(', ');
        const BATCH_SIZE = 400;
        const batches = [];
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const chunk = rows.slice(i, i + BATCH_SIZE);
          const valuesList = chunk.map(row => `(${cols.map(c => escapePgValue(row[c.Field], c.Type)).join(', ')})`).join(',\n');
          const batchStmt = `INSERT INTO "${table}" (${colNames}) VALUES\n${valuesList}\nON CONFLICT DO NOTHING;\n`;
          seedSql += batchStmt;
          batches.push(batchStmt);
        }
        seedSql += `\n`;
        tableDataForDirectMigration.push({ table, rowCount: rows.length, batches });
      }
    }

    // Guardar database/unified_schema.sql
    const schemaPath = path.join(__dirname, '..', 'database', 'unified_schema.sql');
    fs.writeFileSync(schemaPath, schemaSql, 'utf8');
    console.log(`✅ Esquema PostgreSQL actualizado en: ${schemaPath}`);

    // Guardar database/supabase_full_seed.sql
    const seedPath = path.join(__dirname, '..', 'database', 'supabase_full_seed.sql');
    fs.writeFileSync(seedPath, seedSql, 'utf8');
    console.log(`✅ Volcado completo para Supabase generado en: ${seedPath}`);

    // Si se proporcionó URL de Supabase, ejecutar migración directa por lotes
    if (SUPABASE_URI && SUPABASE_URI.startsWith('postgres')) {
      console.log('\n⚡ Iniciando migración directa hacia Supabase Cloud...');
      const pgPool = new PgPool({
        connectionString: SUPABASE_URI,
        ssl: { rejectUnauthorized: false }
      });

      try {
        console.log('🧹 Limpiando esquema previo y recreando las 48 tablas de LTP v2.0...');
        await pgPool.query(dropSql + '\n' + schemaSql);
        console.log('✅ Las 48 tablas fueron creadas exitosamente en Supabase.');

        for (const item of tableDataForDirectMigration) {
          const { table, rowCount, batches } = item;
          process.stdout.write(`   -> Sincronizando ${table} (${rowCount} registros en ${batches.length} lotes)... `);
          for (const batchStmt of batches) {
            await pgPool.query(batchStmt);
          }
          console.log('OK ✅');
        }
        console.log('================================================================');
        console.log('🎉 ¡MIGRACIÓN A SUPABASE CLOUD COMPLETADA AL 100%!');
        console.log('================================================================');
      } finally {
        await pgPool.end();
      }
    }
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('❌ Error en migrate_to_supabase:', err);
  process.exit(1);
});
