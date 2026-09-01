import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'stayos_auth_token';

let onUnauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedCallback(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to securely store auth token');
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requiredPermission?: string;

  constructor(message: string, status: number, code?: string, requiredPermission?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requiredPermission = requiredPermission;
  }
}

export function getBaseUrl(overrideUrl?: string): string {
  const envUrl =
    overrideUrl !== undefined
      ? overrideUrl
      : (process.env as Record<string, string | undefined>)['EXPO_PUBLIC_API_URL'];

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // In production builds, missing API URL must fail explicitly
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (!isDev) {
    throw new ApiError(
      'Production API URL is not configured. Please set EXPO_PUBLIC_API_URL.',
      0,
      'CONFIG_ERROR'
    );
  }

  // Android emulator localhost alias for local development only
  return 'http://10.0.2.2:3000';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  timeoutMs?: number;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const timeoutMs = options.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 204) {
      return {} as T;
    }

    let responseData: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json().catch(() => ({}));
    } else {
      responseData = { message: await response.text().catch(() => '') };
    }

    if (!response.ok) {
      if (response.status === 401) {
        await clearAuthToken();
        if (onUnauthorizedCallback) {
          onUnauthorizedCallback();
        }
      }

      const errorMessage =
        responseData?.error ||
        responseData?.message ||
        `Request failed with status ${response.status}`;

      throw new ApiError(
        errorMessage,
        response.status,
        responseData?.code,
        responseData?.requiredPermission
      );
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request timeout. Please check network connection.', 408, 'TIMEOUT');
    }

    throw new ApiError(
      error.message || 'Unable to connect to server. Please check your network connection.',
      0,
      'NETWORK_ERROR'
    );
  }
}
