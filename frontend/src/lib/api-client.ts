import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from 'axios';

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
    isActive: boolean;
    emailVerified: boolean;
    createdAt: string;
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
  message: string;
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
        return axiosError.response.data.message;
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

  // ============================================================
  // RBAC ENDPOINTS (see docs/api/rbac-openapi.yaml)
  // ============================================================

  /** Get sidebar menus for current user (cached 5min per roleCode). */
  async getMySidebar() {
    return this.get<any[]>('/menus/my-sidebar');
  }

  // ----- Roles -----
  async listRoles(filters?: { isActive?: boolean; includePermissions?: boolean }) {
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
  async listMenus(filters?: { isActive?: boolean }) {
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
  async getPermissionMatrix(filters?: { roleCode?: string; menuCode?: string }) {
    return this.get<any[]>('/permissions', filters as Record<string, unknown>);
  }
  async getRolePermissions(roleCode: string) {
    return this.get<any[]>(`/permissions/${roleCode}`);
  }
  async replaceRolePermissions(roleCode: string, cells: any[]) {
    return this.put<any>(`/permissions/${roleCode}`, { permissions: cells });
  }

  // ----- User Roles -----
  async getUserRole(userId: string) {
    return this.get<any>(`/users/${userId}/role`);
  }
  async assignUserRole(userId: string, roleCode: string) {
    return this.patch<any>(`/users/${userId}/role`, { roleCode });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
