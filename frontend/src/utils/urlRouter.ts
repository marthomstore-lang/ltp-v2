/**
 * Enrutador ligero basado en History API para sincronizar cada ventana/módulo
 * y cada sub-ventana (sub-link) de la plataforma LTP v2.0 con una URL única y limpia.
 */

export type AdminTabId =
  | 'home'
  | 'students'
  | 'apoderados'
  | 'communications'
  | 'grades'
  | 'overview'
  | 'personality_reports'
  | 'computer_lab'
  | 'evaluations_pie'
  | 'mineduc_reports'
  | 'interviews'
  | 'observations'
  | 'inspector_passes'
  | 'pedagogical_trips'
  | 'staff'
  | 'admin_docs'
  | 'library'
  | 'permissions'
  | 'config'
  | 'audit';

export type TeacherTabId = 'home' | 'my_courses' | 'homeroom' | 'observations' | 'links';

export type AccessLevel = 'edit' | 'view' | 'none';

/**
 * Mapa oficial de pestaña interna -> Ruta URL base (AdminDashboard y Roles Generales)
 */
export const ADMIN_TAB_TO_PATH: Record<AdminTabId, string> = {
  home: '/inicio',
  students: '/matricula',
  apoderados: '/apoderados',
  communications: '/comunicaciones',
  grades: '/calificaciones/planilla',
  overview: '/calificaciones/panorama',
  personality_reports: '/informes-personalidad',
  computer_lab: '/sala-computacion',
  evaluations_pie: '/evaluaciones-pie',
  mineduc_reports: '/informes-pie',
  interviews: '/entrevistas',
  observations: '/hoja-de-vida',
  inspector_passes: '/pases-atrasos',
  pedagogical_trips: '/salidas-pedagogicas',
  staff: '/recursos-humanos',
  admin_docs: '/documentos',
  library: '/biblioteca',
  permissions: '/permisos',
  config: '/configuracion',
  audit: '/auditoria',
};

/**
 * Sub-links por módulo para sincronizar pestañas internas de cada aplicación
 */
export const MODULE_SUBPATHS: Record<string, Record<string, string>> = {
  // Ficha de Matrícula (StudentWindow)
  students: {
    personal: 'ficha/estudiante',
    guardian_main: 'ficha/apoderado-titular',
    guardian_secondary: 'ficha/apoderado-suplente',
    parents_family: 'ficha/familia',
    health_sep: 'ficha/salud-pie',
  },
  // Biblioteca CRA
  library: {
    dashboard: 'resumen',
    books: 'catalogo',
    reading_plan: 'plan-lector',
    loans: 'prestamos',
    returns: 'devoluciones',
    daily_materials: 'material-diario',
    communications: 'comunicaciones',
    withdrawal_check: 'paz-y-salvo',
    reports: 'reportes',
    reservations: 'reservas',
  },
  // Pases & Atrasos (Inspectoría)
  inspector_passes: {
    emit: 'emitir',
    today: 'hoy',
    history: 'historial',
  },
  // Informes PIE (MINEDUC Dec. 170)
  mineduc_reports: {
    list: 'listado',
    select_student: 'nuevo',
    editor: 'editor',
    printable: 'vista-previa',
  },
  // Configuración del Sistema (13 sub-ventanas)
  config: {
    courses: 'cursos',
    teachers: 'funcionarios',
    subjects: 'asignaturas',
    assignments: 'carga-horaria',
    homeroom: 'jefaturas',
    subject_order: 'orden-asignaturas',
    templates: 'plantillas-notas',
    locks: 'cierre-semestral',
    links: 'plataformas',
    permissions: 'permisos',
    enrollment_config: 'ficha-compromiso',
    institution_config: 'establecimiento',
    checklists_config: 'checklists',
  },
};

/**
 * Mapa de functionId (Matriz de Permisos) -> Ruta URL para mostrar referencia visual
 */
