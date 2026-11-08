"""Analytics and performance tracking routes."""
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any

from app.services.performance_tracker import PerformanceTracker

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Global instance
tracker = PerformanceTracker()


@router.get("/performance")
def get_performance_metrics() -> Dict[str, Any]:
    """Get prediction performance metrics."""
    try:
        return tracker.get_performance_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predictions/log")
def log_prediction(prediction_data: Dict[str, Any]) -> Dict[str, str]:
    """Log a prediction for tracking."""
    try:
        pred_id = tracker.log_prediction(prediction_data)
        return {"id": pred_id, "status": "logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predictions/{prediction_id}/result")
def record_result(prediction_id: str, result: Dict[str, int]) -> Dict[str, str]:
    """Record actual match result."""
    try:
        home_goals = result.get("home_goals", 0)
        away_goals = result.get("away_goals", 0)
        success = tracker.record_result(prediction_id, home_goals, away_goals)
        if not success:
            raise HTTPException(status_code=404, detail="Prediction not found")
        return {"status": "recorded"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
def get_dashboard() -> Dict[str, Any]:
    """Get analytics dashboard data."""
    metrics = tracker.get_performance_metrics()
    return {
        "title": "Soccert Prediction Performance",
        "metrics": metrics,
        "note": "Track predictions to see actual performance data"
    }
