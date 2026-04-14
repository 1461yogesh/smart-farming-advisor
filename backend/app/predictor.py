"""
predictor.py
============
Loads trained models at startup and exposes a single predict() function.
All crop names and yield values are derived from the real datasets.
"""

import os
from typing import Optional, Dict, Any

import joblib
import numpy as np

# ── Paths ────────────────────────────────────────────────────────────────────
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(_BACKEND, "models")


# ── Crop-wise cost per acre (₹) ──────────────────────────────────────────────
# Used to calculate total cost = cost_per_acre × area.
# Keys match the crop label values from Crop_recommendation.csv (lowercase).
CROP_COST_PER_ACRE: Dict[str, float] = {
    "rice"        : 50000,
    "wheat"       : 40000,
    "maize"       : 35000,
    "jute"        : 45000,
    "cotton"      : 60000,
    "sugarcane"   : 55000,
    "potato"      : 52000,
    "tomato"      : 50000,
    "onion"       : 48000,
    "banana"      : 70000,
    "mango"       : 65000,
    "grapes"      : 85000,
    "apple"       : 110000,
    "orange"      : 60000,
    "coconut"     : 55000,
    "papaya"      : 48000,
    "muskmelon"   : 42000,
    "watermelon"  : 40000,
    "pomegranate" : 70000,
    "mungbean"    : 32000,
    "blackgram"   : 33000,
    "lentil"      : 34000,
    "pigeonpeas"  : 37000,
    "kidneybeans" : 39000,
    "chickpea"    : 35000,
    "mothbeans"   : 31000,
    "coffee"      : 75000,
}
DEFAULT_COST_PER_ACRE = 42000.0


# ── Fallback yield (quintal/acre) from dataset analysis ──────────────────────
# These come from per-crop means in crop_yield.csv (converted from tonnes/ha).
# Used when the loaded yield_meta.joblib doesn't have the crop.
FALLBACK_YIELD_MAP: Dict[str, float] = {
    "rice"        : 8.98,
    "wheat"       : 8.14,
    "maize"       : 9.78,
    "jute"        : 33.34,
    "cotton"      : 7.32,
    "sugarcane"   : 198.44,
    "potato"      : 48.64,
    "onion"       : 47.46,
    "banana"      : 106.40,
    "coconut"     : 10.50,
    "tomato"      : 50.00,   # estimated (not in yield dataset)
    "mango"       : 20.00,
    "grapes"      : 25.00,
    "apple"       : 18.00,
    "orange"      : 22.00,
    "papaya"      : 55.00,
    "muskmelon"   : 40.00,
    "watermelon"  : 60.00,
    "pomegranate" : 20.00,
    "mungbean"    : 2.17,
    "blackgram"   : 2.37,
    "lentil"      : 2.85,
    "pigeonpeas"  : 3.91,
    "kidneybeans" : 3.50,
    "chickpea"    : 3.55,
    "mothbeans"   : 1.84,
    "coffee"      : 4.00,
}
GLOBAL_DEFAULT_YIELD = 8.0   # quintal/acre


# ── Fallback price (₹/quintal) from dataset analysis ─────────────────────────
# These are the exact means from Agriculture_price_dataset.csv.
# The dataset contains: onion, potato, rice, tomato, wheat.
FALLBACK_PRICE_MAP: Dict[str, float] = {
    "onion"   : 2780.81,
    "potato"  : 2021.93,
    "rice"    : 3582.89,
    "tomato"  : 4414.20,
    "wheat"   : 2426.93,
    # Reasonable market estimates for crops not in the price dataset
    "maize"   : 1800.0,
    "jute"    : 3500.0,
    "cotton"  : 6500.0,
    "sugarcane": 350.0,
    "banana"  : 2000.0,
    "mango"   : 4000.0,
    "grapes"  : 5000.0,
    "apple"   : 8000.0,
    "orange"  : 3000.0,
    "coconut" : 2500.0,
    "papaya"  : 1500.0,
    "muskmelon": 1200.0,
    "watermelon": 800.0,
    "pomegranate": 6000.0,
    "mungbean": 7000.0,
    "blackgram": 7500.0,
    "lentil"  : 6000.0,
    "pigeonpeas": 6500.0,
    "kidneybeans": 9000.0,
    "chickpea": 5500.0,
    "mothbeans": 6000.0,
    "coffee"  : 20000.0,
}
GLOBAL_DEFAULT_PRICE = 2500.0


# ── Model registry ───────────────────────────────────────────────────────────
class ModelRegistry:
    crop_model  = None
    crop_le     = None       # LabelEncoder for crop labels
    yield_meta: dict = {}
    price_map:  dict = {}
    loaded: bool = False


_registry = ModelRegistry()


