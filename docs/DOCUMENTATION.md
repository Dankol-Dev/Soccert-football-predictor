# Soccert — Codebase Documentation

## Overview

Soccert is a football match prediction web app. It is a single-page React application (Vite + TypeScript) styled with Tailwind CSS. Match data comes from football-data.org via a Supabase Edge Function, predictions are computed by a backend service, and authentication is handled by Supabase Auth.

## Current Functionality

- Live match data for Premier League, La Liga, Serie A, Bundesliga via football-data.org (Supabase edge function proxy).
- Match predictions (home/draw/away probabilities, predicted score, top outcome, key factors) computed by backend `/predictions/batch`.
- Home page: hero + top prediction highlight + upcoming matches.
- Predictions page: filter by competition, search, prediction limit selector.
- Match detail page: match info, prediction card, team form guides.
- Dashboard (auth): standings (Premier League), upcoming matches, predictions overview.
- Auth: register/login/logout via Supabase Auth; protected routes.
- Profile page: view/edit name & email.
- Live refresh every 90s; stale-data indicator.
- Theme toggle (ThemeProvider), responsive layout, 404/500 pages.

## Tech Stack

- **Frontend:** React 18, React Router 7, TypeScript 5.5
- **Build:** Vite 5
- **Styling:** Tailwind CSS 3, PostCSS
- **HTTP:** Axios (backend API), fetch (Supabase edge function)
- **Backend client:** @supabase/supabase-js
- **Icons:** lucide-react
- **Linting:** ESLint 9, typescript-eslint
- **Backend (optional):** FastAPI in `/backend`

## Project Structure

```
src/
  App.tsx              # Router + providers
  main.tsx             # Entry point
  constants/index.ts   # App constants, routes, competitions
  types/index.ts       # Domain types
  context/             # AuthContext, ThemeContext
  hooks/               # useAsync, useLiveFootballData
  services/            # api (axios), footballData, supabase
  pages/               # Route components
  components/          # layout, matches, predictions, teams, ui
  utils/index.ts
supabase/functions/football-data/   # Edge function proxy
backend/               # FastAPI service (optional)
```

## Routing

Defined in `src/App.tsx` via `createBrowserRouter`. Routes (from `src/constants`):

- `/` Home
- `/predictions` Predictions
- `/matches/:matchId` Match detail
- `/dashboard` (protected)
- `/profile` (protected)
- `/login`, `/register` (auth layout)
- `/500`, `*` (404)

`ProtectedRoute` guards authenticated routes; `AuthLayout` / `MainLayout` wrap pages.

## Authentication

`AuthContext` uses Supabase Auth (`supabase.auth`). Exposes `user`, `isAuthenticated`, `isLoading`, `login`, `register`, `logout`. Maps Supabase user to app `User`. The FastAPI backend path (`authService` in `services/api.ts`) is currently unused (mock/fallback note).

## Data Flow

`useLiveFootballData` (hook) polls every 90s:
1. `getMatches()` calls Supabase edge function `football-data?resource=matches`, maps football-data.org responses to `Match[]`.
2. `getPredictions(matches)` POSTs scheduled matches to `${API_BASE_URL}/predictions/batch`, maps `ApiPrediction` to `Prediction`.

Standings fetched separately via `getStandings` / `getStandingsByCompetition`.

## Services

- `services/supabase.ts` — Supabase client (requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- `services/footballData.ts` — football-data.org adapter + prediction batch client.
- `services/api.ts` — Axios instance with auth interceptor + backend service stubs.

## Environment Variables

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (default `http://localhost:8000/api/v1`)

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run preview` — preview build

## How Predictions Are Found & Calculated

### Discovery (frontend)
- `useLiveFootballData` polls `getMatches()` every 90s. Matches come from football-data.org via Supabase edge function `football-data?resource=matches`.
- For each scheduled match, `getPredictions()` POSTs a batch (up to 200 at a time) to backend `${API_BASE_URL}/predictions/batch` with `{id, competition, home_team, away_team}`.
- Backend (`prediction_service.predict_batch`) calls `model_service.predict_match` per match; returns `PredictionOut`. Frontend maps snake_case to `Prediction`.

### Model (backend)
- `RollingPoissonModel` (poisson-rolling-v1): venue-aware rolling goals. League home/away rates from last 380 matches (shrunk toward defaults 1.45/1.15 with prior weight 5.0). Per-team attack/defence ratios from last 20 home/away matches, shrunk toward league rate.
- Expected goals: `home_rate * home_attack * away_defence`, `away_rate * away_attack * home_defence`, clamped [0.05, 5.0].
- Score distribution: independent Poisson for home/away up to 10 goals; outcomes summed; best score = highest cell mass. Probabilities normalized. Predicted outcome = argmax(home/draw/away).
- Temperature scaling: calibration temperature (median across 4 folds if it improves log loss & brier) applied to probabilities.
- Artifact trained on historical CSV (`backend/data/historical_results.csv`) up to `trained_through`, saved as `backend/models/football-model.json`. Walk-forward evaluation with 4 folds.
- Missing team history → league-average rates used (flagged in key factors).

See `src/types/index.ts`: `Competition`, `Match`, `MatchStatus`, `Prediction`, `PredictionOutcome`, `Team`, `StandingsRow`, `User`, `AuthTokens`, `ApiError`, etc.

## Supabase Edge Function

`supabase/functions/football-data/index.ts` proxies football-data.org, supports `resource=matches` and `resource=standings&code=...`.
" filePath">
D:\Projects\New folder\football_predictor\Version 4\docs\DOCUMENTATION.md
## Recommended Upgrades (Roadmap)

### Advanced Statistical Engine
- xG model, Poisson scoreline with Dixon-Coles, Elo ratings, ML (XGBoost/LightGBM/CatBoost), market probability vs bookmaker consensus.

### Expanded Team Form Analytics
- Last 5/10 matches, home/away splits, goals scored/conceded, xG/xGA, shots on target, possession, clean sheets, BTTS%, Over 2.5%, first/second-half goals, H2H, vs similarly ranked, streaks, consistency, defensive weaknesses, avg goals/match.

### Squad Strength Adjustment
- Injuries, suspensions, doubtful, expected/confirmed XI, goalkeeper/key defender/attacker availability, player form, rotation; distinguish confirmed vs rumours.

### Match Context Engine
- Home advantage, rest days, congestion, travel, weather, motivation, competition, manager changes, referee stats; apply only with reliable data.

### Expanded Markets
- 1X2, double chance, draw no bet; O/U 0.5/1.5/2.5/3.5; BTTS, first/second-half, correct score, team totals, Asian handicap, clean sheet � all derived from scoreline distribution.

### Soccert Intelligence
- Per-prediction explanations; distinguish probability vs confidence vs data quality.

### Live Prediction Engine
- Separate engine: live score, minute, cards, subs, shots, possession, corners, live xG, momentum, live O/U & next-goal & updated final score.

### Performance Tracking
- Store all predictions; track accuracy, Brier, log loss by market/competition/confidence/probability range; calibration; baselines; chronological backtesting.

### Recommended Backend Architecture
- React+TS frontend; FastAPI gateway (auth/match/prediction/analytics); data collection; statistical engine; ML engine; live engine; value engine; performance engine; Supabase/PostgreSQL.
