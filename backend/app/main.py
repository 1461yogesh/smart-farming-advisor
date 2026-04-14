"""
main.py
=======
FastAPI application entry point for Smart Farming Advisor.

CORS:
  - During local development, allow_origins=["*"] is used.
  - For production, replace "*" with your exact frontend URL, e.g.:
      allow_origins=["https://smart-farming.vercel.app"]

Health endpoints:
  GET /        → basic alive check
  GET /health  → detailed status including model load status

Prediction endpoint:
  POST /predict → returns crop recommendation + yield/cost/profit estimates
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.predictor import load_models, predict, _registry
from app.schemas import PredictionRequest, PredictionResponse


# ---------------------------------------------------------------------------
# Lifespan — load models once at startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_models()
    yield
    # Shutdown: nothing to clean up


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Smart Farming Advisor API",
    description=(
        "Predicts recommended crop, yield, market price, cost, and profit "
        "from agricultural input data using machine-learning models."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# For LOCAL DEVELOPMENT: allow all origins.
# For PRODUCTION: replace the "*" with your Vercel frontend URL.
#
# Example production setting:
#   allow_origins=["https://smart-farming-advisor.vercel.app"]
#
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------
@app.get("/", tags=["health"])
async def root():
    return {
        "service": "Smart Farming Advisor API",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {
        "status": "ok",
        "models_loaded": _registry.loaded,
        "crop_model": _registry.crop_model is not None,
        "price_entries": len(_registry.price_map),
    }


# ---------------------------------------------------------------------------
# Prediction
# ---------------------------------------------------------------------------
@app.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["prediction"],
    summary="Predict crop, yield, cost, and profit",
)
async def predict_endpoint(request: PredictionRequest):
    """
    Accepts agricultural soil/climate data and farm area, returns:
    - recommended crop
    - yield per acre (quintal/acre)
    - total yield (quintal)
    - market price per quintal (₹/quintal)
    - total cost (₹)
    - estimated profit (₹)
    """
    try:
        result = predict(request.model_dump())
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc

    return result
