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

api.interceptors.request.use((config) => {
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
  response => response,
  async error => {
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
