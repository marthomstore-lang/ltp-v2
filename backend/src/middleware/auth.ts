import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_ltp_v2_2026';

export interface UserPayload {
  id: string;
  run: string;
  name: string;
  email?: string;
  role: 'Admin' | 'Director' | 'Docente' | 'Entrevistador' | 'Administrativo' | 'Profesionales' | 'Asistente' | 'Apoderado' | 'Visita' | 'Estudiante' | string;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;

    // Regla Estricta: Rol Visita no puede modificar datos (Read-Only)
    if (req.user.role === 'Visita' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return res.status(403).json({ error: 'El rol Visita solo posee permisos de consulta.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o sesión expirada.' });
  }
}

export function checkRoles(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ error: 'No tienes los permisos requeridos para esta acción.' });
    }

    // SuperAdmin o Administrador Principal siempre tienen acceso total
    if (
      req.user.role === 'Admin' ||
      (Array.isArray((req.user as any).roles) && (req.user as any).roles.includes('Admin'))
    ) {
      return next();
    }

    const normalizeRole = (r: string) => {
      const lower = String(r || '').toLowerCase().trim();
      if (lower === 'profesor' || lower === 'docente') return 'Docente';
      if (lower === 'admin' || lower === 'administrador') return 'Admin';
      if (lower === 'encargado cra') return 'EncargadoCRA';
      if (lower === 'asistente' || lower === 'asistente de la educación') return 'Asistente';
      if (lower === 'directivo' || lower === 'director') return 'Director';
      return r;
    };

    const userActiveRole = normalizeRole(req.user.role);
    const userRolesList: string[] = Array.isArray((req.user as any).roles)
      ? (req.user as any).roles.map(normalizeRole)
      : [userActiveRole];

    const normalizedAllowed = allowedRoles.map(normalizeRole);

    const hasPermission = normalizedAllowed.includes(userActiveRole) ||
      userRolesList.some(r => normalizedAllowed.includes(r));

    if (!hasPermission) {
      return res.status(403).json({ error: 'No tienes los permisos requeridos para esta acción.' });
    }
    next();
  };
}

export async function logAudit(req: Request, action: string, details: string, levelId?: string, subjectId?: string) {
  try {
    const userId = req.user?.id || (req.body?.username || req.body?.run || 'SYSTEM');
    const userName = req.user?.name || (req.body?.name || req.body?.email || req.body?.identifier || 'Administrador');
    const userRole = req.user?.role || 'Admin';
    let ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes('::ffff:')) ip = ip.replace('::ffff:', '');
    if (ip === '::1') ip = '127.0.0.1';

    await query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, details, level_id, subject_id, ip_address)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, userName, userRole, action, details, levelId || null, subjectId || null, ip]
    );
  } catch (err) {
    console.error('Error al registrar log de auditoría:', err);
  }
}
