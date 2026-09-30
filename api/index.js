// Serverless Entrypoint para Vercel (/api/*)
process.env.VERCEL = '1';
const app = require('../backend/dist/server').default || require('../backend/dist/server');

module.exports = app;
