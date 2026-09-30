const mysql = require('mysql2/promise');

async function deduplicateUsers() {
  console.log('🧹 Iniciando desduplicación de usuarios en XAMPP MySQL...');

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ltp_local_db'
  });

  // 1. Encontrar todos los RUTs duplicados
  const [dups] = await conn.query(`
    SELECT run, COUNT(*) as c 
    FROM users 
    WHERE run IS NOT NULL AND run != '' 
    GROUP BY run 
    HAVING c > 1
  `);

  console.log(`Encontrados ${dups.length} RUTs duplicados en la tabla users.`);

  for (const d of dups) {
    const rut = d.run;
    const [rows] = await conn.query('SELECT * FROM users WHERE run = ? ORDER BY id ASC', [rut]);

    // Determinar el rol de mayor jerarquía
    const roles = rows.map(r => r.role);
    let bestRole = 'Administrativo';
    if (roles.includes('Admin')) bestRole = 'Admin';
    else if (roles.includes('Director')) bestRole = 'Director';
    else if (roles.includes('Docente')) bestRole = 'Docente';

    // Elegir el registro principal
    const mainUser = rows.find(r => r.role === bestRole) || rows[0];
    const deleteIds = rows.filter(r => r.id !== mainUser.id).map(r => r.id);

    console.log(`🔹 RUT ${rut}: Manteniendo ID "${mainUser.id}" con rol "${bestRole}". Eliminando duplicados: ${deleteIds.join(', ')}`);

    // Actualizar registro principal
    await conn.query(
      'UPDATE users SET role = ?, staff_type = COALESCE(staff_type, ?) WHERE id = ?',
      [bestRole, mainUser.staff_type || (bestRole === 'Admin' || bestRole === 'Docente' ? 'Docente' : 'Asistente de la Educación'), mainUser.id]
    );

    // Eliminar duplicados sobrantes
    for (const delId of deleteIds) {
      await conn.query('DELETE FROM users WHERE id = ?', [delId]);
    }
  }

  // 2. Intentar agregar restricción UNIQUE en la columna run de users
  try {
    await conn.query('ALTER TABLE users ADD UNIQUE KEY idx_users_unique_run (run)');
    console.log('✅ Creado índice ÚNICO en `users.run` para prevenir duplicidades futuras.');
  } catch (err) {
    console.log('ℹ️ El índice en `users.run` ya existe o fue configurado previamente.');
  }

  await conn.end();
  console.log('🎉 ¡Desduplicación de usuarios completada con éxito!');
}

deduplicateUsers();
