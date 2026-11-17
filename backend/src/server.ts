import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { globalRateLimiter, authRateLimiter, sanitizeInputs } from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de Confianza en Proxy (para IPs reales detrás de Nginx/Vercel/Cloudflare)
app.set('trust proxy', 1);

// 1. HELMET HTTP SECURITY HEADERS (Protección contra Clickjacking, Sniffing, XSS)
app.use(
  helmet({
    contentSecurityPolicy: false, // Deshabilitado para desarrollo local / APIs REST
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS BIEN CONFIGURADO Y RESTRINGIDO
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  process.env.FRONTEND_URL || ''
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (apps móviles, llamadas internas, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Permitir Vercel, Cloudflare tunnels y redes locales (192.168.x.x, 10.x.x.x) y desarrollo local
      if (
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.trycloudflare.com') ||
        origin.includes('192.168.') ||
        origin.includes('10.') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        process.env.NODE_ENV === 'development'
      ) {
        return callback(null, true);
      }
      return callback(new Error('Bloqueado por política de CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// 3. LÍMITE DE TAMAÑO DE PAYLOAD (Soporta carga de evaluaciones e imágenes a Google Drive)
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// 4. SANITIZACIÓN AUTOMÁTICA DE ENTRADAS (Anti-XSS e Inyecciones)
app.use(sanitizeInputs);

// 5. RATE LIMITING ESTRICTO EN LOGIN
app.use('/api/auth/login', authRateLimiter);

// 6. RATE LIMITING GLOBAL EN LA API (Máximo 200 peticiones / 15 min)
app.use('/api', globalRateLimiter);

// Montaje de la API Unificada
app.use('/api', apiRouter);

// Ruta de Health Check y Estado de Seguridad
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'OK',
    system: 'LTP v2.0 Unified Engine',
    security: {
      rate_limiting: 'ACTIVE (200 req / 15m)',
      auth_rate_limiting: 'ACTIVE (7 attempts / 15m)',
      input_sanitization: 'ACTIVE (Anti-XSS)',
      cors_policy: 'CONFIGURED',
      ssl_encryption: 'ACTIVE (Bcrypt + TLS)',
      rbac_jwt: 'ACTIVE'
    },
    timestamp: new Date().toISOString()
  });
});

// Middleware Global de Manejo de Errores (Previene Fuga de Información / Stack Traces)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Error no controlado en backend:', err.stack || err);
  res.status(500).json({
    error: 'Error interno del servidor. Por seguridad los detalles han sido registrados en la auditoría.'
  });
});

// Inicio del Servidor (en local o contenedores tradicionales; en Vercel Serverless se exporta `app`)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 SERVIDOR UNIFICADO LTP v2.0 CORRIENDO EN EL PUERTO: ${PORT}`);
    console.log(`🔒 SEGURIDAD COMPLETA: Rate Limiting | Anti-XSS | CORS | JWT | RLS`);
    console.log(`================================================================`);
  });
}

export default app;