export const FUNCTION_ID_TO_PATH: Record<string, string> = {
  dashboard: '/inicio',
  enrollment: '/matricula (+5 sub-links de ficha)',
  apoderados: '/apoderados',
  communications: '/comunicaciones',
  grades: '/calificaciones/planilla',
  overview: '/calificaciones/panorama',
  computer_lab: '/sala-computacion',
  evaluations_pie: '/evaluaciones-pie',
  mineduc_reports: '/informes-pie (+4 sub-links)',
  interviews: '/entrevistas',
  observations: '/hoja-de-vida',
  inspector_passes: '/pases-atrasos (+3 sub-links)',
  pedagogical_trips: '/salidas-pedagogicas',
  hr_staff: '/recursos-humanos',
  admin_docs: '/documentos',
  library: '/biblioteca (+9 sub-links)',
  permissions: '/permisos',
  config: '/configuracion (+13 sub-links)',
  audit_logs: '/auditoria',
  course_messaging: 'Barra Superior (Botón) / /comunicaciones',
  multiview: 'Barra Superior (Botón)',
};

export const ADMIN_TAB_TITLES: Record<AdminTabId, string> = {
  home: 'Dashboard General — Liceo Bicentenario Enrique Kirberg',
  students: 'Matrícula Completa — LTP',
  apoderados: 'Nómina de Apoderados — LTP',
  communications: 'Centro de Comunicaciones y Registro de Envíos — LTP',
  grades: 'Libro de Calificaciones — LTP',
  overview: 'Panorama de Notas y Jefatura — LTP',
  personality_reports: 'Informes al Hogar y Personalidad (PK a 4°M) — LTP',
  computer_lab: 'Sala de Computación — LTP',
  evaluations_pie: 'Evaluaciones & PIE — LTP',
  mineduc_reports: 'Informes PIE (Dec. 170) — LTP',
  interviews: 'Actas y Entrevistas — LTP',
  observations: 'Hoja de Vida — LTP',
  inspector_passes: 'Pases y Atrasos — LTP',
  pedagogical_trips: 'Salidas Pedagógicas — LTP',
  staff: 'Recursos Humanos — LTP',
  admin_docs: 'Documentos y Protocolos — LTP',
  library: 'Biblioteca CRA — LTP',
  permissions: 'Matriz de Permisos — LTP',
  config: 'Configuración del Sistema — LTP',
  audit: 'Auditoría Silent-Watch — LTP',
};

const BASE_PATH_TO_ADMIN_TAB: Record<string, AdminTabId> = {
  '/inicio': 'home',
  '/matricula': 'students',
  '/apoderados': 'apoderados',
  '/comunicaciones': 'communications',
  '/calificaciones': 'grades',
  '/calificaciones/planilla': 'grades',
  '/calificaciones/panorama': 'overview',
  '/panorama-notas': 'overview',
  '/informes-personalidad': 'personality_reports',
  '/informes-hogar': 'personality_reports',
  '/sala-computacion': 'computer_lab',
  '/evaluaciones-pie': 'evaluations_pie',
  '/informes-pie': 'mineduc_reports',
  '/entrevistas': 'interviews',
  '/hoja-de-vida': 'observations',
  '/pases-atrasos': 'inspector_passes',
  '/salidas-pedagogicas': 'pedagogical_trips',
  '/recursos-humanos': 'staff',
  '/documentos': 'admin_docs',
  '/biblioteca': 'library',
  '/permisos': 'permissions',
  '/configuracion': 'config',
  '/auditoria': 'audit',
};

export const TEACHER_TAB_TO_PATH: Record<TeacherTabId, string> = {
  home: '/inicio',
  my_courses: '/mis-cursos',
  homeroom: '/jefatura',
  observations: '/hoja-de-vida',
  links: '/plataformas',
};

export const TEACHER_TAB_TITLES: Record<TeacherTabId, string> = {
  home: 'Portal Docente — Liceo Bicentenario Enrique Kirberg',
  my_courses: 'Mis Cursos y Calificaciones — LTP',
  homeroom: 'Jefatura de Curso — LTP',
  observations: 'Hoja de Vida — LTP',
  links: 'Plataformas Institucionales — LTP',
};

const PATH_TO_TEACHER_TAB: Record<string, TeacherTabId> = {
  '/inicio': 'home',
  '/mis-cursos': 'my_courses',
  '/calificaciones': 'my_courses',
  '/calificaciones/planilla': 'my_courses',
  '/jefatura': 'homeroom',
  '/calificaciones/panorama': 'homeroom',
  '/panorama-notas': 'homeroom',
  '/hoja-de-vida': 'observations',
  '/plataformas': 'links',
};

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/inicio';
  const cleaned = pathname.replace(/\/+$/, '').toLowerCase();
  return cleaned || '/inicio';
}

