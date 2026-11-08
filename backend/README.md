# AI Football Predictor — Backend

FastAPI + PostgreSQL + JWT authentication. ML-ready.

## Stack

- **FastAPI** — async API framework
- **SQLAlchemy 2.0** — ORM
- **PostgreSQL** (via `psycopg`) — database
- **PyJWT + passlib/bcrypt** — JWT auth and password hashing
- **Pydantic v2** — request/response validation

## Project structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routers/        # route handlers (auth, matches, predictions, standings)
│   │   └── router.py       # aggregates all routers under /api/v1
│   ├── core/               # config, security (JWT/hash), dependencies
│   ├── db/                 # engine, session, init script
│   ├── models/             # SQLAlchemy ORM models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── services/           # business logic (auth + mock prediction service)
│   ├── utils/              # shared helpers
│   └── main.py             # FastAPI app entrypoint
├── tests/
├── requirements.txt
└── .env.example
```

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # configure database, JWT, and Supabase live-data settings
python -m app.db.init_db      # create tables
uvicorn app.main:app --reload --port 8000
```

API docs are available at `http://localhost:8000/docs`.

## Endpoints

| Method | Path                          | Auth | Description                |
|--------|-------------------------------|------|----------------------------|
| POST   | `/api/v1/auth/register`       | —    | Create account + tokens    |
| POST   | `/api/v1/auth/login`          | —    | Login, returns JWT tokens  |
| POST   | `/api/v1/auth/refresh`        | —    | Refresh access token       |
| GET    | `/api/v1/auth/me`             | JWT  | Current user profile       |
| GET    | `/api/v1/matches`             | —    | Live fixtures/results with filters |
| GET    | `/api/v1/matches/{id}`        | —    | Live fixture detail        |
| GET    | `/api/v1/predictions`         | —    | Predictions for scheduled live fixtures |
| GET    | `/api/v1/predictions/{id}`    | —    | Prediction for live fixture |
| GET    | `/api/v1/predictions/model`   | —    | Model version and metrics  |
| POST   | `/api/v1/predictions/batch`   | —    | Predict supplied fixtures  |
| GET    | `/api/v1/standings`           | —    | Live league standings      |
| GET    | `/api/v1/live/matches`        | —    | Current in-play fixtures   |
| GET    | `/api/v1/live/matches/{id}/predictions` | — | Live outcome forecast |
| POST   | `/api/v1/live/matches/{id}/state` | — | Submit bounded live event stats |
| GET    | `/health`                     | —    | Health check               |

## Live football data

Configure `FOOTBALL_DATA_FUNCTION_URL` and `SUPABASE_ANON_KEY` in the backend
`.env`. The Edge Function must have `FOOTBALL_DATA_API_KEY` set in Supabase
secrets. It fetches Premier League (`PL`), La Liga (`PD`), Serie A (`SA`), and
Bundesliga (`BL1`) data, caching fixtures for 90 seconds and standings for one
hour with stale-cache fallback. The provider key stays in Supabase and is never
sent to the browser. The Supabase cache migration must be applied.

`GET /api/v1/matches` accepts `competition`, comma-separated `status`,
`date_from`, and `date_to` filters. Responses include `data_stale`; stale or
partial responses are also described by `X-Data-Stale` and
`X-Data-Partial-Errors` headers. `GET /api/v1/standings?code=PL` accepts the
supported competition code or name.

Live fixtures and scores come from the provider. Live prediction baselines use
the trained model's expected goals and the current provider score. Since the
provider feed used here does not supply all match statistics, the optional
`POST /api/v1/live/matches/{id}/state` endpoint accepts bounded shots on target,
possession, corners, and red-card counts. Those extra statistics are held in
process memory and reset on restart; predictions remain approximate and should
not be treated as betting advice.

## Prediction model

Predictions are served only when a trained model artifact exists. The baseline
is a deterministic, venue-aware rolling-goals model: it estimates expected
home/away goals from recent team scoring and conceding records and constructs
a Poisson score distribution. Known team aliases are normalized between
historical data and provider fixture names. Teams without venue history use
league-average rates, and the prediction response includes a key-factor notice.
Temperature scaling is used only when rolling
holdout evaluation shows lower log loss without a worse Brier score. Otherwise,
the artifact leaves probabilities unscaled. The model uses no match ID,
current score, or future result as an input.

The training input is a historical results CSV with these exact columns:

```csv
date,competition,home_team,away_team,home_goals,away_goals
2024-08-16,Premier League,Manchester United,Fulham,1,0
```

Use final results only, consistent competition and team names, and ISO dates.
The evaluator groups fixtures by date and performs four expanding-window
folds. Each fold has a prior-history window, a calibration window, and a
subsequent holdout window; results from a date are only observed after all
matches on that date have been predicted. It reports aggregate and per-fold
log loss, Brier score, accuracy, and a training-frequency baseline. Calibration
is retained only when aggregate holdout log loss improves and Brier score does
not regress. The artifact records the fold report and selected temperature.

From the `backend/` directory, train an artifact with:

```bash
python -m scripts.train_prediction_model --data path/to/results.csv --output models/football-model.json
```

The artifact contains the model state, calibration temperature, holdout
metrics, training cutoff, and SHA-256 hash of the source CSV. Identical input
bytes and options produce the same artifact. Set `PREDICTION_MODEL_PATH` in
the backend environment to point the API at a different artifact. The model
is loaded on first use and cached for the process lifetime; restart the API
after replacing the artifact.

`GET /api/v1/predictions/model` reports model provenance and holdout metrics.
`POST /api/v1/predictions/batch` accepts fixtures and returns predictions.
The list and per-match prediction endpoints also use this artifact. If no model artifact is available, prediction endpoints return HTTP 503. List
and batch endpoints omit fixtures for competitions without trained history;
single-match prediction returns HTTP 503 for an untrained competition. Match
and standings routes use football-data.org through the cached Supabase Edge
Function. Prediction list/detail routes also use scheduled provider fixtures.
Prediction responses expose `top_outcome_probability` as
the probability of the most likely class, not a measured accuracy rate.

Run the model tests from `backend/` with:

```bash
python -m pytest
```
