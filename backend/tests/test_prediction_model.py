from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import DEFAULT_JWT_SECRET_KEY, Settings, settings
from app.main import app
from app.services import model_service
from app.services.prediction_model import (
    MatchResult,
    ModelNotReadyError,
    RollingPoissonModel,
    evaluate_walk_forward,
    load_artifact,
    predict_with_artifact,
    train_artifact,
    _calibration_improves,
)
from app.services.team_names import canonical_team_name


def sample_results(days: int = 20) -> list[MatchResult]:
    teams = ["Arsenal", "Brighton", "Chelsea", "Everton"]
    results = []
    start = date(2025, 1, 1)
    for day in range(days):
        first = day % len(teams)
        second = (day + 1) % len(teams)
        third = (day + 2) % len(teams)
        fourth = (day + 3) % len(teams)
        results.extend(
            [
                MatchResult(
                    start + timedelta(days=day),
                    "Premier League",
                    teams[first],
                    teams[second],
                    day % 3,
                    (day + 1) % 2,
                ),
                MatchResult(
                    start + timedelta(days=day),
                    "Premier League",
                    teams[third],
                    teams[fourth],
                    (day + 1) % 2,
                    day % 3,
                ),
            ]
        )
    return results


def write_csv(path, results):
    path.write_text(
        "date,competition,home_team,away_team,home_goals,away_goals\n"
        + "".join(
            f"{item.match_date},{item.competition},{item.home_team},{item.away_team},"
            f"{item.home_goals},{item.away_goals}\n"
            for item in results
        ),
        encoding="utf-8",
    )


def test_model_requires_competition_history():
    with pytest.raises(ModelNotReadyError):
        RollingPoissonModel().predict("Premier League", "Arsenal", "Chelsea")


def test_non_development_requires_strong_jwt_secret():
    with pytest.raises(ValidationError, match="JWT_SECRET_KEY"):
        Settings(ENVIRONMENT="production", JWT_SECRET_KEY=DEFAULT_JWT_SECRET_KEY)
    assert Settings(
        ENVIRONMENT="production", JWT_SECRET_KEY="r" * 48
    ).JWT_SECRET_KEY == "r" * 48


def test_common_historical_and_live_team_aliases_normalize():
    aliases = [
        ("Premier League", "AFC Bournemouth", "Bournemouth"),
        ("Premier League", "Manchester City FC", "Man City"),
        ("La Liga", "Athletic Club", "Ath Bilbao"),
        ("Serie A", "FC Internazionale Milano", "Inter"),
        ("Bundesliga", "FC Bayern München", "Bayern Munich"),
    ]
    for competition, live_name, historical_name in aliases:
        assert canonical_team_name(competition, live_name) == canonical_team_name(
            competition, historical_name
        )


def test_prediction_identifies_teams_without_venue_history():
    model = RollingPoissonModel()
    for result in sample_results(8):
        model.observe(result)

    _, _, _, has_team_history = model.predict(
        "Premier League", "Newly Promoted FC", "Another New Club"
    )
    assert has_team_history == (False, False)

def test_model_probabilities_and_round_trip_are_deterministic():
    model = RollingPoissonModel()
    for result in sample_results(8):
        model.observe(result)

    expected = model.predict("Premier League", "Arsenal", "Chelsea")
    restored = RollingPoissonModel.from_dict(model.to_dict())
    assert restored.predict("Premier League", "Arsenal", "Chelsea") == expected
    assert sum(expected[0]) == pytest.approx(1.0)
    assert all(0 <= value <= 1 for value in expected[0])
    assert expected[2][0] > 0 and expected[2][1] > 0


def test_walk_forward_uses_separate_calibration_and_holdout():
    evaluation = evaluate_walk_forward(sample_results())
    split = evaluation["split"]
    assert split["fold_count"] == 4
    assert split["initial_train_dates"] > 0
    assert split["calibration_dates_per_fold"] > 0
    assert split["holdout_dates_per_fold"] > 0
    assert evaluation["calibration_matches"] > 0
    assert evaluation["holdout"]["uncalibrated"]["matches"] > 0
    assert evaluation["holdout"]["calibrated"]["matches"] == evaluation["holdout"]["uncalibrated"]["matches"]
    assert len(evaluation["folds"]) == 4
    assert evaluation["calibration_applied"] == (
        _calibration_improves(
            evaluation["holdout"]["calibrated"],
            evaluation["holdout"]["uncalibrated"],
        )
    )
    assert evaluation["baselines"]["training_frequency"]["matches"] == evaluation["holdout"]["uncalibrated"]["matches"]