export function getAdminTabFromUrl(): AdminTabId | null {
  if (typeof window === 'undefined') return null;
  const norm = normalizePath(window.location.pathname);
  if (norm === '/inicio' && window.location.pathname === '/') {
    return null;
  }
  if (BASE_PATH_TO_ADMIN_TAB[norm]) {
    return BASE_PATH_TO_ADMIN_TAB[norm];
  }
  // Verificar prefijos con sub-links (ej: /configuracion/cursos, /biblioteca/prestamos, /matricula/ficha/estudiante)
  const firstSegment = '/' + norm.split('/').filter(Boolean)[0];
  return BASE_PATH_TO_ADMIN_TAB[firstSegment] || null;
}

/**
 * Obtiene la sub-pestaña activa desde el sub-link de la URL para un módulo dado
 */
export function getModuleSubTabFromUrl<T extends string>(moduleKey: string, defaultSubTab: T): T {
  if (typeof window === 'undefined') return defaultSubTab;
  const subMap = MODULE_SUBPATHS[moduleKey];
  if (!subMap) return defaultSubTab;
  const norm = normalizePath(window.location.pathname);
  const parts = norm.split('/').filter(Boolean);
  if (parts.length < 2) return defaultSubTab;
  const subSlug = parts.slice(1).join('/');
  for (const [subId, slug] of Object.entries(subMap)) {
    if (slug === subSlug) {
      return subId as T;
    }
  }
  return defaultSubTab;
}

/**
 * Sincroniza el sub-link de una sub-ventana dentro de un módulo (ej: /configuracion/cursos, /biblioteca/catalogo)
 */
export function syncModuleSubUrl(moduleTab: AdminTabId, subTabId: string | null, replace = false): void {
  if (typeof window === 'undefined') return;
  const basePath = ADMIN_TAB_TO_PATH[moduleTab]?.split('/').slice(0, 2).join('/') || '/inicio';
  const subMap = MODULE_SUBPATHS[moduleTab];
  const subSlug = subTabId && subMap ? subMap[subTabId] : undefined;
  const targetPath = subSlug ? `${basePath}/${subSlug}` : (ADMIN_TAB_TO_PATH[moduleTab] || basePath);
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ tab: moduleTab, subTab: subTabId }, '', targetPath);
    } else {
      window.history.pushState({ tab: moduleTab, subTab: subTabId }, '', targetPath);
    }
  }
}

export function getTeacherTabFromUrl(): TeacherTabId | null {
  if (typeof window === 'undefined') return null;
  const norm = normalizePath(window.location.pathname);
  if (norm === '/inicio' && window.location.pathname === '/') {
    return null;
  }
  return PATH_TO_TEACHER_TAB[norm] || null;
}

export function syncAdminUrl(tab: AdminTabId, replace = false): void {
  if (typeof window === 'undefined') return;
  const targetPath = ADMIN_TAB_TO_PATH[tab] || '/inicio';
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  // Si la URL actual ya pertenece a un sub-link válido de este mismo módulo, conservar el sub-link en el montaje inicial
  const basePrefix = targetPath.split('/').slice(0, 2).join('/');
  const isSameModuleSublink =
    tab !== 'grades' &&
    tab !== 'overview' &&
    currentPath.startsWith(basePrefix + '/') &&
    MODULE_SUBPATHS[tab] !== undefined;

  if (!isSameModuleSublink && currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ tab }, '', targetPath);
    } else {
      window.history.pushState({ tab }, '', targetPath);
    }
  }
  const title = ADMIN_TAB_TITLES[tab];
  if (title) {
    document.title = title;
  }
}

export function syncTeacherUrl(tab: TeacherTabId, replace = false): void {
  if (typeof window === 'undefined') return;
  const targetPath = TEACHER_TAB_TO_PATH[tab] || '/inicio';
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  if (currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ teacherTab: tab }, '', targetPath);
    } else {
      window.history.pushState({ teacherTab: tab }, '', targetPath);
    }
  }
  const title = TEACHER_TAB_TITLES[tab];
  if (title) {
    document.title = title;
  }
}

/**
 * Normaliza cualquier valor de permiso (booleano legado o string) a AccessLevel ('edit' | 'view' | 'none')
 */
export function normalizeAccessLevel(val: any, fallback: AccessLevel = 'none'): AccessLevel {
  if (val === 'edit' || val === true) return 'edit';
  if (val === 'view') return 'view';
  if (val === 'none' || val === false) return 'none';
  return fallback;
}
