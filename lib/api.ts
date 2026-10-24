import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

// ── Request interceptor — attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    // A 401 from the sign-in form itself means "wrong password", not "session expired":
    // redirecting would reload the page and throw the error message away.
    const onPublicPage = typeof window !== 'undefined' && PUBLIC_PATHS.includes(window.location.pathname);
    if (err.response?.status === 401 && typeof window !== 'undefined' && !onPublicPage) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
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
  register: (data: { name: string; email: string; password: string; organizationCode: string }) =>
    api.post('/auth/register', data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  updateProfile: (name: string) => api.patch('/auth/me', { name }),
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
  get: (id: string) => api.get(`/deliveries/${id}`),
  getProof: (id: string) => api.get(`/deliveries/${id}/proof`),
};

// ── Approvals ─────────────────────────────────────────────────────────────────
export const approvalsApi = {
  create: (deliveryId: string, data: { decision: string; comment?: string }) =>
    api.post(`/deliveries/${deliveryId}/approvals`, data),
  list: (deliveryId: string) => api.get(`/deliveries/${deliveryId}/approvals`),
};

// ── Verification ──────────────────────────────────────────────────────────────
export const verificationApi = {
  verify: (deliveryId: string) => api.post(`/deliveries/${deliveryId}/verify`),
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
  get: (id: string) => api.get(`/companies/${id}`),
  create: (data: unknown) => api.post('/companies', data),
  update: (id: string, data: unknown) => api.patch(`/companies/${id}`, data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: unknown) => api.post('/users', data),
  update: (id: string, data: unknown) => api.patch(`/users/${id}`, data),
};

// ── Billing ───────────────────────────────────────────────────────────────────
type Params = Record<string, unknown>;

export const partiesApi = {
  list: (params?: Params) => api.get('/parties', { params }),
  accounts: () => api.get('/parties/accounts'),
  get: (id: string) => api.get(`/parties/${id}`),
  create: (data: unknown) => api.post('/parties', data),
  update: (id: string, data: unknown) => api.patch(`/parties/${id}`, data),
};

export const itemsApi = {
  list: (params?: Params) => api.get('/items', { params }),
  get: (id: string) => api.get(`/items/${id}`),
  create: (data: unknown) => api.post('/items', data),
  update: (id: string, data: unknown) => api.patch(`/items/${id}`, data),
  adjust: (id: string, data: { change: number; note?: string }) => api.post(`/items/${id}/adjust`, data),
  stockSummary: () => api.get('/items/stock/summary'),
  movements: (itemId?: string) => api.get('/items/stock/movements', { params: { itemId } }),
};

export const invoicesApi = {
  list: (type: 'sale' | 'purchase', params?: Params) =>
    api.get(type === 'sale' ? '/sales' : '/purchases', { params }),
  create: (type: 'sale' | 'purchase', data: unknown) =>
    api.post(type === 'sale' ? '/sales' : '/purchases', data),
  get: (id: string) => api.get(`/invoices/${id}`),
  verify: (id: string) => api.post(`/invoices/${id}/verify`),
  cancel: (id: string) => api.patch(`/invoices/${id}/cancel`),
};

export const paymentsApi = {
  list: (params?: Params) => api.get('/payments', { params }),
  create: (data: unknown) => api.post('/payments', data),
};

export const razorpayApi = {
  config: () => api.get('/payments/razorpay/config'),
  createOrder: (invoiceId: string, amount?: number) =>
    api.post('/payments/razorpay/order', { invoiceId, amount }),
  verify: (data: { orderId: string; paymentId: string; signature: string }) =>
    api.post('/payments/razorpay/verify', data),
};

export const reportsApi = {
  sales: (params?: Params) => api.get('/reports/sales', { params }),
  outstanding: (params?: Params) => api.get('/reports/outstanding', { params }),
  stock: () => api.get('/reports/stock'),
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