def test_calibration_must_improve_log_loss_without_brier_regression():
    uncalibrated = {"log_loss": 1.0, "brier_score": 0.6}
    assert _calibration_improves(
        {"log_loss": 0.99, "brier_score": 0.59}, uncalibrated
    )
    assert not _calibration_improves(
        {"log_loss": 0.99, "brier_score": 0.61}, uncalibrated
    )
    assert not _calibration_improves(
        {"log_loss": 1.01, "brier_score": 0.59}, uncalibrated
    )


def test_training_artifact_is_reproducible_and_predictable(tmp_path):
    data = tmp_path / "results.csv"
    first_path = tmp_path / "first.json"
    second_path = tmp_path / "second.json"
    write_csv(data, sample_results())

    first = train_artifact(data, first_path)
    second = train_artifact(data, second_path)

    assert first_path.read_bytes() == second_path.read_bytes()
    assert first["input_sha256"] == second["input_sha256"]
    artifact, model = load_artifact(first_path)
    prediction = predict_with_artifact(
        artifact, model, "Premier League", "Arsenal", "Chelsea"
    )
    assert sum(prediction["probabilities"]) == pytest.approx(1.0)
    assert prediction["predicted_score"]["home"] >= 0


def test_walk_forward_requires_enough_dates():
    with pytest.raises(ValueError, match="Not enough distinct match dates"):
        evaluate_walk_forward(sample_results(4))


def test_batch_prediction_api_uses_trained_artifact(tmp_path, monkeypatch):
    data = tmp_path / "results.csv"
    artifact_path = tmp_path / "model.json"
    write_csv(data, sample_results())
    train_artifact(data, artifact_path)
    monkeypatch.setattr(settings, "PREDICTION_MODEL_PATH", str(artifact_path))
    model_service._load_model.cache_clear()

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/predictions/batch",
                json={
                    "matches": [
                        {
                            "id": "fixture-1",
                            "competition": "Premier League",
                            "home_team": "Arsenal",
                            "away_team": "Chelsea",
                        },
                        {
                            "id": "fixture-2",
                            "competition": "La Liga",
                            "home_team": "Barcelona",
                            "away_team": "Real Madrid",
                        },
                    ]
                },
            )
    finally:
        model_service._load_model.cache_clear()

    assert response.status_code == 200
    assert len(response.json()) == 1
    prediction = response.json()[0]
    assert prediction["match_id"] == "fixture-1"
    assert prediction["model_version"] == "poisson-rolling-v1"
    assert 0 <= prediction["top_outcome_probability"] <= 100
    assert sum(
        prediction[key] for key in ("home_win_prob", "draw_prob", "away_win_prob")
    ) == pytest.approx(100.0)


def test_prediction_api_reports_missing_artifact_as_unavailable(tmp_path, monkeypatch):
    from app.schemas import MatchOut, TeamOut
    from app.services import football_data_service

    monkeypatch.setattr(
        settings, "PREDICTION_MODEL_PATH", str(tmp_path / "missing-model.json")
    )
    model_service._load_model.cache_clear()
    team = TeamOut(
        id="fd-team",
        name="Home FC",
        short_name="Home",
        logo="football",
        color="#64748b",
        form=[],
    )
    match = MatchOut(
        id="fd-1",
        competition="Premier League",
        season="2026/27",
        matchday=1,
        home_team=team,
        away_team=team,
        kickoff="2026-11-07T17:00:00Z",
        status="scheduled",
        venue="TBD",
    )

    async def fake_get_matches():
        return [match], []

    async def fake_get_match(match_id):
        return match if match_id == match.id else None

    monkeypatch.setattr(football_data_service, "get_matches", fake_get_matches)
    monkeypatch.setattr(football_data_service, "get_match", fake_get_match)
    try:
        with TestClient(app) as client:
            list_response = client.get("/api/v1/predictions")
            detail_response = client.get("/api/v1/predictions/fd-1")
    finally:
        model_service._load_model.cache_clear()

    assert list_response.status_code == 503
    assert detail_response.status_code == 503
    assert "artifact not found" in detail_response.json()["detail"]

def test_match_routes_are_documented_as_live_data():
    with TestClient(app) as client:
        openapi = client.get("/openapi.json").json()

    route = openapi["paths"]["/api/v1/matches"]["get"]
    assert "live" in route["summary"].lower()
    assert "football-data.org" in route["description"].lower()