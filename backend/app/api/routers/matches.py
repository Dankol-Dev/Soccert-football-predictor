"""Live match list and detail endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.schemas import MatchOut
from app.services import football_data_service
from app.services.football_data_service import FootballDataError

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get(
    "",
    response_model=list[MatchOut],
    summary="List live match fixtures",
    description="Returns current fixtures and results from football-data.org through the cached Supabase Edge Function.",
)
async def list_matches(
    response: Response,
    competition: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    date_from: datetime | None = None,
    date_to: datetime | None = None,
):
    try:
        matches, partial_errors = await football_data_service.get_matches()
        if date_from and date_from.tzinfo is None:
            date_from = date_from.replace(tzinfo=timezone.utc)
        if date_to and date_to.tzinfo is None:
            date_to = date_to.replace(tzinfo=timezone.utc)
        if competition:
            code = football_data_service.competition_code(competition)
            competition_name = football_data_service.COMPETITIONS[code]
            matches = [match for match in matches if match.competition == competition_name]
        if status_filter:
            statuses = {value.strip().lower() for value in status_filter.split(",") if value.strip()}
            valid_statuses = {"scheduled", "live", "finished", "suspended", "postponed", "cancelled", "awarded"}
            invalid_statuses = statuses - valid_statuses
            if invalid_statuses:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Unsupported match status: {', '.join(sorted(invalid_statuses))}",
                )
            matches = [match for match in matches if match.status in statuses]
        if date_from and date_to and date_from > date_to:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="date_from must be earlier than or equal to date_to",
            )
        if date_from:
            matches = [match for match in matches if match.kickoff >= date_from]
        if date_to:
            matches = [match for match in matches if match.kickoff <= date_to]
        if partial_errors:
            response.headers["X-Data-Partial-Errors"] = " | ".join(str(error) for error in partial_errors)
        if any(match.data_stale for match in matches):
            response.headers["X-Data-Stale"] = "true"
        return matches
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(match_id: str):
    try:
        match = await football_data_service.get_match(match_id)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match
