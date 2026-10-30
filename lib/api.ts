import axios from 'axios';

/**
 * Where API calls go. Empty (the default) means same origin: the browser calls /api/... on the
 * frontend's own address and next.config.ts forwards it to the backend (BACKEND_URL).
 * Set NEXT_PUBLIC_API_URL only to point the browser straight at a backend on another origin.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

/** The signed-in session kept in localStorage. Everything that touches it goes through here. */
export const session = {
  getToken(): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  },
  getUser<T>(): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  save(token: string, user: unknown) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  saveUser(user: unknown) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/** Records are identified by whole numbers (1, 2, 3 ...); route parameters may arrive as text. */
export type Id = number | string;

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// ── Global loading indicator ─────────────────────────────────────────────────
// <GlobalLoader> registers a setter here; it is switched on while any request is in flight.
let pendingRequests = 0;
let setGlobalLoading: ((loading: boolean) => void) | undefined;

export function registerLoading(setter: ((loading: boolean) => void) | undefined) {
  setGlobalLoading = setter;
  pendingRequests = 0;
}

const requestStarted = () => { pendingRequests += 1; setGlobalLoading?.(true); };
const requestFinished = () => { pendingRequests = Math.max(0, pendingRequests - 1); if (pendingRequests === 0) setGlobalLoading?.(false); };

