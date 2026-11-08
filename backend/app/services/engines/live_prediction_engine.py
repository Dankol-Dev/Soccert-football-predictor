"""Live prediction engine using current score and remaining-goals distribution."""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any

from app.services.advanced_prediction_engine import AdvancedPredictionEngine


class LivePredictionEngine:
    def __init__(self):
        self.active_matches: dict[str, dict[str, Any]] = {}
        self.scoreline_engine = AdvancedPredictionEngine()

    def update_match_state(self, match_id: str, state: dict[str, Any]) -> None:
        self.active_matches[match_id] = {
            **state,
            "last_updated": datetime.now(timezone.utc),
        }

    def calculate_momentum(self, state: dict[str, Any]) -> float:
        shots_home = state.get("shots_on_target_home", 0)
        shots_away = state.get("shots_on_target_away", 0)
        possession_home = state.get("possession_home", 50)
        corners_home = state.get("corners_home", 0)
        corners_away = state.get("corners_away", 0)

        momentum = 0.5
        total_shots = shots_home + shots_away
        if total_shots:
            momentum += 0.2 * (shots_home - shots_away) / total_shots
        momentum += 0.1 * (possession_home - 50) / 50
        total_corners = corners_home + corners_away
        if total_corners:
            momentum += 0.1 * (corners_home - corners_away) / total_corners
        return max(0.1, min(0.9, momentum))

    def predict_live(
        self,
        match_id: str,
        pre_match_xg_home: float,
        pre_match_xg_away: float,
    ) -> dict[str, Any]:
        state = self.active_matches.get(match_id, {})
        minute = max(0, min(90, int(state.get("minute", 0))))
        home_score = max(0, int(state.get("home_score", 0)))
        away_score = max(0, int(state.get("away_score", 0)))
        red_cards_home = state.get("red_cards_home", 0)
        red_cards_away = state.get("red_cards_away", 0)
        time_factor = max(0.1, (90 - minute) / 90)

        live_xg_home = pre_match_xg_home * time_factor * (1.0 - red_cards_away * 0.1)
        live_xg_away = pre_match_xg_away * time_factor * (1.0 - red_cards_home * 0.1)
        live_xg_home += state.get("shots_on_target_home", 0) * 0.15 * time_factor
        live_xg_away += state.get("shots_on_target_away", 0) * 0.15 * time_factor

        momentum = self.calculate_momentum(state)
        if momentum > 0.6:
            live_xg_home *= 1.1
        elif momentum < 0.4:
            live_xg_away *= 1.1
        live_xg_home = max(0.0, live_xg_home)
        live_xg_away = max(0.0, live_xg_away)

        scoreline_distribution = self.scoreline_engine.calculate_scoreline_distribution(
            live_xg_home, live_xg_away
        )
        final_scores = {
            tuple(map(int, score.split("-"))): probability
            for score, probability in scoreline_distribution.items()
        }
        home_probability = sum(
            probability
            for (home_goals, away_goals), probability in final_scores.items()
            if home_score + home_goals > away_score + away_goals
        )
        draw_probability = sum(
            probability
            for (home_goals, away_goals), probability in final_scores.items()
            if home_score + home_goals == away_score + away_goals
        )
        away_probability = max(0.0, 1.0 - home_probability - draw_probability)

        expected_total_goals = live_xg_home + live_xg_away
        no_goal_probability = math.exp(-expected_total_goals)
        goal_probability = 1.0 - no_goal_probability
        if expected_total_goals:
            next_home_goal = goal_probability * live_xg_home / expected_total_goals
            next_away_goal = goal_probability * live_xg_away / expected_total_goals
        else:
            next_home_goal = next_away_goal = 0.0

        most_likely_remaining_score = max(final_scores, key=final_scores.get)
        return {
            "match_id": match_id,
            "minute": minute,
            "live_xg_home": round(live_xg_home, 2),
            "live_xg_away": round(live_xg_away, 2),
            "momentum": round(momentum, 3),
            "live_probabilities": {
                "home_win": round(home_probability * 100, 1),
                "draw": round(draw_probability * 100, 1),
                "away_win": round(away_probability * 100, 1),
            },
            "next_goal_probability": {
                "home": round(next_home_goal * 100, 1),
                "away": round(next_away_goal * 100, 1),
                "none": round(no_goal_probability * 100, 1),
            },
            "updated_final_score_prediction": {
                "home": home_score + most_likely_remaining_score[0],
                "away": away_score + most_likely_remaining_score[1],
            },
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
