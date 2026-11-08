"""Prediction operations over provider-backed fixtures."""

from app.schemas import MatchOut, MatchPredictionIn, PredictionOut
from app.services import football_data_service
from app.services.model_service import ModelNotReadyError, predict_match as _predict_match


def _prediction_input(match: MatchOut) -> MatchPredictionIn:
    return MatchPredictionIn(
        id=match.id,
        competition=match.competition,
        home_team=match.home_team.name,
        away_team=match.away_team.name,
    )


async def list_predictions(limit: int = 200) -> list[PredictionOut]:
    matches, _ = await football_data_service.get_matches()
    fixtures = [match for match in matches if match.status == "scheduled"][:limit]
    return predict_batch([_prediction_input(match) for match in fixtures])


async def get_prediction(match_id: str) -> PredictionOut | None:
    match = await football_data_service.get_match(match_id)
    if not match or match.status != "scheduled":
        return None
    return predict_match(_prediction_input(match))


def predict_batch(matches: list[MatchPredictionIn]) -> list[PredictionOut]:
    predictions = []
    for match in matches:
        try:
            predictions.append(predict_match(match))
        except ModelNotReadyError:
            continue
    return predictions


def predict_match(match: MatchPredictionIn) -> PredictionOut:
    return _predict_match(match)