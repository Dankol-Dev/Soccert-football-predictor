"""Deterministic rolling-goals model and chronological evaluation tools."""

from __future__ import annotations

import csv
import hashlib
import json
import math
from collections import Counter, deque
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from statistics import median
from typing import Iterable

from app.services.team_names import canonical_team_name


MODEL_VERSION = "poisson-rolling-v1"
ARTIFACT_SCHEMA_VERSION = 1
DEFAULT_HOME_GOALS = 1.45
DEFAULT_AWAY_GOALS = 1.15
GOAL_CAP = 10


class ModelNotReadyError(ValueError):
    """Raised when no trained history exists for a requested competition."""


@dataclass(frozen=True, order=True)
class MatchResult:
    match_date: date
    competition: str
    home_team: str
    away_team: str
    home_goals: int
    away_goals: int


def load_results(path: str | Path) -> tuple[list[MatchResult], str]:
    """Load a canonical CSV and return sorted results plus its content hash.

    Required columns: date, competition, home_team, away_team, home_goals,
    away_goals. Dates must use ISO YYYY-MM-DD format.
    """
    source = Path(path)
    raw = source.read_bytes()
    results: list[MatchResult] = []
    with source.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {
            "date",
            "competition",
            "home_team",
            "away_team",
            "home_goals",
            "away_goals",
        }
        missing = required.difference(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing CSV columns: {', '.join(sorted(missing))}")

        for line_number, row in enumerate(reader, start=2):
            try:
                result = MatchResult(
                    match_date=date.fromisoformat(row["date"].strip()),
                    competition=row["competition"].strip(),
                    home_team=canonical_team_name(
                        row["competition"].strip(), row["home_team"].strip()
                    ),
                    away_team=canonical_team_name(
                        row["competition"].strip(), row["away_team"].strip()
                    ),
                    home_goals=int(row["home_goals"]),
                    away_goals=int(row["away_goals"]),
                )
            except (AttributeError, TypeError, ValueError) as error:
                raise ValueError(f"Invalid result on CSV line {line_number}: {error}") from error
            if not all((result.competition, result.home_team, result.away_team)):
                raise ValueError(f"Missing team or competition on CSV line {line_number}")
            if result.home_team == result.away_team:
                raise ValueError(f"A team cannot play itself on CSV line {line_number}")
            if result.home_goals < 0 or result.away_goals < 0:
                raise ValueError(f"Goals cannot be negative on CSV line {line_number}")
            results.append(result)

    if not results:
        raise ValueError("The results CSV contains no matches")
    results.sort()
    return results, hashlib.sha256(raw).hexdigest()


class RollingPoissonModel:
    """Venue-aware team goal rates shrunk toward competition scoring averages."""

    def __init__(
        self,
        window: int = 20,
        prior_weight: float = 5.0,
        league_window: int = 380,
    ) -> None:
        if window < 1 or prior_weight <= 0 or league_window < 1:
            raise ValueError("window and league_window must be positive; prior_weight must be > 0")
        self.window = window
        self.prior_weight = prior_weight
        self.league_window = league_window
        self.league_history: dict[str, deque[tuple[int, int]]] = {}
        self.team_history: dict[str, dict[str, dict[str, deque[tuple[int, int]]]]] = {}

    def observe(self, result: MatchResult) -> None:
        home_team = canonical_team_name(result.competition, result.home_team)
        away_team = canonical_team_name(result.competition, result.away_team)
        league = self.league_history.setdefault(
            result.competition, deque(maxlen=self.league_window)
        )
        league.append((result.home_goals, result.away_goals))
        teams = self.team_history.setdefault(result.competition, {})
        home = teams.setdefault(home_team, {})
        away = teams.setdefault(away_team, {})
        home.setdefault("home", deque(maxlen=self.window)).append(
            (result.home_goals, result.away_goals)
        )
        away.setdefault("away", deque(maxlen=self.window)).append(
            (result.away_goals, result.home_goals)
        )

    def predict(
        self, competition: str, home_team: str, away_team: str
    ) -> tuple[
        tuple[float, float, float],
        tuple[int, int],
        tuple[float, float],
        tuple[bool, bool],
    ]:
        home_team = canonical_team_name(competition, home_team)
        away_team = canonical_team_name(competition, away_team)
        if home_team == away_team:
            raise ValueError("Home and away teams must differ")
        history = self.league_history.get(competition)
        if not history:
            raise ModelNotReadyError(f"No trained results for {competition}")

        home_rate = self._smoothed_mean(
            [home for home, _ in history], DEFAULT_HOME_GOALS
        )
        away_rate = self._smoothed_mean(
            [away for _, away in history], DEFAULT_AWAY_GOALS
        )
        teams = self.team_history.get(competition, {})
        home_stats = teams.get(home_team, {}).get("home", ())
        away_stats = teams.get(away_team, {}).get("away", ())

        home_attack = self._smoothed_mean(
            [scored for scored, _ in home_stats], home_rate
        ) / home_rate
        away_defence = self._smoothed_mean(
            [conceded for _, conceded in away_stats], home_rate
        ) / home_rate
        away_attack = self._smoothed_mean(
            [scored for scored, _ in away_stats], away_rate
        ) / away_rate
        home_defence = self._smoothed_mean(
            [conceded for _, conceded in home_stats], away_rate
        ) / away_rate

        expected_home = min(5.0, max(0.05, home_rate * home_attack * away_defence))
        expected_away = min(5.0, max(0.05, away_rate * away_attack * home_defence))
        probabilities, score = self._score_distribution(expected_home, expected_away)
        return (
            probabilities,
            score,
            (expected_home, expected_away),
            (bool(home_stats), bool(away_stats)),
        )

    def _smoothed_mean(self, values: Iterable[int], prior: float) -> float:
        values = list(values)
        return (sum(values) + self.prior_weight * prior) / (
            len(values) + self.prior_weight
        )

    @staticmethod
    def _poisson(rate: float) -> list[float]:
        probabilities = [math.exp(-rate)]
        for goals in range(1, GOAL_CAP + 1):
            probabilities.append(probabilities[-1] * rate / goals)
        return probabilities

    @classmethod
    def _score_distribution(
        cls, expected_home: float, expected_away: float
    ) -> tuple[tuple[float, float, float], tuple[int, int]]:
        home_scores = cls._poisson(expected_home)
        away_scores = cls._poisson(expected_away)
        outcomes = [0.0, 0.0, 0.0]
        best_score = (0, 0)
        best_mass = -1.0
        total_mass = 0.0
        for home_goals, home_mass in enumerate(home_scores):
            for away_goals, away_mass in enumerate(away_scores):
                mass = home_mass * away_mass
                total_mass += mass
                outcomes[0 if home_goals > away_goals else 1 if home_goals == away_goals else 2] += mass
                if mass > best_mass:
                    best_mass = mass
                    best_score = (home_goals, away_goals)
        return tuple(value / total_mass for value in outcomes), best_score

    def to_dict(self) -> dict[str, object]:
        return {
            "window": self.window,
            "prior_weight": self.prior_weight,
            "league_window": self.league_window,
            "league_history": {
                competition: list(matches)
                for competition, matches in sorted(self.league_history.items())
            },
            "team_history": {
                competition: {
                    team: {
                        venue: list(matches)
                        for venue, matches in sorted(venues.items())
                    }
                    for team, venues in sorted(teams.items())
                }
                for competition, teams in sorted(self.team_history.items())
            },
        }

    @classmethod
    def from_dict(cls, state: dict[str, object]) -> RollingPoissonModel:
        model = cls(
            window=int(state["window"]),
            prior_weight=float(state["prior_weight"]),
            league_window=int(state["league_window"]),
        )
        for competition, matches in state["league_history"].items():
            model.league_history[competition] = deque(
                (tuple(map(int, item)) for item in matches), maxlen=model.league_window
            )
        for competition, teams in state["team_history"].items():
            model.team_history[competition] = {
                team: {
                    venue: deque(
                        (tuple(map(int, item)) for item in matches), maxlen=model.window
                    )
                    for venue, matches in venues.items()
                }
                for team, venues in teams.items()
            }
        return model


def calibrate_temperature(
    probabilities: list[tuple[float, float, float]], outcomes: list[int]
) -> float:
    """Fit scalar multiclass temperature by minimizing calibration log loss."""
    if not probabilities or len(probabilities) != len(outcomes):
        raise ValueError("Calibration requires equally sized, non-empty inputs")
    best_temperature = 1.0
    best_loss = float("inf")
    for step in range(50, 251):
        temperature = step / 100
        loss = _log_loss(
            [scale_probabilities(row, temperature) for row in probabilities], outcomes
        )
        if loss < best_loss:
            best_loss = loss
            best_temperature = temperature
    return best_temperature


def scale_probabilities(
    probabilities: tuple[float, float, float], temperature: float
) -> tuple[float, float, float]:
    if temperature <= 0:
        raise ValueError("temperature must be positive")
    logits = [math.log(max(probability, 1e-15)) / temperature for probability in probabilities]
    peak = max(logits)
    values = [math.exp(value - peak) for value in logits]
    total = sum(values)
    return tuple(value / total for value in values)


def _log_loss(
    probabilities: list[tuple[float, float, float]], outcomes: list[int]
) -> float:
    return -sum(
        math.log(max(row[outcome], 1e-15))
        for row, outcome in zip(probabilities, outcomes)
    ) / len(outcomes)


def _metrics(
    probabilities: list[tuple[float, float, float]], outcomes: list[int]
) -> dict[str, float | int]:
    if not probabilities:
        return {"matches": 0, "log_loss": 0.0, "brier_score": 0.0, "accuracy": 0.0}
    brier = sum(
        sum((probability - (index == outcome)) ** 2 for index, probability in enumerate(row))
        for row, outcome in zip(probabilities, outcomes)
    ) / len(outcomes)
    accuracy = sum(
        max(range(3), key=row.__getitem__) == outcome
        for row, outcome in zip(probabilities, outcomes)
    ) / len(outcomes)
    return {
        "matches": len(outcomes),
        "log_loss": _log_loss(probabilities, outcomes),
        "brier_score": brier,
        "accuracy": accuracy,
    }


def _calibration_improves(
    calibrated: dict[str, float | int], uncalibrated: dict[str, float | int]
) -> bool:
    return (
        calibrated["log_loss"] < uncalibrated["log_loss"]
        and calibrated["brier_score"] <= uncalibrated["brier_score"]
    )


def _outcome(result: MatchResult) -> int:
    return 0 if result.home_goals > result.away_goals else 1 if result.home_goals == result.away_goals else 2


def _predict_day(
    model: RollingPoissonModel, results: list[MatchResult]
) -> tuple[list[tuple[float, float, float]], list[int]]:
    probabilities: list[tuple[float, float, float]] = []
    outcomes: list[int] = []
    for result in results:
        try:
            row, _, _, _ = model.predict(
                result.competition, result.home_team, result.away_team
            )
        except ModelNotReadyError:
            continue
        probabilities.append(row)
        outcomes.append(_outcome(result))
    return probabilities, outcomes


def _observe_day(model: RollingPoissonModel, results: list[MatchResult]) -> None:
    for result in results:
        model.observe(result)


def evaluate_walk_forward(
    results: list[MatchResult],
    window: int = 20,
    prior_weight: float = 5.0,
    fold_count: int = 4,
) -> dict[str, object]:
    """Evaluate expanding-window folds and select calibration only if it helps."""
    by_date: dict[date, list[MatchResult]] = {}
    for result in results:
        by_date.setdefault(result.match_date, []).append(result)
    dates = sorted(by_date)
    if fold_count < 1:
        raise ValueError("fold_count must be positive")
    fold_window = max(1, len(dates) // (2 * fold_count + 2))
    first_test_start = len(dates) - fold_count * fold_window
    first_calibration_start = first_test_start - fold_window
    if first_calibration_start < 1:
        raise ValueError(
            "Not enough distinct match dates for initial training, calibration, "
            "and rolling holdout windows"
        )

    test_probabilities: list[tuple[float, float, float]] = []
    test_outcomes: list[int] = []
    calibrated_probabilities: list[tuple[float, float, float]] = []
    frequency_baseline_probabilities: list[tuple[float, float, float]] = []
    always_home_probabilities: list[tuple[float, float, float]] = []
    calibration_temperatures: list[float] = []
    calibration_match_count = 0
    fold_reports: list[dict[str, object]] = []

    for fold_index in range(fold_count):
        test_start = first_test_start + fold_index * fold_window
        calibration_start = test_start - fold_window
        calibration_dates = dates[calibration_start:test_start]
        holdout_dates = dates[test_start:test_start + fold_window]
        model = RollingPoissonModel(window=window, prior_weight=prior_weight)
        for day in dates[:calibration_start]:
            _observe_day(model, by_date[day])

        calibration_probabilities: list[tuple[float, float, float]] = []
        calibration_outcomes: list[int] = []
        for day in calibration_dates:
            probabilities, outcomes = _predict_day(model, by_date[day])
            calibration_probabilities.extend(probabilities)
            calibration_outcomes.extend(outcomes)
            _observe_day(model, by_date[day])
        if not calibration_probabilities:
            raise ValueError(f"Fold {fold_index + 1} has no eligible calibration matches")

        training_results = [
            result
            for day in dates[:calibration_start]
            for result in by_date[day]
        ]
        outcome_counts = Counter(_outcome(result) for result in training_results)
        frequency_prior = tuple(
            outcome_counts[index] / len(training_results) for index in range(3)
        )

        fold_temperature = calibrate_temperature(
            calibration_probabilities, calibration_outcomes
        )
        calibration_temperatures.append(fold_temperature)
        calibration_match_count += len(calibration_outcomes)

        fold_probabilities: list[tuple[float, float, float]] = []
        fold_outcomes: list[int] = []
        for day in holdout_dates:
            probabilities, outcomes = _predict_day(model, by_date[day])
            fold_probabilities.extend(probabilities)
            fold_outcomes.extend(outcomes)
            _observe_day(model, by_date[day])
        if not fold_probabilities:
            raise ValueError(f"Fold {fold_index + 1} has no eligible holdout matches")

        calibrated_fold = [
            scale_probabilities(row, fold_temperature) for row in fold_probabilities
        ]
        test_probabilities.extend(fold_probabilities)
        test_outcomes.extend(fold_outcomes)
        calibrated_probabilities.extend(calibrated_fold)
        frequency_baseline_probabilities.extend(
            [frequency_prior] * len(fold_outcomes)
        )
        always_home_probabilities.extend(
            [(1.0, 0.0, 0.0)] * len(fold_outcomes)
        )
        fold_reports.append(
            {
                "train_dates": calibration_start,
                "calibration_dates": len(calibration_dates),
                "holdout_dates": len(holdout_dates),
                "calibration_matches": len(calibration_outcomes),
                "temperature": fold_temperature,
                "training_outcome_frequencies": frequency_prior,
                "holdout": {
                    "uncalibrated": _metrics(fold_probabilities, fold_outcomes),
                    "calibrated": _metrics(calibrated_fold, fold_outcomes),
                    "training_frequency_baseline": _metrics(
                        [frequency_prior] * len(fold_outcomes), fold_outcomes
                    ),
                },
            }
        )

    if not test_probabilities:
        raise ValueError("No eligible holdout matches in rolling-origin evaluation")

    uncalibrated_metrics = _metrics(test_probabilities, test_outcomes)
    calibrated_metrics = _metrics(calibrated_probabilities, test_outcomes)
    calibration_applied = _calibration_improves(
        calibrated_metrics, uncalibrated_metrics
    )
    temperature = median(calibration_temperatures) if calibration_applied else 1.0
    return {
        "split": {
            "fold_count": fold_count,
            "initial_train_dates": first_calibration_start,
            "calibration_dates_per_fold": fold_window,
            "holdout_dates_per_fold": fold_window,
        },
        "calibration_matches": calibration_match_count,
        "calibration_applied": calibration_applied,
        "temperature": temperature,
        "folds": fold_reports,
        "baselines": {
            "training_frequency": _metrics(
                frequency_baseline_probabilities, test_outcomes
            ),
            "always_home": _metrics(always_home_probabilities, test_outcomes),
        },
        "holdout": {
            "uncalibrated": uncalibrated_metrics,
            "calibrated": calibrated_metrics,
        },
    }


def train_artifact(
    data_path: str | Path,
    output_path: str | Path,
    window: int = 20,
    prior_weight: float = 5.0,
    fold_count: int = 4,
) -> dict[str, object]:
    results, input_hash = load_results(data_path)
    evaluation = evaluate_walk_forward(results, window, prior_weight, fold_count)
    model = RollingPoissonModel(window=window, prior_weight=prior_weight)
    for result in results:
        model.observe(result)
    artifact: dict[str, object] = {
        "schema_version": ARTIFACT_SCHEMA_VERSION,
        "model_version": MODEL_VERSION,
        "trained_through": max(result.match_date for result in results).isoformat(),
        "input_sha256": input_hash,
        "training_matches": len(results),
        "temperature": evaluation["temperature"],
        "evaluation": evaluation,
        "model_state": model.to_dict(),
    }
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(artifact, indent=2, sort_keys=True, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    return artifact


def load_artifact(path: str | Path) -> tuple[dict[str, object], RollingPoissonModel]:
    artifact = json.loads(Path(path).read_text(encoding="utf-8"))
    if artifact.get("schema_version") != ARTIFACT_SCHEMA_VERSION:
        raise ValueError("Unsupported prediction model artifact schema")
    return artifact, RollingPoissonModel.from_dict(artifact["model_state"])


def predict_with_artifact(
    artifact: dict[str, object], model: RollingPoissonModel, competition: str,
    home_team: str, away_team: str,
) -> dict[str, object]:
    probabilities, score, expected_goals, has_team_history = model.predict(
        competition, home_team, away_team
    )
    calibrated = scale_probabilities(probabilities, float(artifact["temperature"]))
    return {
        "probabilities": calibrated,
        "predicted_score": {"home": score[0], "away": score[1]},
        "expected_goals": {"home": expected_goals[0], "away": expected_goals[1]},
        "has_team_history": {"home": has_team_history[0], "away": has_team_history[1]},
    }