"""Model-backed prediction routes for live provider fixtures."""

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas import PredictionBatchIn, PredictionOut
from app.services import prediction_service
from app.services.football_data_service import FootballDataError
from app.services.model_service import ModelNotReadyError, get_model_info

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("", response_model=list[PredictionOut])
async def list_predictions(limit: int = Query(200, ge=1, le=200)):
    try:
        return await prediction_service.list_predictions(limit)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except (FileNotFoundError, ModelNotReadyError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.get("/model")
def model_info_endpoint():
    try:
        return get_model_info()
    except FileNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.post("/batch", response_model=list[PredictionOut])
def predict_batch(request: PredictionBatchIn):
    try:
        return prediction_service.predict_batch(request.matches)
    except (FileNotFoundError, ModelNotReadyError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error


@router.get("/{match_id}", response_model=PredictionOut)
async def get_prediction(match_id: str):
    try:
        prediction = await prediction_service.get_prediction(match_id)
    except FootballDataError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    except (FileNotFoundError, ModelNotReadyError) as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    if not prediction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prediction not found")
    return prediction