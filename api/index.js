// Serverless Entrypoint para Vercel (/api/*)
process.env.VERCEL = '1';

// Configuración permanente y segura para producción Vercel
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('kyrjuenufdnqoemvdjqq') || !process.env.DATABASE_URL.includes('fuirjmpmrzhprbtbmxmi')) {
  process.env.DATABASE_URL = 'postgresql://postgres.fuirjmpmrzhprbtbmxmi:Mavu%40182011199420@aws-0-us-west-2.pooler.supabase.com:6543/postgres';
}
process.env.DB_TYPE = 'postgres';
if (!process.env.SMTP_USER) process.env.SMTP_USER = 'david.vidal@eduvallediguillin.gob.cl';
if (!process.env.SMTP_PASS) process.env.SMTP_PASS = 'dezymyybjgvuuiuk';
if (!process.env.SMTP_HOST) process.env.SMTP_HOST = 'smtp.gmail.com';
if (!process.env.SMTP_PORT) process.env.SMTP_PORT = '465';
if (!process.env.SMTP_FROM) process.env.SMTP_FROM = '"LTP Liceo Pro" <david.vidal@eduvallediguillin.gob.cl>';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'super_secret_key_ltp_v2_2026';

const app = require('../backend/dist/server').default || require('../backend/dist/server');

module.exports = app;
