import asyncio

import pytest

from app.services import football_data_service
from app.services.football_data_service import FootballDataError


def test_get_matches_maps_live_score_and_stale_flag(monkeypatch):
    async def fake_edge_request(resource, code=None):
        assert resource == "matches"
        return {
            "matches": [
                {
                    "competition": "Premier League",
                    "stale": True,
                    "data": {
                        "matches": [
                            {
                                "id": 123,
                                "status": "IN_PLAY",
                                "matchday": 8,
                                "utcDate": "2026-11-07T17:30:00Z",
                                "venue": "Example Ground",
                                "homeTeam": {
                                    "id": 1,
                                    "name": "Home FC",
                                    "shortName": "Home",
                                    "tla": "HOM",
                                    "crest": "https://example.test/home.png",
                                },
                                "awayTeam": {
                                    "id": 2,
                                    "name": "Away FC",
                                    "shortName": "Away",
                                    "tla": "AWY",
                                    "crest": "https://example.test/away.png",
                                },
                                "score": {"fullTime": {"home": 2, "away": 1}},
                            }
                        ]
                    },
                }
            ],
            "partialErrors": ["La Liga unavailable"],
        }

    monkeypatch.setattr(football_data_service, "_edge_request", fake_edge_request)
    matches, errors = asyncio.run(football_data_service.get_matches())

    assert len(matches) == 1
    assert matches[0].id == "fd-123"
    assert matches[0].status == "live"
    assert matches[0].home_score == 2
    assert matches[0].away_score == 1
    assert matches[0].data_stale is True
    assert errors == ["La Liga unavailable"]


def test_get_standings_maps_rows_and_staleness(monkeypatch):
    async def fake_edge_request(resource, code=None):
        assert resource == "standings"
        assert code == "PL"
        return {
            "stale": True,
            "data": {
                "standings": [
                    {
                        "table": [
                            {
                                "position": 1,
                                "team": {
                                    "id": 1,
                                    "name": "Home FC",
                                    "shortName": "Home",
                                    "tla": "HOM",
                                    "crest": "https://example.test/home.png",
                                },
                                "playedGames": 10,
                                "won": 7,
                                "draw": 2,
                                "lost": 1,
                                "goalsFor": 21,
                                "goalsAgainst": 9,
                                "goalDifference": 12,
                                "points": 23,
                                "form": "WWDLW",
                            }
                        ]
                    }
                ]
            },
        }

    monkeypatch.setattr(football_data_service, "_edge_request", fake_edge_request)
    rows, stale = asyncio.run(football_data_service.get_standings("Premier League"))

    assert len(rows) == 1
    assert rows[0].team.name == "Home FC"
    assert rows[0].team.form == ["W", "W", "D", "L", "W"]
    assert rows[0].points == 23
    assert stale is True


def test_competition_code_accepts_supported_names_and_codes():
    assert football_data_service.competition_code("la liga") == "PD"
    assert football_data_service.competition_code("SA") == "SA"
    with pytest.raises(FootballDataError) as error:
        football_data_service.competition_code("Champions League")
    assert error.value.status_code == 400


def test_live_prediction_probabilities_are_valid_and_sum_to_one():
    from app.services.engines.live_prediction_engine import LivePredictionEngine

    engine = LivePredictionEngine()
    engine.update_match_state(
        "fd-123",
        {
            "minute": 35,
            "home_score": 0,
            "away_score": 1,
            "shots_on_target_home": 3,
            "shots_on_target_away": 1,
            "possession_home": 58,
        },
    )
    result = engine.predict_live("fd-123", 1.6, 1.1)
    outcome_probabilities = result["live_probabilities"]
    next_goal_probabilities = result["next_goal_probability"]

    assert all(0 <= probability <= 100 for probability in outcome_probabilities.values())
    assert sum(outcome_probabilities.values()) == pytest.approx(100, abs=0.2)
    assert sum(next_goal_probabilities.values()) == pytest.approx(100, abs=0.2)


def test_live_state_schema_rejects_out_of_range_stats():
    from pydantic import ValidationError

    from app.schemas import LiveMatchStateIn

    with pytest.raises(ValidationError):
        LiveMatchStateIn(possession_home=101)
    with pytest.raises(ValidationError):
        LiveMatchStateIn(shots_on_target_home=-1)


def test_match_route_filters_live_data_and_sets_cache_headers(monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.schemas import MatchOut, TeamOut

    team = TeamOut(
        id="fd-1",
        name="Home FC",
        short_name="Home",
        logo="football",
        color="#64748b",
        form=[],
    )
    match = MatchOut(
        id="fd-10",
        competition="Premier League",
        season="2026/27",
        matchday=1,
        home_team=team,
        away_team=team,
        kickoff="2026-11-07T17:00:00Z",
        status="live",
        venue="TBD",
        home_score=1,
        away_score=0,
        data_stale=True,
    )

    async def fake_get_matches():
        return [match], ["La Liga unavailable"]

    monkeypatch.setattr(football_data_service, "get_matches", fake_get_matches)
    with TestClient(app) as client:
        response = client.get("/api/v1/matches?competition=PL&status=live&date_from=2026-11-07T16:00:00&date_to=2026-11-07T18:00:00")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == ["fd-10"]
    assert response.headers["x-data-stale"] == "true"
    assert "La Liga unavailable" in response.headers["x-data-partial-errors"]


def test_prediction_listing_and_detail_use_live_scheduled_fixtures(monkeypatch):
    from app.schemas import MatchOut, TeamOut
    from app.services import prediction_service

    team = TeamOut(
        id="fd-team",
        name="Home FC",
        short_name="Home",
        logo="football",
        color="#64748b",
        form=[],
    )
    scheduled = MatchOut(
        id="fd-scheduled",
        competition="Premier League",
        season="2026/27",
        matchday=1,
        home_team=team,
        away_team=team,
        kickoff="2026-11-07T17:00:00Z",
        status="scheduled",
        venue="TBD",
    )
    finished = scheduled.model_copy(update={"id": "fd-finished", "status": "finished"})

    async def fake_get_matches():
        return [scheduled, finished], []

    async def fake_get_match(match_id):
        return {scheduled.id: scheduled, finished.id: finished}.get(match_id)

    monkeypatch.setattr(football_data_service, "get_matches", fake_get_matches)
    monkeypatch.setattr(football_data_service, "get_match", fake_get_match)
    monkeypatch.setattr(prediction_service, "predict_match", lambda fixture: fixture.id)

    listed = asyncio.run(prediction_service.list_predictions())
    detail = asyncio.run(prediction_service.get_prediction("fd-scheduled"))
    finished_detail = asyncio.run(prediction_service.get_prediction("fd-finished"))

    assert listed == ["fd-scheduled"]
    assert detail == "fd-scheduled"
    assert finished_detail is None