const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function createXamppDatabase() {
  console.log('🚀 Iniciando creación de Base de Datos en XAMPP (127.0.0.1:3306)...');

  try {
    // 1. Conectar a MySQL XAMPP sin especificar base de datos inicial
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      multipleStatements: true
    });

    console.log('✅ Conexión exitosa a XAMPP MySQL Server en 127.0.0.1:3306');

    // 2. Leer el script SQL para MySQL Workbench / XAMPP
    const sqlPath = path.join(__dirname, 'schema_and_seed_mysql.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Creando esquema y tablas para el trabajo actual (Estudiantes, Cursos, Calificaciones, Entrevistas, Biblioteca CRA)...');
    await connection.query(sqlScript);

    console.log('✅ Base de Datos `ltp_local_db` generada y poblada exitosamente en XAMPP.');
    await connection.end();

    // 3. Actualizar backend/.env para apuntar a XAMPP MySQL
    const envPath = path.join(__dirname, '.env');
    let envContent = fs.readFileSync(envPath, 'utf8');

    const mysqlUrl = 'DATABASE_URL=mysql://root:@127.0.0.1:3306/ltp_local_db';
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*/g, mysqlUrl);
    } else {
      envContent += `\n${mysqlUrl}\n`;
    }

    if (!envContent.includes('DB_TYPE=')) {
      envContent += '\nDB_TYPE=mysql\n';
    } else {
      envContent = envContent.replace(/DB_TYPE=.*/g, 'DB_TYPE=mysql');
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Archivo `backend/.env` configurado automáticamente con XAMPP MySQL.');
    console.log('🎉 ¡Todo listo! La base de datos local de XAMPP está completamente operativa.');

  } catch (err) {
    console.error('❌ Error al configurar la Base de Datos en XAMPP:', err.message);
  }
}

createXamppDatabase();
