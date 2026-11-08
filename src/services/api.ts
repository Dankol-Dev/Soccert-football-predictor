import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '@/constants';
import type { ApiError, AuthTokens, LoginPayload, RegisterPayload, User } from '@/types';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize errors into a consistent ApiError shape
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : 'Something went wrong. Please try again.');
    const apiError: ApiError = { message, status, code: error.code };
    return Promise.reject(apiError);
  }
);

// --- Auth service ---
// NOTE: The FastAPI backend is in /backend. Until it is deployed, these calls
// will fail and the app falls back to mock authentication in AuthContext.

export const authService = {
  async login(payload: LoginPayload): Promise<{ user: User; tokens: AuthTokens }> {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },
  async register(payload: RegisterPayload): Promise<{ user: User; tokens: AuthTokens }> {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },
  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data;
  },
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { data } = await api.post('/auth/refresh', { refreshToken });
    return data;
  },
};

// --- Prediction service (will hit the backend once deployed) ---
export const predictionService = {
  async listPredictions() {
    const { data } = await api.get('/predictions');
    return data;
  },
  async getPrediction(matchId: string) {
    const { data } = await api.get(`/predictions/${matchId}`);
    return data;
  },
};

// --- Match service ---
export const matchService = {
  async listMatches() {
    const { data } = await api.get('/matches');
    return data;
  },
  async getMatch(id: string) {
    const { data } = await api.get(`/matches/${id}`);
    return data;
  },
};
