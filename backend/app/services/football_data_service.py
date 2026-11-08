"""Football-data.org integration through the cached Supabase Edge Function."""

from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import settings
from app.schemas import MatchOut, StandingsRowOut, TeamOut

TEAM_COLORS = {"ARS": "#ef4444", "LIV": "#c2410c", "MCI": "#3b82f6", "CHE": "#2563eb", "MUN": "#dc2626", "RMA": "#f1f5f9", "BAR": "#1e3a8a", "BAY": "#dc2626", "BVB": "#facc15"}
COMPETITIONS = {
    "PL": "Premier League",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
}
CODE_BY_COMPETITION = {name.casefold(): code for code, name in COMPETITIONS.items()}
STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "LIVE": "live",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "FINISHED": "finished",
    "SUSPENDED": "suspended",
    "POSTPONED": "postponed",
    "CANCELLED": "cancelled",
    "AWARDED": "awarded",
}


class FootballDataError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def competition_code(value: str) -> str:
    normalized = value.strip()
    if normalized.upper() in COMPETITIONS:
        return normalized.upper()
    code = CODE_BY_COMPETITION.get(normalized.casefold())
    if not code:
        raise FootballDataError(f"Unsupported competition: {value}", status_code=400)
    return code


def _team(payload: dict[str, Any] | None) -> TeamOut | None:
    if not payload or payload.get("id") is None or not payload.get("name"):
        return None
    short_name = payload.get("shortName") or payload.get("tla") or payload["name"]
    return TeamOut(
        id=f"fd-{payload['id']}",
        name=payload["name"],
        short_name=short_name,
        logo=payload.get("crest") or "\u26bd",
        color=TEAM_COLORS.get(payload.get("tla", ""), "#64748b"),
        form=[],
    )


def _season(kickoff: datetime) -> str:
    start_year = kickoff.year if kickoff.month >= 7 else kickoff.year - 1
    return f"{start_year}/{str(start_year + 1)[-2:]}"


def _parse_match(payload: dict[str, Any], competition: str, stale: bool) -> MatchOut | None:
    home = _team(payload.get("homeTeam"))
    away = _team(payload.get("awayTeam"))
    kickoff_text = payload.get("utcDate")
    if not home or not away or not kickoff_text:
        return None

    kickoff = datetime.fromisoformat(kickoff_text.replace("Z", "+00:00"))
    score = payload.get("score") or {}
    full_time = score.get("fullTime") or {}
    raw_status = payload.get("status", "SCHEDULED")
    status = STATUS_MAP.get(raw_status, "scheduled")
    match_id = str(payload.get("id", ""))
    if not match_id:
        return None

    return MatchOut(
        id=match_id if match_id.startswith("fd-") else f"fd-{match_id}",
        competition=competition,
        season=_season(kickoff),
        matchday=payload.get("matchday") or 0,
        home_team=home,
        away_team=away,
        kickoff=kickoff,
        status=status,
        venue=payload.get("venue") or "TBD",
        home_score=full_time.get("home"),
        away_score=full_time.get("away"),
        minute=payload.get("minute"),
        data_stale=stale,
    )


async def _edge_request(resource: str, code: str | None = None) -> dict[str, Any]:
    function_url = settings.FOOTBALL_DATA_FUNCTION_URL
    anon_key = settings.SUPABASE_ANON_KEY
    if not function_url or not anon_key:
        raise FootballDataError(
            "Live football data is not configured. Set FOOTBALL_DATA_FUNCTION_URL and SUPABASE_ANON_KEY.",
            status_code=503,
        )

    params = {"resource": resource}
    if code:
        params["code"] = code
    headers = {"Authorization": f"Bearer {anon_key}", "apikey": anon_key}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(function_url, params=params, headers=headers)
    except httpx.RequestError as exc:
        raise FootballDataError("Unable to reach the live football-data service.", 502) from exc

    try:
        body = response.json()
    except ValueError as exc:
        raise FootballDataError("Live football-data service returned invalid JSON.", 502) from exc

    if response.is_error:
        message = body.get("error") if isinstance(body, dict) else None
        status_code = 503 if response.status_code == 503 else 502
        raise FootballDataError(message or "Live football-data request failed.", status_code)
    if not isinstance(body, dict):
        raise FootballDataError("Live football-data service returned an invalid response.", 502)
    return body


async def get_matches() -> tuple[list[MatchOut], list[str]]:
    body = await _edge_request("matches")
    entries = body.get("matches")
    if not isinstance(entries, list):
        raise FootballDataError("Live football-data response did not contain matches.", 502)

    matches: list[MatchOut] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        competition = entry.get("competition")
        data = entry.get("data")
        provider_matches = data.get("matches") if isinstance(data, dict) else None
        if not isinstance(competition, str) or not isinstance(provider_matches, list):
            continue
        stale = entry.get("stale") is True
        for item in provider_matches:
            if isinstance(item, dict):
                match = _parse_match(item, competition, stale)
                if match:
                    matches.append(match)

    matches.sort(key=lambda match: match.kickoff)
    errors = body.get("partialErrors")
    return matches, errors if isinstance(errors, list) else []


async def get_match(match_id: str) -> MatchOut | None:
    matches, _ = await get_matches()
    normalized_id = match_id if match_id.startswith("fd-") else f"fd-{match_id}"
    return next((match for match in matches if match.id == normalized_id), None)


async def get_standings(competition: str) -> tuple[list[StandingsRowOut], bool]:
    code = competition_code(competition)
    body = await _edge_request("standings", code)
    data = body.get("data")
    standings = data.get("standings") if isinstance(data, dict) else None
    tables = standings[0].get("table") if isinstance(standings, list) and standings else None
    if not isinstance(tables, list):
        raise FootballDataError("Live football-data response did not contain a standings table.", 502)

    rows: list[StandingsRowOut] = []
    for item in tables:
        if not isinstance(item, dict):
            continue
        team = _team(item.get("team"))
        if not team:
            continue
        form = item.get("form")
        if isinstance(form, str):
            team.form = [letter for letter in form if letter in {"W", "D", "L"}]
        rows.append(
            StandingsRowOut(
                position=item.get("position", 0),
                team=team,
                played=item.get("playedGames", 0),
                won=item.get("won", 0),
                drawn=item.get("draw", 0),
                lost=item.get("lost", 0),
                goals_for=item.get("goalsFor", 0),
                goals_against=item.get("goalsAgainst", 0),
                goal_difference=item.get("goalDifference", 0),
                points=item.get("points", 0),
            )
        )

    return rows, body.get("stale") is True
