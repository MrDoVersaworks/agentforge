import axios from 'axios';

if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('[WARN] NEXT_PUBLIC_API_URL is not defined in the environment.');
}
const configuredUrl = process.env.NEXT_PUBLIC_API_URL;
if (!configuredUrl) {
  throw new Error('[ERR_API_CONFIG_MISSING] NEXT_PUBLIC_API_URL must be configured.');
}
const rawUrl = configuredUrl?.replace(/\/+$/, '') ?? '';
// Browser requests stay same-origin so refresh/CSRF cookies are first-party.
// Next.js rewrites /api/* to the backend deployment.
export const API_BASE_URL = typeof window !== 'undefined' ? '/api' : (rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`);

const CSRF_STORAGE_KEY = 'agentforge_csrf_token';

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `af-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getApiBaseUrl(): string { return API_BASE_URL; }
export function getAccessToken(): string | null { return accessToken; }

export function setCsrfToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(CSRF_STORAGE_KEY, token);
  else window.localStorage.removeItem(CSRF_STORAGE_KEY);
}

function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CSRF_STORAGE_KEY);
}

function sendClientDiagnostic(event: {
  event: string;
  requestId?: string;
  endpoint?: string;
  agentId?: string;
  documentCount?: number;
  chunkCount?: number;
  notificationVisible?: boolean;
  notificationText?: string;
  detail?: Record<string, string | number | boolean | null>;
}) {
  if (typeof window === 'undefined' || event.endpoint?.includes('/diagnostics/client')) return;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  void axios.post(`${API_BASE_URL}/diagnostics/client`, {
    ...event,
    route: window.location.pathname,
  }, { withCredentials: true, headers }).catch(() => {
    // Diagnostics must never affect application behavior.
  });
}


api.interceptors.request.use((config) => {
  const requestId = createRequestId();
  config.headers['X-Request-ID'] = requestId;
  (config as typeof config & { __agentforgeRequestId?: string }).__agentforgeRequestId = requestId;
  if (typeof window !== 'undefined') {
    console.info('[AgentForge][TRACE] request:start', { requestId, method: config.method, url: config.url });
  }
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (typeof config.url === 'string' &&
      (config.url.includes('/auth/refresh') || config.url.includes('/auth/logout'))) {
    const csrfToken = getCsrfToken();
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
}, error => Promise.reject(error));

let isRefreshing = false;
let failedQueue: Array<{resolve:(token:string)=>void; reject:(err:unknown)=>void}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  response => {
    if (typeof window !== 'undefined') {
      const requestId = (response.config as typeof response.config & { __agentforgeRequestId?: string }).__agentforgeRequestId;
      const payload = response.data?.data;
      const agentRecord = payload?.agent as { id?: string; document_count?: number; chunk_count?: number } | undefined;
      const agentRecords = payload?.agents?.map?.((agent: { id?: string; document_count?: number; chunk_count?: number }) => ({
        agentId: agent.id,
        documentCount: agent.document_count,
        chunkCount: agent.chunk_count,
      }));
      const notificationMatch = document.body.innerText.match(/(?:not\\s+grounded|grounded\\s+mode\\s+(?:inactive|off)|without\\s+grounding)[^\\n]*/i);
      console.info('[AgentForge][TRACE] request:complete', {
        requestId,
        method: response.config.method,
        url: response.config.url,
        status: response.status,
        agentCounts: agentRecords,
        documentCount: Array.isArray(payload?.documents) ? payload.documents.length : undefined,
        page: window.location.pathname,
        notificationVisible: Boolean(notificationMatch),
        notificationText: notificationMatch?.[0],
      });

      if (typeof response.config.url === 'string' && /\\/agents(?:\\/[^/]+)?$/.test(response.config.url)) {
        sendClientDiagnostic({
          event: 'agent-response-ui-state',
          requestId,
          endpoint: response.config.url,
          agentId: agentRecord?.id ?? agentRecords?.[0]?.agentId,
          documentCount: agentRecord?.document_count ?? agentRecords?.[0]?.documentCount,
          chunkCount: agentRecord?.chunk_count ?? agentRecords?.[0]?.chunkCount,
          notificationVisible: Boolean(notificationMatch),
          notificationText: notificationMatch?.[0],
          detail: {
            agentRecordPresent: Boolean(agentRecord),
            agentListCount: agentRecords?.length ?? 0,
          },
        });
      }
    }
    return response;
  },
  async error => {
    if (typeof window !== 'undefined') {
      const requestId = (error.config as (typeof error.config & { __agentforgeRequestId?: string }) | undefined)?.__agentforgeRequestId;
      console.error('[AgentForge][TRACE] request:error', {
        requestId,
        method: error.config?.method,
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
    }
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: err => reject(err),
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`, {}, {
            withCredentials: true,
            headers: (() => {
              const csrfToken = getCsrfToken();
              return csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined;
            })(),
          }
        );
        setCsrfToken(data.data.csrfToken ?? null);
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        setCsrfToken(null);
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
