export const APP_NAME = 'Soccert';
export const APP_TAGLINE = 'Data driven match predictions';
export const APP_DESCRIPTION =
  'Soccert uses historical match results to estimate football score distributions and outcome probabilities.';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'afp_access_token',
  refreshToken: 'afp_refresh_token',
  user: 'afp_user',
} as const;

export const ROUTES = {
  HOME: '/',
  PREDICTIONS: '/predictions',
  MATCH_DETAIL: '/matches/:matchId',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
  NOT_FOUND: '/404',
  SERVER_ERROR: '/500',
} as const;

export const COMPETITIONS = [
  'Premier League',
  'La Liga',
  'Serie A',
  'Bundesliga',
] as const;

export const NAV_LINKS = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Predictions', to: ROUTES.PREDICTIONS },
  { label: 'Dashboard', to: ROUTES.DASHBOARD },
] as const;