def load_models() -> None:
    """Load all joblib artefacts. Called once at FastAPI startup."""
    errors = []

    def _try(path: str, label: str):
        if os.path.exists(path):
            obj = joblib.load(path)
            print(f"[predictor] ✓ Loaded {label}")
            return obj
        errors.append(f"  ✗ {label} not found: {path}")
        return None

    _registry.crop_model  = _try(os.path.join(MODELS_DIR, "crop_model.joblib"),            "Crop model")
    _registry.crop_le     = _try(os.path.join(MODELS_DIR, "crop_label_encoder.joblib"),     "Crop LabelEncoder")
    yield_meta_obj        = _try(os.path.join(MODELS_DIR, "yield_meta.joblib"),             "Yield meta")
    price_obj             = _try(os.path.join(MODELS_DIR, "price_mapping.joblib"),          "Price mapping")

    _registry.yield_meta  = yield_meta_obj if isinstance(yield_meta_obj, dict) else {}
    _registry.price_map   = price_obj      if isinstance(price_obj, dict)      else {}

    if errors:
        print("[predictor] WARNING — missing artefacts:")
        for e in errors:
            print(e)
        print("  ▶  Run:  python train_models.py   to generate them.")

    _registry.loaded = True


# ── Helpers ───────────────────────────────────────────────────────────────────
def _fuzzy_lookup(key: str, mapping: dict, default: Optional[float] = None) -> Optional[float]:
    """Case-insensitive exact match → partial match → default."""
    k = key.lower().strip()
    # Exact
    if k in mapping:
        return float(mapping[k])
    # Partial
    for mk, mv in mapping.items():
        if k in mk or mk in k:
            return float(mv)
    return default


# ── Core prediction ───────────────────────────────────────────────────────────
def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Full prediction pipeline.

    Input fields (from PredictionRequest):
        N, P, K, temperature, humidity, ph, rainfall,
        area, fertilizer, pesticide

    Returns dict matching PredictionResponse schema.
    """
    if not _registry.loaded:
        raise RuntimeError("Models not loaded. Call load_models() first.")

    if _registry.crop_model is None or _registry.crop_le is None:
        raise RuntimeError(
            "Crop recommendation model is unavailable. "
            "Run  python train_models.py  to train the models."
        )

    # ── 1. Predict crop ──────────────────────────────────────────────────────
    crop_features = np.array([[
        float(data["N"]),
        float(data["P"]),
        float(data["K"]),
        float(data["temperature"]),
        float(data["humidity"]),
        float(data["ph"]),
        float(data["rainfall"]),
    ]])

    crop_idx: int = int(_registry.crop_model.predict(crop_features)[0])
    crop_name: str = str(_registry.crop_le.inverse_transform([crop_idx])[0])
    crop_key: str  = crop_name.lower().strip()

    # ── 2. Yield per acre (quintal/acre) ─────────────────────────────────────
    # Primary: per-crop mean from yield_meta (derived from dataset)
    crop_yield_map: dict = _registry.yield_meta.get("crop_yield_map", {})
    yield_per_acre: Optional[float] = _fuzzy_lookup(crop_key, crop_yield_map)

    # Secondary: hard-coded fallback from dataset analysis
    if yield_per_acre is None:
        yield_per_acre = _fuzzy_lookup(crop_key, FALLBACK_YIELD_MAP, GLOBAL_DEFAULT_YIELD)

    assert yield_per_acre is not None
    area: float       = float(data["area"])
    yield_per_acre    = round(float(yield_per_acre), 2)
    total_yield: float = round(yield_per_acre * area, 2)

    # ── 3. Price per quintal (₹) ─────────────────────────────────────────────
    # Primary: loaded price_mapping.joblib (from Agriculture_price_dataset.csv)
    price_per_quintal: Optional[float] = _fuzzy_lookup(crop_key, _registry.price_map)

    # Secondary: hard-coded fallback
    if price_per_quintal is None:
        price_per_quintal = _fuzzy_lookup(crop_key, FALLBACK_PRICE_MAP, GLOBAL_DEFAULT_PRICE)

    assert price_per_quintal is not None
    price_per_quintal = round(float(price_per_quintal), 2)

    # ── 4. Cost & profit ─────────────────────────────────────────────────────
    cost_per_acre: float  = float(CROP_COST_PER_ACRE.get(crop_key, DEFAULT_COST_PER_ACRE))
    total_cost: float     = round(cost_per_acre * area, 2)
    estimated_profit: float = round((total_yield * price_per_quintal) - total_cost, 2)

    return {
        "crop"             : crop_name,
        "yield_per_acre"   : yield_per_acre,
        "total_yield"      : total_yield,
        "price_per_quintal": price_per_quintal,
        "total_cost"       : total_cost,
        "estimated_profit" : estimated_profit,
        "units": {
            "yield_per_acre"   : "quintal/acre",
            "total_yield"      : "quintal",
            "price_per_quintal": "₹/quintal",
            "total_cost"       : "₹",
            "estimated_profit" : "₹",
        },
    }
