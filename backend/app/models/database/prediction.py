"""Prediction tracking models for performance monitoring."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime, Boolean, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base
from app.models.base import TimestampMixin


def _uuid_str() -> str:
    return str(uuid.uuid4())


class StoredPrediction(Base, TimestampMixin):
    __tablename__ = "stored_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid_str)
    match_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    competition: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    home_team: Mapped[str] = mapped_column(String(200), nullable=False)
    away_team: Mapped[str] = mapped_column(String(200), nullable=False)
    
    # 1X2 probabilities
    home_win_prob: Mapped[float] = mapped_column(Float, nullable=False)
    draw_prob: Mapped[float] = mapped_column(Float, nullable=False)
    away_win_prob: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Other market probabilities
    btts_yes_prob: Mapped[float | None] = mapped_column(Float)
    over_25_prob: Mapped[float | None] = mapped_column(Float)
    under_25_prob: Mapped[float | None] = mapped_column(Float)
    
    # Predicted score and outcome
    predicted_score_home: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_score_away: Mapped[int] = mapped_column(Integer, nullable=False)
    predicted_outcome: Mapped[str] = mapped_column(String(10), nullable=False)
    top_outcome_probability: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Model info
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    data_quality: Mapped[float] = mapped_column(Float, nullable=False)
    
    # Distributions and markets
    scoreline_distribution: Mapped[dict | None] = mapped_column(JSON)
    markets: Mapped[dict | None] = mapped_column(JSON)
    
    # Explanations and context
    key_factors: Mapped[dict | None] = mapped_column(JSON)
    explanation: Mapped[str | None] = mapped_column(Text)
    match_context: Mapped[dict | None] = mapped_column(JSON)
    squad_adjustments: Mapped[dict | None] = mapped_column(JSON)
    
    # Timing
    predicted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Results
    actual_home_goals: Mapped[int | None] = mapped_column(Integer)
    actual_away_goals: Mapped[int | None] = mapped_column(Integer)
    actual_outcome: Mapped[str | None] = mapped_column(String(10))
    result_recorded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Metrics
    outcome_correct: Mapped[bool | None] = mapped_column(Boolean)
    brier_score: Mapped[float | None] = mapped_column(Float)
    log_loss: Mapped[float | None] = mapped_column(Float)
