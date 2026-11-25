// Serverless Entrypoint para Vercel (/api/*)
process.env.VERCEL = '1';
process.env.DB_TYPE = 'postgres';

// Cargar variables de entorno locales si existen
try {
  const path = require('path');
  const dotenv = require('dotenv');
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
} catch (_) {}

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ AVISO: DATABASE_URL no está definida en las variables de entorno');
}

const app = require('../backend/dist/server').default || require('../backend/dist/server');

module.exports = app;