// ── Request interceptor — attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  requestStarted();
  const token = session.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => { requestFinished(); return Promise.reject(err); });

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => { requestFinished(); return res; },
  (err) => {
    requestFinished();
    // A 401 from the sign-in form itself means "wrong password", not "session expired":
    // redirecting would reload the page and throw the error message away.
    const onPublicPage = typeof window !== 'undefined' && PUBLIC_PATHS.includes(window.location.pathname);
    // A temporary password must be replaced before anything else can be used.
    const msg = String(err.response?.data?.message ?? '');
    if (err.response?.status === 403 && msg.startsWith('PASSWORD_CHANGE_REQUIRED') && typeof window !== 'undefined'
      && window.location.pathname !== '/change-password') {
      window.location.href = '/change-password';
    }
    if (err.response?.status === 401 && typeof window !== 'undefined' && !onPublicPage) {
      session.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  register: (data: Record<string, unknown>) =>
    api.post('/auth/register', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  updateProfile: (name: string) => api.patch('/auth/me', { name }),
};

export const emailOtpApi = {
  send: (email: string) => api.post('/email-otp/send', { email }),
  verify: (email: string, otp: string) => api.post('/email-otp/verify', { email, otp }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  activity: () => api.get('/dashboard/activity'),
};

// ── Deliveries ────────────────────────────────────────────────────────────────
export const deliveriesApi = {
  create: (data: unknown) => api.post('/deliveries', data),
  list: (params?: Record<string, unknown>) => api.get('/deliveries', { params }),
  get: (id: Id) => api.get(`/deliveries/${id}`),
  getProof: (id: Id) => api.get(`/deliveries/${id}/proof`),
};

// ── Approvals ─────────────────────────────────────────────────────────────────
export const approvalsApi = {
  create: (deliveryId: Id, data: { decision: string; comment?: string }) =>
    api.post(`/deliveries/${deliveryId}/approvals`, data),
  list: (deliveryId: Id) => api.get(`/deliveries/${deliveryId}/approvals`),
};

// ── Verification ──────────────────────────────────────────────────────────────
export const verificationApi = {
  verify: (deliveryId: Id) => api.post(`/deliveries/${deliveryId}/verify`),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainApi = {
  status: () => api.get('/blockchain/status'),
  transactions: () => api.get('/blockchain/transactions'),
  transaction: (hash: string) => api.get(`/blockchain/transactions/${hash}`),
  network: () => api.get('/blockchain/network'),
};

// ── Companies ─────────────────────────────────────────────────────────────────
export const companiesApi = {
  list: () => api.get('/companies'),
  get: (id: Id) => api.get(`/companies/${id}`),
  create: (data: unknown) => api.post('/companies', data),
  update: (id: Id, data: unknown) => api.patch(`/companies/${id}`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: Id) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: Id, data: unknown) => api.patch(`/users/${id}`, data),
};

// ── Billing ───────────────────────────────────────────────────────────────────
type Params = Record<string, unknown>;

export const partiesApi = {
  list: (params?: Params) => api.get('/parties', { params }),
  accounts: () => api.get('/parties/accounts'),
  get: (id: Id) => api.get(`/parties/${id}`),
  create: (data: unknown) => api.post('/parties', data),
  update: (id: Id, data: unknown) => api.patch(`/parties/${id}`, data),
  remove: (id: Id) => api.delete(`/parties/${id}`),
};

export const itemsApi = {
  list: (params?: Params) => api.get('/items', { params }),
  get: (id: Id) => api.get(`/items/${id}`),
  create: (data: unknown) => api.post('/items', data),
  update: (id: Id, data: unknown) => api.patch(`/items/${id}`, data),
  adjust: (id: Id, data: { change: number; branchId?: number; note?: string }) => api.post(`/items/${id}/adjust`, data),
  remove: (id: Id) => api.delete(`/items/${id}`),
  stockSummary: (params?: Params) => api.get('/items/stock/summary', { params }),
  movements: (params?: Params) => api.get('/items/stock/movements', { params }),
  movementsCsv: (params?: Params) => api.get('/items/stock/movements/export', { params, responseType: 'blob' }),
  branches: (id: Id) => api.get(`/items/${id}/branches`),
  transfer: (data: unknown) => api.post('/items/stock/transfer', data),
  returns: (data: unknown) => api.post('/items/stock/returns', data),
  entry: (data: unknown) => api.post('/items/stock/entry', data),
};

export const invoicesApi = {
  list: (type: 'sale' | 'purchase', params?: Params) =>
    api.get(type === 'sale' ? '/sales' : '/purchases', { params }),
  create: (type: 'sale' | 'purchase', data: unknown) =>
    api.post(type === 'sale' ? '/sales' : '/purchases', data),
  nextNumber: (type: 'sale' | 'purchase') => api.get('/invoices/next-number', { params: { type } }),
  get: (id: Id) => api.get(`/invoices/${id}`),
  verify: (id: Id) => api.post(`/invoices/${id}/verify`),
  cancel: (id: Id) => api.patch(`/invoices/${id}/cancel`),
};

export const paymentsApi = {
  list: (params?: Params) => api.get('/payments', { params }),
  remove: (id: Id) => api.delete(`/payments/${id}`),
  create: (data: unknown) => api.post('/payments', data),
};

export const razorpayApi = {
  config: () => api.get('/payments/razorpay/config'),
  createOrder: (invoiceId: Id, amount?: number) =>
    api.post('/payments/razorpay/order', { invoiceId, amount }),
  verify: (data: { orderId: string; paymentId: string; signature: string }) =>
    api.post('/payments/razorpay/verify', data),
};

export const reportsApi = {
  sales: (params?: Params) => api.get('/reports/sales', { params }),
  outstanding: (params?: Params) => api.get('/reports/outstanding', { params }),
  stock: (params?: Params) => api.get('/reports/stock', { params }),
  transactions: (params?: Params) => api.get('/reports/transactions', { params }),
};

// ── Cash & bank ───────────────────────────────────────────────────────────────
export const cashBankApi = {
  accounts: () => api.get('/cash-bank/accounts'),
  createAccount: (data: unknown) => api.post('/cash-bank/accounts', data),
  updateAccount: (id: Id, data: unknown) => api.patch(`/cash-bank/accounts/${id}`, data),
  transactions: (params?: Params) => api.get('/cash-bank/transactions', { params }),
  createTransaction: (data: unknown) => api.post('/cash-bank/transactions', data),
  transfer: (data: unknown) => api.post('/cash-bank/transfer', data),
  removeAccount: (id: Id) => api.delete(`/cash-bank/accounts/${id}`),
  removeTransaction: (id: Id) => api.delete(`/cash-bank/transactions/${id}`),
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: (params?: Params) => api.get('/expenses', { params }),
  summary: (params?: Params) => api.get('/expenses/summary', { params }),
  categories: () => api.get('/expenses/categories'),
  create: (data: unknown) => api.post('/expenses', data),
  update: (id: Id, data: unknown) => api.patch(`/expenses/${id}`, data),
  remove: (id: Id) => api.delete(`/expenses/${id}`),
};

// ── Quotations ────────────────────────────────────────────────────────────────
export const quotationsApi = {
  list: (params?: Params) => api.get('/quotations', { params }),
  get: (id: Id) => api.get(`/quotations/${id}`),
  create: (data: unknown) => api.post('/quotations', data),
  setStatus: (id: Id, status: string) => api.patch(`/quotations/${id}/status`, { status }),
  convert: (id: Id) => api.post(`/quotations/${id}/convert`),
  remove: (id: Id) => api.delete(`/quotations/${id}`),
};

// ── Roles & permissions ───────────────────────────────────────────────────────
export const rolesApi = {
  mine: () => api.get('/roles/permissions/me'),
  userAccess: (userId: Id) => api.get(`/roles/users/${userId}/access`),
  saveUserAccess: (userId: Id, screens: Array<{ key: string; level: string | null }>) => api.put(`/roles/users/${userId}/access`, { screens }),
  list: () => api.get('/roles'),
  create: (data: { key: string; name: string; description?: string }) => api.post('/roles', data),
  remove: (key: string) => api.delete('/roles/' + key),
  permissions: () => api.get('/roles/permissions'),
  updatePermissions: (changes: unknown) => api.put('/roles/permissions', { changes }),
};

// ── My company (profile, settings, branches, team) ──────────────────────────────
export const companyApi = {
  profile: () => api.get('/company/profile'),
  updateProfile: (data: unknown) => api.patch('/company/profile', data),
  settings: () => api.get('/company/settings'),
  updateSettings: (data: unknown) => api.put('/company/settings', data),
  branches: () => api.get('/company/branches'),
  createBranch: (data: unknown) => api.post('/company/branches', data),
  updateBranch: (id: Id, data: unknown) => api.patch(`/company/branches/${id}`, data),
  removeBranch: (id: Id) => api.delete(`/company/branches/${id}`),
  team: () => api.get('/company/team'),
  teamRoles: () => api.get('/company/team/roles'),
  addMember: (data: unknown) => api.post('/company/team', data),
  updateMember: (id: Id, data: unknown) => api.patch(`/company/team/${id}`, data),
  memberAccess: (id: Id) => api.get(`/company/team/${id}/access`),
  saveMemberAccess: (id: Id, screens: Array<{ key: string; level: string | null }>) => api.put(`/company/team/${id}/access`, { screens }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: (params?: Params) => api.get('/notifications', { params }),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: Id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id: Id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/read'),
};

// ── Audit ─────────────────────────────────────────────────────────────────────
export const auditApi = {
  logs: (params?: Record<string, unknown>) => api.get('/audit/logs', { params }),
  export: () => api.get('/audit/export', { responseType: 'blob' }),
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};
