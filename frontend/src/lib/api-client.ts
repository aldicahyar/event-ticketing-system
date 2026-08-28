import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from 'axios';

import type {
  AdminUser,
  UserListResult,
  UserStats,
  ListUsersQuery,
  CreateUserDto,
  UpdateUserDto,
} from '@/types/user';

import type {
  AdminMedia,
  MediaListResult,
  ListMediaQuery,
} from '@/types/media';

import type {
  CmsPage,
  PageListResult,
  PageSummary,
  CreatePageDto,
  UpdatePageDto,
  ListPagesQuery,
} from '@/types/page';

import type {
  DisputeDetail,
  DisputeListResult,
  DisputeListMeta,
  DisputeSummary,
  DisputeStatus,
  SaveEvidenceInput,
  DisputeDocument,
  DisputeEvidenceType,
} from '@/types/dispute';

import type {
  RefundReport,
  ReconciliationResult,
  RevenueReport,
} from '@/types/analytics';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Types
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    email_verified: boolean;
    created_at: string;
    profile?: {
      phone?: string;
      date_of_birth?: string;
      gender?: string;
    };
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthError {
  message: string | string[];
  statusCode: number;
  error: string;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<AuthError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // If error is not 401 or request already retried, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // If refreshing token, queue this request
        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        this.isRefreshing = true;

        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          this.clearTokens();
          this.isRefreshing = false;
          // Redirect to login if on client side
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(error);
        }

        try {
          const response = await this.client.post<ApiResponse<LoginResponse>>(
            '/auth/refresh',
            { refreshToken }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data as LoginResponse;

          this.setTokens(accessToken, newRefreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process queued requests
          this.failedQueue.forEach(({ resolve }) => resolve(accessToken));
          this.failedQueue = [];

          return this.client(originalRequest);
        } catch (refreshError) {
          this.failedQueue.forEach(({ reject }) => reject(refreshError as Error));
          this.failedQueue = [];
          this.clearTokens();

          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
          return Promise.reject(refreshError);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }

  // Token management
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getUser(): { id: string; email: string; name: string; role: string } | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  setUser(user: { id: string; email: string; name: string; role: string }): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user', JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  // Auth endpoints
  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>(
      '/auth/register',
      data
    );
    const result = response.data.data as LoginResponse;
    this.setTokens(result.accessToken, result.refreshToken);
    this.setUser(result.user);
    return result;
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      data
    );
    const result = response.data.data as LoginResponse;
    this.setTokens(result.accessToken, result.refreshToken);
    this.setUser(result.user);
    return result;
  }

  async verifyEmail(email: string, token: string): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>(
      '/auth/verify-email',
      { email, token }
    );
    const result = response.data.data as LoginResponse;
    this.setTokens(result.accessToken, result.refreshToken);
    this.setUser(result.user);
    return result;
  }

  async resendVerification(email: string): Promise<void> {
    await this.client.post('/auth/resend-verification', { email });
  }

  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    try {
      if (refreshToken) {
        await this.client.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors
    } finally {
      this.clearTokens();
    }
  }

  async logoutAll(): Promise<void> {
    await this.client.post('/auth/logout-all');
    this.clearTokens();
  }

  async getMe(): Promise<LoginResponse['user']> {
    const response = await this.client.get<ApiResponse<LoginResponse['user']>>(
      '/auth/me'
    );
    return response.data.data as LoginResponse['user'];
  }

  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> {
    const response = await this.client.patch<ApiResponse<{ message: string }>>(
      '/auth/password',
      data
    );
    return response.data.data as { message: string };
  }

  async getSecurityLogs(): Promise<unknown[]> {
    const response = await this.client.get<ApiResponse<unknown[]>>(
      '/auth/security-logs'
    );
    return response.data.data || [];
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: Record<string, unknown>) {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data.data;
  }

  async post<T>(url: string, data?: unknown) {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async put<T>(url: string, data?: unknown) {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async patch<T>(url: string, data?: unknown) {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data.data;
  }

  // Error handler helper
  getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<AuthError>;
      if (axiosError.response?.data?.message) {
        const msg = axiosError.response.data.message;
        if (typeof msg === 'string') return msg;
        if (Array.isArray(msg)) return msg.join(', ');
        if (typeof msg === 'object') return JSON.stringify(msg);
        return String(msg);
      }
      if (axiosError.message === 'Network Error') {
        return 'Unable to connect to server. Please check your connection.';
      }
      return axiosError.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  /** Strip undefined/null/'' filters so query strings stay clean. */
  private cleanParams(query?: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      }
    }
    return params;
  }

  // ============================================================
  // RBAC ENDPOINTS (see docs/api/rbac-openapi.yaml)
  // ============================================================

  /** Get sidebar menus for current user (cached 5min per role_code). */
  async getMySidebar() {
    return this.get<any[]>('/menus/my-sidebar');
  }

  // ----- Roles -----
  async listRoles(filters?: { is_active?: boolean; includePermissions?: boolean }) {
    return this.get<any[]>('/roles', filters as Record<string, unknown>);
  }
  async createRole(dto: any) {
    return this.post<any>('/roles', dto);
  }
  async updateRole(code: string, dto: any) {
    return this.patch<any>(`/roles/${code}`, dto);
  }
  async deleteRole(code: string) {
    return this.delete<any>(`/roles/${code}`);
  }

  // ----- Menus -----
  async listMenus(filters?: { is_active?: boolean }) {
    return this.get<any[]>('/menus/admin', filters as Record<string, unknown>);
  }
  async createMenu(dto: any) {
    return this.post<any>('/menus/admin', dto);
  }
  async updateMenu(code: string, dto: any) {
    return this.patch<any>(`/menus/admin/${code}`, dto);
  }
  async deleteMenu(code: string) {
    return this.delete<any>(`/menus/admin/${code}`);
  }

  // ----- Permissions -----
  async getPermissionMatrix(filters?: { role_code?: string; menu_code?: string }) {
    return this.get<any[]>('/permissions', filters as Record<string, unknown>);
  }
  async getRolePermissions(role_code: string) {
    return this.get<any[]>(`/permissions/${role_code}`);
  }
  async replaceRolePermissions(role_code: string, cells: any[]) {
    return this.put<any>(`/permissions/${role_code}`, { permissions: cells });
  }

  // ----- User Roles -----
  async getUserRole(user_id: string) {
    return this.get<any>(`/users/${user_id}/role`);
  }
  async assignUserRole(user_id: string, role_code: string) {
    return this.patch<any>(`/users/${user_id}/role`, { role_code });
  }

  // ============================================================
  // USER MANAGEMENT (admin) — backend: /users/manage
  // ============================================================

  /** Paginated user list. Undefined filters are stripped before sending. */
  async listUsers(query?: ListUsersQuery) {
    return this.get<UserListResult>('/users/manage', this.cleanParams(query as Record<string, unknown>));
  }

  async getUserStats() {
    return this.get<UserStats>('/users/manage/stats');
  }

  async getUserDetail(id: string) {
    return this.get<AdminUser>(`/users/manage/${id}`);
  }

  async createUser(dto: CreateUserDto) {
    return this.post<AdminUser>('/users/manage', dto);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    return this.patch<AdminUser>(`/users/manage/${id}`, dto);
  }

  async deleteUser(id: string) {
    return this.delete<{ id: string; email: string; deleted: boolean }>(
      `/users/manage/${id}`,
    );
  }

  async unlockUser(id: string) {
    return this.post<AdminUser>(`/users/manage/${id}/unlock`);
  }

  async resetUserPassword(id: string, newPassword: string) {
    return this.post<{ id: string; passwordReset: boolean; sessionsRevoked: boolean }>(
      `/users/manage/${id}/reset-password`,
      { newPassword },
    );
  }

  // ============================================================
  // CMS — MEDIA (admin: /media)
  // ============================================================

  async listMedia(query?: ListMediaQuery) {
    return this.get<MediaListResult>('/media', this.cleanParams(query as Record<string, unknown>));
  }

  /**
   * Upload a file via multipart. Sets Content-Type to undefined so the browser
   * generates the correct multipart boundary (the instance defaults to JSON).
   */
  async uploadMedia(file: File, folder?: string): Promise<AdminMedia> {
    const form = new FormData();
    form.append('file', file);
    const url = folder ? `/media/upload?folder=${encodeURIComponent(folder)}` : '/media/upload';
    const res = await this.client.post<ApiResponse<AdminMedia>>(url, form, {
      // Cast: axios types disallow an undefined header value, but setting it to
      // undefined is exactly how we get axios to compute the multipart boundary.
      headers: { 'Content-Type': undefined } as any,
    });
    return res.data.data as AdminMedia;
  }

  async updateMedia(id: string, dto: { alt?: string; folder?: string }) {
    return this.patch<AdminMedia>(`/media/${id}`, dto);
  }

  async deleteMedia(id: string) {
    return this.delete<{ id: string; deleted: boolean }>(`/media/${id}`);
  }

  // ============================================================
  // CMS — PAGES (admin: /pages, public: /public/pages)
  // ============================================================

  async listPages(query?: ListPagesQuery) {
    return this.get<PageListResult>('/pages', this.cleanParams(query as Record<string, unknown>));
  }

  async getPage(id: string) {
    return this.get<CmsPage>(`/pages/${id}`);
  }

  async createPage(dto: CreatePageDto) {
    return this.post<CmsPage>('/pages', dto);
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    return this.patch<CmsPage>(`/pages/${id}`, dto);
  }

  async deletePage(id: string) {
    return this.delete<{ id: string; deleted: boolean }>(`/pages/${id}`);
  }

  // ============================================================
  // DISPUTE MANAGEMENT (admin: /disputes)
  // ============================================================

  async listDisputes(query: {
    status?: DisputeStatus;
    page?: number;
    limit?: number;
  }): Promise<DisputeListResult> {
    const response = await this.client.get<
      ApiResponse<DisputeSummary[]> & { meta?: DisputeListMeta }
    >('/disputes', { params: this.cleanParams(query) });
    return { data: response.data.data ?? [], meta: response.data.meta };
  }

  /** Sidebar badge counter: disputes still awaiting action. */
  async getDisputeStats() {
    return this.get<{ open: number }>('/disputes/stats');
  }

  async getDispute(id: string) {
    return this.get<DisputeDetail>(`/disputes/${id}`);
  }

  async syncDispute(id: string) {
    return this.post<DisputeDetail>(`/disputes/${id}/sync`);
  }

  async saveDisputeEvidence(id: string, dto: SaveEvidenceInput) {
    return this.patch<DisputeDetail>(`/disputes/${id}/evidence`, dto);
  }

  async uploadDisputeDocument(
    id: string,
    evidenceType: DisputeEvidenceType,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<DisputeDocument> {
    const form = new FormData();
    form.append('evidence_type', evidenceType);
    form.append('file', file);
    const response = await this.client.post<ApiResponse<DisputeDocument>>(
      `/disputes/${id}/evidence/documents`,
      form,
      {
        headers: { 'Content-Type': undefined } as any,
        onUploadProgress: (event) => {
          if (event.total && onProgress) {
            onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        },
      },
    );
    return response.data.data as DisputeDocument;
  }

  async submitDisputeEvidence(id: string) {
    return this.post<DisputeDetail>(`/disputes/${id}/evidence/submit`);
  }

  async closeDispute(id: string) {
    return this.post<DisputeDetail>(`/disputes/${id}/close`);
  }

  /** Public — published pages only (no auth). */
  async listPublishedPages() {
    return this.get<PageSummary[]>('/public/pages');
  }

  /** Public — a single published page by slug (no auth). */
  async getPublishedPage(slug: string) {
    return this.get<CmsPage>(`/public/pages/${slug}`);
  }

  // ============================================================
  // ANALYTICS (admin: /analytics)
  // ============================================================

  async getRevenueReport(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    return this.get<RevenueReport>('/analytics/revenue', { period });
  }

  async getRefundReport() {
    return this.get<RefundReport>('/analytics/refunds');
  }

  async exportPaymentsCsv(from: string, to: string): Promise<Blob> {
    const response = await this.client.get('/analytics/export', {
      params: { from, to },
      responseType: 'blob',
    });
    return response.data as Blob;
  }

  async getReconciliation(from: string, to: string) {
    return this.get<ReconciliationResult>('/analytics/reconciliation', { from, to });
  }

  // ============================================================
  // ADMIN OPS & ACTIVITY (GAP-08)
  // ============================================================

  async getAdminPayments(params?: {
    status?: string;
    event_id?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    // Needs the envelope's `meta` for pagination, so bypass this.get() which unwraps to `data`.
    const res = await this.client.get<ApiResponse<any[]> & { meta?: any }>('/admin/payments', {
      params: this.cleanParams(params),
    });
    return { data: res.data.data ?? [], meta: res.data.meta };
  }

  async getAdminPaymentDetail(id: string) {
    return this.get<any>(`/admin/payments/${id}`);
  }

  async adminRefundPayment(id: string, note: string) {
    return this.post<any>(`/admin/payments/${id}/refund`, { note });
  }

  async getActivityFeed(params?: {
    model?: string;
    action?: string;
    target_id?: string;
    actor_id?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    // Needs the envelope's `meta` for pagination, so bypass this.get() which unwraps to `data`.
    const res = await this.client.get<ApiResponse<any[]> & { meta?: any }>('/admin/activity', {
      params: this.cleanParams(params),
    });
    return { data: res.data.data ?? [], meta: res.data.meta };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
