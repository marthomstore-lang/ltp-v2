/**
 * Optimizador de red y caché en memoria (Stale-While-Revalidate + Deduplicación In-Flight)
 * Acelera drásticamente el cambio entre ventanas y módulos evitando descargas redundantes
 * de catálogos y nóminas, e invalidando automáticamente ante cualquier escritura (POST/PUT/PATCH/DELETE).
 */

interface CacheEntry {
  bodyText: string;
  status: number;
  statusText: string;
  contentType: string;
  timestamp: number;
  ok: boolean;
}

const FRESH_TTL_MS = 25_000; // 25s: respuesta instantánea (0ms) sin tráfico de red
const STALE_TTL_MS = 120_000; // 2 min: respuesta instantánea (0ms) + refresco silencioso en segundo plano

const CACHEABLE_PREFIXES = [
  '/api/students',
  '/api/courses',
  '/api/levels',
  '/api/subjects',
  '/api/assignments',
  '/api/staff',
  '/api/settings',
  '/api/permissions',
  '/api/institutional-links',
  '/api/config/course-subject-order',
  '/api/interviews',
  '/api/observations',
  '/api/stats',
  '/api/grades/course-overview',
  '/api/library/dashboard',
  '/api/library/books'
];

const responseCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<CacheEntry | null>>();
let lastAuthSignature = '';

function normalizeApiUrl(rawUrl: string): string {
  // Unificar /api/students?year=2026 con /api/students para compartir la nómina ya cargada en el Dashboard
  if (rawUrl === '/api/students?year=2026' || rawUrl === '/api/students?anno=2026') {
    return '/api/students';
  }
  return rawUrl;
}

function isCacheableUrl(url: string): boolean {
  return CACHEABLE_PREFIXES.some((prefix) => url === prefix || url.startsWith(prefix + '?') || url.startsWith(prefix + '/'));
}

function buildResponse(entry: CacheEntry): Response {
  return new Response(entry.bodyText, {
    status: entry.status,
    statusText: entry.statusText,
    headers: {
      'Content-Type': entry.contentType || 'application/json'
    }
  });
}

function extractAuthSignature(input: RequestInfo | URL, init?: RequestInit): string {
  try {
    const headers = init?.headers;
    if (headers) {
      if (headers instanceof Headers) {
        return headers.get('Authorization') || headers.get('authorization') || '';
      }
      if (Array.isArray(headers)) {
        const found = headers.find(([k]) => k.toLowerCase() === 'authorization');
        return found ? found[1] : '';
      }
      const rec = headers as Record<string, string>;
      return rec['Authorization'] || rec['authorization'] || '';
    }
    if (typeof Request !== 'undefined' && input instanceof Request) {
      return input.headers.get('Authorization') || '';
    }
  } catch {
    // ignore
  }
  return '';
}

export function clearApiCache(): void {
  responseCache.clear();
  inFlightRequests.clear();
}

export function installFetchCache(): void {
  if (typeof window === 'undefined' || (window as any).__ltpFetchCacheInstalled) {
    return;
  }
  (window as any).__ltpFetchCacheInstalled = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Solo interceptar llamadas a nuestra API
    if (!rawUrl || (!rawUrl.startsWith('/api/') && !rawUrl.includes('/api/'))) {
      return nativeFetch(input, init);
    }

    const apiIndex = rawUrl.indexOf('/api/');
    const relativeUrl = apiIndex >= 0 ? rawUrl.slice(apiIndex) : rawUrl;
    const method = (init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();

    const authSig = extractAuthSignature(input, init);
    if (authSig && authSig !== lastAuthSignature) {
      if (lastAuthSignature !== '') {
        responseCache.clear();
        inFlightRequests.clear();
      }
      lastAuthSignature = authSig;
    }

    // Cualquier mutación (POST, PUT, PATCH, DELETE) invalida el caché inmediatamente
    if (method !== 'GET') {
      const currentAccess = (window as any).__ltpCurrentModuleAccess;
      const isAlwaysAllowedEndpoint =
        relativeUrl.startsWith('/api/auth/') ||
        relativeUrl.startsWith('/api/login') ||
        relativeUrl.startsWith('/api/users/profile') ||
        relativeUrl.startsWith('/api/notifications') ||
        relativeUrl.startsWith('/api/course-messages') ||
        relativeUrl.startsWith('/api/interviews/submit-statement');
      if (currentAccess === 'view' && !isAlwaysAllowedEndpoint) {
        return new Response(
          JSON.stringify({
            error: 'Acción bloqueada: Tu perfil tiene acceso de SOLO VISTA en esta ventana y no permite guardar, crear ni eliminar registros.'
          }),
          {
            status: 403,
            statusText: 'Forbidden (Read-Only Profile)',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      responseCache.clear();
      inFlightRequests.clear();
      try {
        const res = await nativeFetch(input, init);
        responseCache.clear();
        return res;
      } catch (err) {
        responseCache.clear();
        throw err;
      }
    }

    const normalizedUrl = normalizeApiUrl(relativeUrl);
    const cacheable = isCacheableUrl(normalizedUrl);
    const cacheKey = `${authSig.slice(-16)}:${normalizedUrl}`;

    const performNetworkFetch = (): Promise<CacheEntry> => {
      const existingInFlight = inFlightRequests.get(cacheKey);
      if (existingInFlight) {
        return existingInFlight as Promise<CacheEntry>;
      }

      const promise = (async (): Promise<CacheEntry> => {
        try {
          const response = await nativeFetch(input, init);
          const contentType = response.headers.get('Content-Type') || 'application/json';
          const bodyText = await response.text();
          const entry: CacheEntry = {
            bodyText,
            status: response.status,
            statusText: response.statusText,
            contentType,
            timestamp: Date.now(),
            ok: response.ok
          };
          if (response.ok && cacheable) {
            responseCache.set(cacheKey, entry);
          }
          return entry;
        } finally {
          inFlightRequests.delete(cacheKey);
        }
      })();

      inFlightRequests.set(cacheKey, promise);
      return promise;
    };

    if (!cacheable) {
      return nativeFetch(input, init);
    }

    const cached = responseCache.get(cacheKey);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age <= FRESH_TTL_MS) {
        return buildResponse(cached);
      }
      if (age <= STALE_TTL_MS) {
        // Stale-While-Revalidate: devolver de inmediato desde memoria y refrescar en segundo plano
        performNetworkFetch().catch(() => {});
        return buildResponse(cached);
      }
    }

    // Deduplicar peticiones GET simultáneas y cachear en memoria
    const entry = await performNetworkFetch();
    return buildResponse(entry);
  };
}
