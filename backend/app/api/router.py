"""Aggregates all API routers under the v1 prefix."""

from fastapi import APIRouter

from app.api.routers import auth, matches, predictions, standings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(matches.router)
api_router.include_router(predictions.router)
api_router.include_router(standings.router)

from app.api.routers import analytics, live
api_router.include_router(analytics.router)
api_router.include_router(live.router)

from app.api.routers import predictions_enhanced
api_router.include_router(predictions_enhanced.router)
