"""Enhanced prediction service using advanced engine."""
from __future__ import annotations
from datetime import datetime, timezone

from app.schemas import MatchPredictionIn, PredictionOut, EnhancedPredictionOut, MarketProbabilities, PredictionExplanation
from app.services.advanced_prediction_engine import AdvancedPredictionEngine, TeamStats
from app.services.model_service import ModelNotReadyError, predict_match as _predict_match
from app.services import prediction_service


engine = AdvancedPredictionEngine()


def predict_enhanced(match: MatchPredictionIn) -> EnhancedPredictionOut:
    """Generate enhanced prediction with all markets."""
    try:
        # Get base prediction
        base_pred = _predict_match(match)
    except Exception:
        raise ModelNotReadyError("Model not available")
    
    # Generate enhanced prediction
    result = engine.predict_enhanced(
        match.home_team,
        match.away_team
    )
    
    markets = result['markets']
    market_probs = MarketProbabilities(**markets)
    explanation_data = result['explanation']
    explanation = PredictionExplanation(**explanation_data)
    
    return EnhancedPredictionOut(
        id=f"pred-{match.id}",
        match_id=match.id,
        home_win_prob=markets['home_win'] * 100,
        draw_prob=markets['draw'] * 100,
        away_win_prob=markets['away_win'] * 100,
        predicted_outcome=("home", "draw", "away")[max(range(3), key=[markets['home_win'], markets['draw'], markets['away_win']].__getitem__)],
        predicted_score=result['predicted_score'],
        top_outcome_probability=max(markets['home_win'], markets['draw'], markets['away_win']) * 100,
        model_version="enhanced-v2",
        key_factors=base_pred.key_factors,
        created_at=datetime.now(timezone.utc),
        markets=market_probs,
        scoreline_distribution=result['scoreline_distribution'],
        explanation=explanation,
        squad_adjustments=None,
        match_context=result['match_context'],
        xg_home=result['xg_home'],
        xg_away=result['xg_away']
    )


def predict_batch_enhanced(matches: list[MatchPredictionIn]) -> list[EnhancedPredictionOut]:
    predictions = []
    for match in matches:
        try:
            predictions.append(predict_enhanced(match))
        except Exception:
            continue
    return predictions
