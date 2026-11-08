"""Load a trained artifact and create predictions for upcoming fixtures."""

from functools import lru_cache
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.schemas import KeyFactorOut, MatchPredictionIn, PredictionOut
from app.services.prediction_model import (
    MODEL_VERSION,
    ModelNotReadyError,
    load_artifact,
    predict_with_artifact,
)


@lru_cache(maxsize=1)
def _load_model(path: str):
    artifact_path = Path(path)
    if not artifact_path.is_file():
        raise FileNotFoundError(f"Prediction model artifact not found: {artifact_path}")
    return load_artifact(artifact_path)


def get_model() -> tuple[dict[str, object], object]:
    return _load_model(settings.PREDICTION_MODEL_PATH)


def get_model_info() -> dict[str, object]:
    artifact, _ = get_model()
    return {
        "model_version": artifact["model_version"],
        "trained_through": artifact["trained_through"],
        "training_matches": artifact["training_matches"],
        "input_sha256": artifact["input_sha256"],
        "evaluation": artifact["evaluation"],
    }


def predict_expected_goals(competition: str, home_team: str, away_team: str) -> dict[str, float]:
    artifact, model = get_model()
    prediction = predict_with_artifact(artifact, model, competition, home_team, away_team)
    return prediction["expected_goals"]

def predict_match(match: MatchPredictionIn) -> PredictionOut:
    artifact, model = get_model()
    prediction = predict_with_artifact(
        artifact,
        model,
        match.competition,
        match.home_team,
        match.away_team,
    )
    probabilities = prediction["probabilities"]
    home_probability, draw_probability, away_probability = probabilities
    outcome_index = max(range(3), key=probabilities.__getitem__)
    model_version = artifact.get("model_version", MODEL_VERSION)
    expected_goals = prediction["expected_goals"]
    has_team_history = prediction["has_team_history"]
    key_factors = [
        KeyFactorOut(
            label="Modelled expected goals",
            detail=(
                f"{match.home_team}: {expected_goals['home']:.2f}; "
                f"{match.away_team}: {expected_goals['away']:.2f}"
            ),
            weight="medium",
        )
    ]
    missing_teams = [
        name
        for name, has_history in zip(
            (match.home_team, match.away_team),
            (has_team_history["home"], has_team_history["away"]),
        )
        if not has_history
    ]
    if missing_teams:
        key_factors.append(
            KeyFactorOut(
                label="Limited team history",
                detail=(
                    f"League-average rates used for: {', '.join(missing_teams)}"
                ),
                weight="low",
            )
        )
    return PredictionOut(
        id=f"pred-{match.id}",
        match_id=match.id,
        home_win_prob=home_probability * 100,
        draw_prob=draw_probability * 100,
        away_win_prob=away_probability * 100,
        predicted_outcome=("home", "draw", "away")[outcome_index],
        predicted_score=prediction["predicted_score"],
        top_outcome_probability=max(probabilities) * 100,
        model_version=str(model_version),
        created_at=datetime.now(timezone.utc),
        key_factors=key_factors,
    )


__all__ = ["ModelNotReadyError", "get_model_info", "predict_match"]