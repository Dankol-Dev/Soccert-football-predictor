"""Provider-backed live fixtures and in-play predictions."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Response, status

from app.schemas import LiveMatchStateIn, MatchOut
from app.services import football_data_service
from app.services.engines.live_prediction_engine import LivePredictionEngine
from app.services.football_data_service import FootballDataError
from app.services import model_service

router = APIRouter(prefix="/live", tags=["live"])
live_engine = LivePredictionEngine()


@router.get("/matches", response_model=list[MatchOut])
async def list_live_matches(response: Response):
    try:
        matches, partial_errors = await football_data_service.get_matches()
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    live_matches = [match for match in matches if match.status == "live"]
    if any(match.data_stale for match in live_matches):
        response.headers["X-Data-Stale"] = "true"
    if partial_errors:
        response.headers["X-Data-Partial-Errors"] = " | ".join(str(error) for error in partial_errors)
    return live_matches


@router.post("/matches/{match_id}/state")
async def update_match_state(match_id: str, state: LiveMatchStateIn) -> dict[str, str]:
    try:
        match = await football_data_service.get_match(match_id)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if not match or match.status != "live":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live match not found")

    authoritative_state = {
        key: value
        for key, value in state.model_dump(exclude_none=True).items()
        if key in {
            "shots_on_target_home",
            "shots_on_target_away",
            "possession_home",
            "corners_home",
            "corners_away",
            "red_cards_home",
            "red_cards_away",
        }
    }
    authoritative_state.update(
        home_score=match.home_score or 0,
        away_score=match.away_score or 0,
    )
    live_engine.update_match_state(match.id, authoritative_state)
    return {"status": "updated"}


@router.get("/matches/{match_id}/predictions")
async def get_live_predictions(
    match_id: str,
) -> dict[str, Any]:
    try:
        match = await football_data_service.get_match(match_id)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if not match or match.status != "live":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Live match not found")

    try:
        expected_goals = model_service.predict_expected_goals(
            match.competition, match.home_team.name, match.away_team.name
        )
    except (FileNotFoundError, model_service.ModelNotReadyError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error

    minute = match.minute
    if minute is None:
        elapsed = (datetime.now(timezone.utc) - match.kickoff).total_seconds() // 60
        minute = max(0, min(90, int(elapsed)))
    state = {
        **live_engine.active_matches.get(match.id, {}),
        "minute": minute,
        "home_score": match.home_score or 0,
        "away_score": match.away_score or 0,
    }
    live_engine.update_match_state(match.id, state)
    prediction = live_engine.predict_live(match.id, expected_goals["home"], expected_goals["away"])
    prediction.update(
        status=match.status,
        home_team=match.home_team.name,
        away_team=match.away_team.name,
        data_stale=match.data_stale,
    )
    return prediction
