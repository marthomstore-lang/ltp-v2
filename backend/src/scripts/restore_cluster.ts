import fs from 'fs';
import readline from 'readline';
import { Client } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

export async function restoreCluster(backupFilePath: string, databaseUrl: string) {
  console.log('🚀 Iniciando restauración completa de base de datos desde:', backupFilePath);
  console.log('🎯 Conectando a Supabase PostgreSQL...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Conexión exitosa a Supabase PostgreSQL.');

  const rl = readline.createInterface({
    input: fs.createReadStream(backupFilePath),
    crlfDelay: Infinity
  });

  let state: 'init' | 'schema' | 'copy_header' | 'copy_data' | 'postdata' = 'init';
  let currentCopyTable = '';
  let currentCopySql = '';
  let copyStream: any = null;
  let copyRows = 0;
  let totalCopiedTables = 0;

  let currentDdl = '';
  let ddlCount = 0;
  let postDdlCount = 0;

  const executeDdl = async (sql: string) => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    // Filtrar comandos de superusuario o esquemas internos de supabase
    if (trimmed.includes('auth.') || trimmed.includes('storage.') || trimmed.includes('realtime.') || trimmed.includes('supabase_admin') || trimmed.includes('extensions.')) {
      return;
    }
    if (trimmed.startsWith('\\') || trimmed.startsWith('SET ') || trimmed.startsWith('SELECT pg_catalog.set_config')) {
      return;
    }
    if (trimmed.startsWith('CREATE ROLE') || trimmed.startsWith('ALTER ROLE') || trimmed.startsWith('DROP ROLE')) {
      return;
    }
    if (trimmed.startsWith('CREATE SCHEMA') || trimmed.startsWith('ALTER SCHEMA')) {
      return;
    }
    try {
      await client.query(trimmed);
      ddlCount++;
    } catch (err: any) {
      // Ignorar si ya existe o errores menores de permisos
      if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
        console.warn('⚠️ DDL Warning:', err.message, '| Statement:', trimmed.slice(0, 60));
      }
    }
  };

  console.log('⏳ Procesando archivo de respaldo y cargando esquema + datos...');

  for await (const line of rl) {
    if (state === 'init') {
      if (line.trim().startsWith('\\connect postgres')) {
        state = 'schema';
        console.log('📌 Encontrado bloque \\connect postgres. Iniciando creación de tablas e índices...');
      }
      continue;
    }

    if (state === 'schema') {
      if (line.startsWith('COPY public.')) {
        // Ejecutar último DDL si quedó pendiente
        if (currentDdl.trim()) {
          await executeDdl(currentDdl);
          currentDdl = '';
        }
        state = 'copy_header';
        // Caer al siguiente bloque para manejar el COPY
      } else {
        currentDdl += line + '\n';
        if (line.trim().endsWith(';')) {
          await executeDdl(currentDdl);
          currentDdl = '';
        }
        continue;
      }
    }

    if (state === 'copy_header' || (state === 'copy_data' && line.startsWith('COPY public.'))) {
      currentCopySql = line.trim();
      const match = currentCopySql.match(/^COPY public\.([a-zA-Z0-9_]+)/);
      currentCopyTable = match ? match[1] : 'unknown';
      copyRows = 0;

      // Crear stream de copia
      copyStream = client.query(copyFrom(currentCopySql));
      state = 'copy_data';
      continue;
    }

    if (state === 'copy_data') {
      if (line.trim() === '\\.') {
        // Fin de la tabla actual
        await new Promise((resolve, reject) => {
          copyStream.end((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });
        totalCopiedTables++;
        console.log(`  ✓ [${totalCopiedTables}/61] Tabla public.${currentCopyTable}: ${copyRows.toLocaleString()} registros importados.`);
        copyStream = null;
        state = 'copy_header'; // listo para la siguiente COPY o para postdata
        continue;
      } else {
        // Escribir fila en stream
        copyStream.write(line + '\n');
        copyRows++;
        continue;
      }
    }

    if ((state as string) === 'copy_header') {
      // Si no es COPY, ya terminó la sección de datos y comienza postdata (constraints, indexes, setval)
      state = 'postdata';
      console.log('📌 Restauración de datos completada. Aplicando llaves primarias, foráneas, índices y secuencias...');
    }

    if (state === 'postdata') {
      currentDdl += line + '\n';
      if (line.trim().endsWith(';')) {
        await executeDdl(currentDdl);
        currentDdl = '';
        postDdlCount++;
      }
    }
  }

  // Ejecutar remanente
  if (currentDdl.trim()) {
    await executeDdl(currentDdl);
  }

  console.log(`🎉 Restauración completada exitosamente:`);
  console.log(`  - Tablas importadas con datos: ${totalCopiedTables}`);
  console.log(`  - Sentencias DDL aplicadas: ${ddlCount + postDdlCount}`);

  // Verificación de conteo de filas en tablas principales
  console.log('🔍 Verificando integridad de tablas críticas:');
  const checkTables = ['students', 'users', 'courses', 'grades', 'subjects', 'tp_internship_enrollments'];
  for (const t of checkTables) {
    try {
      const res = await client.query(`SELECT COUNT(*) as c FROM public.${t}`);
      console.log(`  📊 public.${t}: ${res.rows[0].c} filas`);
    } catch (e: any) {
      console.warn(`  ⚠️ Error al contar public.${t}:`, e.message);
    }
  }

  await client.end();
  console.log('🏁 Proceso de restauración finalizado al 100%.');
}

// Ejecución directa si se llama con ts-node
if (require.main === module) {
  const backupFile = process.argv[2] || 'c:/Users/david/Downloads/db_cluster-16-11-2026@09-31-59.backup/db_cluster-16-11-2026@09-31-59.backup';
  const dbUrl = process.argv[3] || process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('❌ Debe proporcionar DATABASE_URL como parámetro o en variable de entorno.');
    process.exit(1);
  }
  restoreCluster(backupFile, dbUrl).catch(err => {
    console.error('❌ Error fatal en restauración:', err);
    process.exit(1);
  });
}
