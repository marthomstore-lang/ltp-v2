import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.fuirjmpmrzhprbtbmxmi:Mavu%40182011199420@aws-0-us-west-2.pooler.supabase.com:6543/postgres'
});

async function main() {
  const tables = ['annual_curriculum_plans', 'annual_curriculum_units', 'lesson_plans'];
  for (const t of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
      [t]
    );
    console.log(`=== ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
  }
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
