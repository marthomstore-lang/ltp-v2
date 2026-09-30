const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'ltp_local_db'
  });

  const [desc] = await conn.query('DESCRIBE teacher_assignments');
  console.log('FIELDS:', desc.map(d => d.Field));

  const [kathe] = await conn.query(
    "SELECT * FROM teacher_assignments WHERE teacher_name LIKE '%KATHERINE%' OR teacher_name_2 LIKE '%KATHERINE%'"
  );
  console.log('\n--- KATHERINE ASSIGNMENTS ---');
  console.log(kathe);

  const [homeroom] = await conn.query(
    "SELECT name, teacher FROM courses WHERE teacher LIKE '%KATHERINE%'"
  );
  console.log('\n--- KATHERINE HOMEROOM COURSES ---');
  console.log(homeroom);

  const [allHomerooms] = await conn.query(
    "SELECT DISTINCT desc_grado, profesor_jefe FROM students WHERE profesor_jefe LIKE '%KATHERINE%'"
  );
  console.log('\n--- KATHERINE PROFESOR JEFE IN STUDENTS ---');
  console.log(allHomerooms);

  await conn.end();
}

main().catch(console.error);
