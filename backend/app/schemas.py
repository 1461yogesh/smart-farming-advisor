"""
schemas.py
==========
Pydantic models for request validation and response serialisation.
"""

from pydantic import BaseModel, Field, field_validator


class PredictionRequest(BaseModel):
    """Input data sent by the frontend form."""

    N: float = Field(..., description="Nitrogen content (dataset soil value)")
    P: float = Field(..., description="Phosphorus content (dataset soil value)")
    K: float = Field(..., description="Potassium content (dataset soil value)")
    temperature: float = Field(..., description="Temperature in °C")
    humidity: float = Field(..., description="Relative humidity in %")
    ph: float = Field(..., description="Soil pH (0–14)")
    rainfall: float = Field(..., description="Rainfall in mm")
    area: float = Field(..., description="Farm area in acres")
    fertilizer: float = Field(..., description="Fertilizer usage (dataset unit)")
    pesticide: float = Field(..., description="Pesticide usage (dataset unit)")

    # ---- Validators --------------------------------------------------------

    @field_validator("area")
    @classmethod
    def area_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("area must be greater than 0")
        return v

    @field_validator("ph")
    @classmethod
    def ph_range(cls, v: float) -> float:
        if not (0.0 <= v <= 14.0):
            raise ValueError("ph must be between 0 and 14")
        return v

    @field_validator("humidity")
    @classmethod
    def humidity_range(cls, v: float) -> float:
        if not (0.0 <= v <= 100.0):
            raise ValueError("humidity must be between 0 and 100")
        return v

    model_config = {"json_schema_extra": {
        "example": {
            "N": 90,
            "P": 42,
            "K": 43,
            "temperature": 20.9,
            "humidity": 82.0,
            "ph": 6.5,
            "rainfall": 202.9,
            "area": 2.5,
            "fertilizer": 100.0,
            "pesticide": 10.0,
        }
    }}


class PredictionUnits(BaseModel):
    yield_per_acre: str = "quintal/acre"
    total_yield: str = "quintal"
    price_per_quintal: str = "₹/quintal"
    total_cost: str = "₹"
    estimated_profit: str = "₹"


class PredictionResponse(BaseModel):
    """Prediction result returned to the frontend."""

    crop: str
    yield_per_acre: float
    total_yield: float
    price_per_quintal: float
    total_cost: float
    estimated_profit: float
    units: PredictionUnits = PredictionUnits()
