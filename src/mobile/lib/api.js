import { AUTH_EVENT, api as webApi } from '../../lib/api.js';

const ACT_KEY = 'runstock.actAs';
const API_BASE_URL = typeof __RUNSTOCK_API_BASE_URL__ !== 'undefined' ? __RUNSTOCK_API_BASE_URL__ : '';

function token() {
  return webApi.getStoredAuth()?.token || null;
}

export function getActAs() {
  try {
    const raw = localStorage.getItem(ACT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setActAs(tenant) {
  try {
    if (tenant) localStorage.setItem(ACT_KEY, JSON.stringify(tenant));
    else localStorage.removeItem(ACT_KEY);
  } catch {
    /* ignore */
  }
}

async function req(path, { method = 'GET', body } = {}) {
  const headers = {};
  const tk = token();
  if (tk) headers.Authorization = `Bearer ${tk}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const act = getActAs();
  if (act?.id && !path.startsWith('/api/tenants')) headers['X-Act-As-Tenant'] = act.id;

  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) window.dispatchEvent(new Event(AUTH_EVENT));
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Xəta (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  /* auth */
  login: (username, password) =>
    req('/api/auth/login', { method: 'POST', body: { username, password } }),
  me: () => req('/api/auth/me'),
  confirmPairing: (code, token) =>
    req('/api/auth/pair/confirm', { method: 'POST', body: { code, token } }),
  logout: async () => {
    try {
      await req('/api/auth/logout', { method: 'POST' });
    } finally {
      setActAs(null);
    }
  },

  /* məhsullar */
  listItems: () => req('/api/items'),
  createItem: (item) => req('/api/items', { method: 'POST', body: item }),
  updateItem: (id, patch) => req(`/api/items/${id}`, { method: 'PUT', body: patch }),
  deleteItem: (id) => req(`/api/items/${id}`, { method: 'DELETE' }),
  changeStock: (id, delta, note = '') => req(`/api/items/${id}/stock`, { method: 'POST', body: { delta, note } }),

  /* ümumi qarışım siyahıları: purchases, sales, rentals, categories, brands, ... */
  list: (entity) => req(`/api/${entity}`),
  create: (entity, data) => req(`/api/${entity}`, { method: 'POST', body: data }),
  update: (entity, id, data) => req(`/api/${entity}/${id}`, { method: 'PUT', body: data }),
  delete: (entity, id) => req(`/api/${entity}/${id}`, { method: 'DELETE' }),

  /* hərəkətlər / audit */
  movements: () => req('/api/movements'),
  audit: () => req('/api/audit'),
  testNotification: () => req('/api/notifications/test', { method: 'POST' }),

  /* kassa, servis və fakturalar */
  listCashflow: () => req('/api/cashflow'),
  createCashflow: (data) => req('/api/cashflow', { method: 'POST', body: data }),
  deleteCashflow: (id) => req(`/api/cashflow/${id}`, { method: 'DELETE' }),
  listMaintenance: () => req('/api/maintenance'),
  createMaintenance: (data) => req('/api/maintenance', { method: 'POST', body: data }),
  listInvoices: () => req('/api/invoices'),

  /* istifadəçilər */
  listUsers: () => req('/api/users'),
  createUser: (data) => req('/api/users', { method: 'POST', body: data }),
  updateUser: (id, data) => req(`/api/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => req(`/api/users/${id}`, { method: 'DELETE' }),

  /* müəssisə */
  getTenant: () => req('/api/tenant'),
  updateTenant: (data) => req('/api/tenant', { method: 'PUT', body: data }),

  /* platform (yalnız superadmin, act-as header göndərilmir) */
  listTenants: () => req('/api/tenants'),
  createTenant: (data) => req('/api/tenants', { method: 'POST', body: data }),
  updateTenantAdmin: (id, data) => req(`/api/tenants/${id}`, { method: 'PUT', body: data }),

  getActAs,
  setActAs,
};
