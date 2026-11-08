"""Enhanced prediction routes with all markets."""
from fastapi import APIRouter, HTTPException, status

from app.schemas import PredictionBatchIn, EnhancedPredictionOut
from app.services import enhanced_prediction_service
from app.services.model_service import ModelNotReadyError

router = APIRouter(prefix="/predictions/enhanced", tags=["predictions-enhanced"])


@router.post("/batch", response_model=list[EnhancedPredictionOut])
def predict_batch_enhanced(request: PredictionBatchIn):
    try:
        return enhanced_prediction_service.predict_batch_enhanced(request.matches)
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.get("/{match_id}", response_model=EnhancedPredictionOut)
def get_prediction_enhanced(match_id: str):
    # For demo, create a mock match
    from app.schemas import MatchPredictionIn
    match = MatchPredictionIn(id=match_id, competition="Premier League", home_team="Arsenal", away_team="Chelsea")
    try:
        return enhanced_prediction_service.predict_enhanced(match)
    except (FileNotFoundError, ModelNotReadyError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
