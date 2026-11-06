/**
 * roles.ts - Utilidades centralizadas para detección y resolución de roles y cargos directivos
 * Liceo Técnico Profesional Campanario Marcos Delucchi Fonck
 */

export const DIRECTIVE_KEYWORDS = [
  'director',
  'directiv',
  'utp',
  'tecnico-pedagogic',
  'técnico-pedagógic',
  'orientad',
  'orientac',
  'convivencia',
  'inspector general',
  'inspectora general',
  'planta directiva',
  'coordinador pie',
  'coordinadora pie',
  'jefe utp',
  'jefa utp'
];

export const DIRECTIVE_RUNS = [
  '142308517', // VÍCTOR ROBINSON OJEDA OJEDA (Director)
  '93981049',  // ROGELIO EDGARDO PINILLA VÁSQUEZ (Jefe UTP)
  '172465560', // JOSÉ JULIO IGNACIO LIZAMA ALARCÓN (UTP / Admin)
  '198229555', // JESICA ALEJANDRA JARA RETAMAL (Planta Técnico-Pedagógica / UTP)
  '93968824',  // ÍTALO EDGARDO RODRÍGUEZ NAVARRETE (Planta Directiva)
  '80954786',  // ERNESTO ALFONSO BÓRQUEZ CÁRDENAS (Inspector General)
  '72532902',  // CARLOS FERNANDO ARANDA PINO (Orientador)
  '171529069', // CAMILA ELIZABETH CARRASCO CORDERO (Encargada Convivencia Escolar)
  '192510996', // SCARLETTE CATALINA BURGOS SANDOVAL (Coordinadora PIE)
  '188037356'  // Soporte Técnico / Superadministrador
];

/**
 * Determina si un usuario pertenece al Equipo Directivo (Dirección, UTP, Inspectoría General, Orientación, Convivencia, etc.)
 */
export const isUserDirective = (user: any): boolean => {
  if (!user) return false;

  // 1. Rol primario
  const role = String(user.role || '').toLowerCase().trim();
  if (role === 'admin' || role === 'director' || role === 'directivo' || role === 'utp') {
    return true;
  }

  // 2. Roles asignados en array multi-rol
  const rawRoles = user.roles;
  let rolesList: string[] = [];
  if (Array.isArray(rawRoles)) {
    rolesList = rawRoles;
  } else if (typeof rawRoles === 'string' && rawRoles.trim()) {
    try {
      const p = JSON.parse(rawRoles);
      rolesList = Array.isArray(p) ? p : rawRoles.split(',');
    } catch {
      rolesList = rawRoles.split(',');
    }
  }

  const hasDirectiveRole = rolesList.some(r => {
    const low = String(r || '').toLowerCase().trim();
    return low === 'admin' || low === 'director' || low === 'directivo' || low === 'utp';
  });
  if (hasDirectiveRole) return true;

  // 3. Cargo / Función institucional (job_function)
  const job = String(user.job_function || '').toLowerCase();
  if (DIRECTIVE_KEYWORDS.some(kw => job.includes(kw))) {
    return true;
  }

  // 4. Tipo de funcionario (staff_type)
  const staffType = String(user.staff_type || '').toLowerCase();
  if (staffType.includes('directiv')) {
    return true;
  }

  // 5. RUN institucional de autoridad oficial
  const cleanRun = String(user.run || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (DIRECTIVE_RUNS.includes(cleanRun)) {
    return true;
  }

  return false;
};

/**
 * Retorna todos los roles efectivos del usuario, inyectando 'Director' automáticamente si cumple perfil directivo
 */
export const getUserAllRoles = (user: any): string[] => {
  if (!user) return ['Docente'];
  const list = new Set<string>();
  if (user.role) list.add(String(user.role).trim());

  const rawRoles = user.roles;
  if (Array.isArray(rawRoles)) {
    rawRoles.forEach((r: any) => { if (r) list.add(String(r).trim()); });
  } else if (typeof rawRoles === 'string' && rawRoles.trim()) {
    try {
      const p = JSON.parse(rawRoles);
      if (Array.isArray(p)) p.forEach((r: any) => { if (r) list.add(String(r).trim()); });
      else rawRoles.split(',').forEach((r: string) => { if (r) list.add(r.trim()); });
    } catch {
      rawRoles.split(',').forEach((r: string) => { if (r) list.add(r.trim()); });
    }
  }

  if (isUserDirective(user)) {
    list.add('Director');
  }

  return Array.from(list);
};
