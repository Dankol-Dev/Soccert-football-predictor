"""Live standings endpoint."""

from fastapi import APIRouter, HTTPException, Query, Response

from app.schemas import StandingsRowOut
from app.services import football_data_service
from app.services.football_data_service import FootballDataError

router = APIRouter(prefix="/standings", tags=["standings"])


@router.get("", response_model=list[StandingsRowOut])
async def list_standings(
    response: Response,
    competition: str = "Premier League",
    code: str | None = Query(None),
):
    try:
        rows, stale = await football_data_service.get_standings(code or competition)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if stale:
        response.headers["X-Data-Stale"] = "true"
    return rows
