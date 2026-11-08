"""Pydantic schemas — request/response models for the API."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth ---
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds")


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: str
    is_active: bool
    created_at: datetime


class RefreshRequest(BaseModel):
    refresh_token: str


# --- Prediction domain (mock shapes) ---
class TeamOut(BaseModel):
    id: str
    name: str
    short_name: str
    logo: str
    color: str
    form: list[Literal["W", "D", "L"]]


class MatchOut(BaseModel):
    id: str
    competition: str
    season: str
    matchday: int
    home_team: TeamOut
    away_team: TeamOut
    kickoff: datetime
    status: Literal["scheduled", "live", "finished", "suspended", "postponed", "cancelled", "awarded"]
    venue: str
    home_score: int | None = None
    away_score: int | None = None
    minute: int | None = None
    data_stale: bool = False


class KeyFactorOut(BaseModel):
    label: str
    detail: str
    weight: Literal["high", "medium", "low"]


class PredictionOut(BaseModel):
    id: str
    match_id: str
    home_win_prob: float
    draw_prob: float
    away_win_prob: float
    predicted_outcome: Literal["home", "draw", "away"]
    predicted_score: dict[str, int]
    top_outcome_probability: float
    model_version: str
    key_factors: list[KeyFactorOut]
    created_at: datetime


class MatchPredictionIn(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    competition: str = Field(min_length=1, max_length=100)
    home_team: str = Field(min_length=1, max_length=200)
    away_team: str = Field(min_length=1, max_length=200)


class LiveMatchStateIn(BaseModel):
    shots_on_target_home: int | None = Field(default=None, ge=0, le=50)
    shots_on_target_away: int | None = Field(default=None, ge=0, le=50)
    possession_home: float | None = Field(default=None, ge=0, le=100)
    corners_home: int | None = Field(default=None, ge=0, le=50)
    corners_away: int | None = Field(default=None, ge=0, le=50)
    red_cards_home: int | None = Field(default=None, ge=0, le=5)
    red_cards_away: int | None = Field(default=None, ge=0, le=5)

class PredictionBatchIn(BaseModel):
    matches: list[MatchPredictionIn] = Field(min_length=1, max_length=200)


class StandingsRowOut(BaseModel):
    position: int
    team: TeamOut
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


# --- Enhanced Prediction Schemas ---

class MarketProbabilities(BaseModel):
    home_win: float
    draw: float
    away_win: float
    double_chance_1x: float
    double_chance_x2: float
    double_chance_12: float
    draw_no_bet_home: float | None = None
    draw_no_bet_away: float | None = None
    over_05: float
    under_05: float
    over_15: float
    under_15: float
    over_25: float
    under_25: float
    over_35: float
    under_35: float
    btts_yes: float
    btts_no: float
    ht_home: float | None = None
    ht_draw: float | None = None
    ht_away: float | None = None
    home_over_05: float | None = None
    home_over_15: float | None = None
    away_over_05: float | None = None
    away_over_15: float | None = None
    home_clean_sheet: float | None = None
    away_clean_sheet: float | None = None

class PredictionExplanation(BaseModel):
    probability: float
    confidence: float
    data_quality: float
    summary: str
    supporting_factors: list[str]
    concerns: list[str] = []
    market_consistency: bool = True

class SquadAdjustment(BaseModel):
    confirmed_absences_impact: float
    doubtful_players_impact: float
    rotation_risk: float
    key_player_availability: float
    overall_adjustment: float
    details: dict[str, str] = {}

class MatchContext(BaseModel):
    home_advantage: float
    rest_days_impact: float = 0.0
    fixture_congestion: float = 0.0
    travel_impact: float = 0.0
    weather_impact: float = 0.0
    motivation: float = 0.0
    competition_importance: float = 0.0
    manager_change_impact: float = 0.0
    referee_impact: float = 0.0
    overall_context_adjustment: float = 0.0

class EnhancedPredictionOut(PredictionOut):
    markets: MarketProbabilities
    scoreline_distribution: dict[str, float] | None = None
    explanation: PredictionExplanation
    squad_adjustments: SquadAdjustment | None = None
    match_context: MatchContext | None = None
    xg_home: float | None = None
    xg_away: float | None = None
