import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import validator from 'validator';

/**
 * 1 & 4. RATE LIMITING & IP LIMITING (LIMITACIÓN DE SOLICITUDES E IP)
 * Protege la API contra ataques de Denegación de Servicio (DoS) y escaneos automatizados.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutos
  max: process.env.NODE_ENV === 'development' ? 50000 : 10000, // Límite amplio para evitar bloqueos en guardado continuo y hojas de notas
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Permitir tráfico local y desarrollo sin límites restrictivos
    const ip = req.ip || req.socket.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip === '::ffff:127.0.0.1') {
      return true;
    }
    return false;
  },
  message: {
    error: 'Demasiadas solicitudes desde esta dirección IP. Por favor intente más tarde (Rate Limit Exceeded).'
  }
});

/**
 * RATE LIMITER PARA AUTENTICACIÓN (LOGIN)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutos
  max: process.env.NODE_ENV === 'development' ? 100 : 30, // 30 intentos en producción, 100 en desarrollo
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (process.env.NODE_ENV === 'development' && (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip === '::ffff:127.0.0.1')) {
      return true;
    }
    return false;
  },
  message: {
    error: 'Ha superado el límite de intentos de inicio de sesión. Por seguridad, intente en 15 minutos.'
  }
});

/**
 * 5. INPUT SANITY & ANTI-XSS (SANITIZACIÓN Y LIMPIEZA DE ENTRADAS)
 * Sanitiza recursivamente cualquier string en req.body, req.query y req.params
 * eliminando script tags, protocolos javascript: e inyecciones maliciosas.
 */
export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;

  const trimmed = str.trim();
  // Si es un Data URI de imagen/archivo válido (ej. data:image/jpeg;base64,...), reparar posibles &#x2F; previos y conservar intacto
  if (/^data:(image|application|text\/plain)(&#x2F;|\/)[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)) {
    return trimmed.replace(/&#x2F;/gi, '/');
  }

  // Escapar/eliminar HTML peligroso y prevenir XSS sin corromper barras '/' en URLs, fechas o rutas de carpetas
  const clean = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?(script|iframe|object|embed|svg|math|style|link|meta)\b[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon[a-z]+\s*=/gi, '');

  return clean;
};

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          // No alterar passwords ni hashes
          if (key.includes('password') || key.includes('hash')) {
            obj[key] = obj[key].trim();
          } else {
            obj[key] = sanitizeString(obj[key]);
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
};

/**
 * 6. SERVER SIDE VALIDATION (VALIDACIÓN CHILENA DE RUT Y EMAIL)
 * Algoritmo Modulo 11 para la verificación matemática exacta de RUT chileno.
 */
export const validateRutChile = (rut: string): boolean => {
  if (!rut || typeof rut !== 'string') return false;
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  if (cleanRut.length < 8) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDvNum = 11 - (sum % 11);
  let expectedDv = '';
  if (expectedDvNum === 11) expectedDv = '0';
  else if (expectedDvNum === 10) expectedDv = 'K';
  else expectedDv = String(expectedDvNum);

  return dv === expectedDv;
};

export const validateEmail = (email: string): boolean => {
  if (!email) return true; // Opcional
  return validator.isEmail(email);
};
