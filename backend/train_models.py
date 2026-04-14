"""
train_models.py
===============
Trains all ML models for Smart Farming Advisor.

Datasets (place in backend/data/):
  - Crop_recommendation.csv        → crop recommendation model
  - crop_yield.csv                  → yield prediction + per-crop yield map
  - Agriculture_price_dataset.csv   → market price mapping

Outputs saved to backend/models/:
  - crop_model.joblib
  - crop_label_encoder.joblib
  - yield_model.joblib
  - yield_meta.joblib       (per-crop mean yield map in quintal/acre + metadata)
  - price_mapping.joblib    (commodity → avg Modal_Price in ₹/quintal)

Run from backend/ directory:
  python train_models.py
"""

import os
import warnings

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, r2_score

warnings.filterwarnings("ignore")

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
DATA_DIR   = os.path.join(BASE_DIR, "data")

os.makedirs(MODELS_DIR, exist_ok=True)

# ── Unit conversion ──────────────────────────────────────────────────────────
# crop_yield.csv Yield = Production(tonnes) / Area(hectares) = tonnes/hectare
# Target output unit: quintal/acre
# 1 tonne/ha = 10 quintal/ha = 10 / 2.471 quintal/acre ≈ 4.0469 quintal/acre
TONNES_HA_TO_QUINTAL_ACRE = 10.0 / 2.471  # ≈ 4.047


# ============================================================================
# 1. CROP RECOMMENDATION MODEL
#    Confirmed columns: N, P, K, temperature, humidity, ph, rainfall, label
# ============================================================================
def train_crop_model() -> list:
    path = os.path.join(DATA_DIR, "Crop_recommendation.csv")
    print(f"\n[1/3] Loading {path}")

    df = pd.read_csv(path)
    feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    target_col   = "label"

    X = df[feature_cols].astype(float).values
    y = df[target_col].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = RandomForestClassifier(
        n_estimators=300, max_depth=None, random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train)

    acc = accuracy_score(y_test, model.predict(X_test))
    print(f"    Accuracy : {acc * 100:.2f}%  |  Classes: {len(le.classes_)}")

    joblib.dump(model, os.path.join(MODELS_DIR, "crop_model.joblib"))
    joblib.dump(le,    os.path.join(MODELS_DIR, "crop_label_encoder.joblib"))
    print("    Saved: crop_model.joblib, crop_label_encoder.joblib")
    return list(le.classes_)


# ============================================================================
# 2. YIELD PREDICTION MODEL
#    Confirmed columns:
#      Crop, Crop_Year, Season, State, Area, Production,
#      Annual_Rainfall, Fertilizer, Pesticide, Yield
#
#    Yield (dataset) = tonnes/hectare → convert to quintal/acre at output time
#
#    We train a RandomForestRegressor on numeric + encoded categorical features
#    and also compute a per-crop mean yield lookup for fast inference.
# ============================================================================
def train_yield_model() -> dict:
    path = os.path.join(DATA_DIR, "crop_yield.csv")
    print(f"\n[2/3] Loading {path}")

    df = pd.read_csv(path)
    target_col = "Yield"   # tonnes/hectare

    # ── Clean ──────────────────────────────────────────────────────────────
    df = df.dropna(subset=[target_col, "Area", "Annual_Rainfall", "Fertilizer", "Pesticide"])
    df = df[df[target_col] > 0]
    df = df[df["Area"] > 0]

    # Cap at 99th percentile to remove extreme outliers
    p99 = df[target_col].quantile(0.99)
    df  = df[df[target_col] <= p99]

    # ── Per-crop mean yield (quintal/acre) lookup ───────────────────────────
    df["Crop_clean"] = df["Crop"].str.strip().str.lower()
    crop_yield_map = (
        df.groupby("Crop_clean")[target_col].mean() * TONNES_HA_TO_QUINTAL_ACRE
    ).round(3).to_dict()

    # ── Encode categoricals ─────────────────────────────────────────────────
    df["Season_clean"] = df["Season"].str.strip()
    df["State_clean"]  = df["State"].str.strip()

    le_season = LabelEncoder()
    le_state  = LabelEncoder()
    le_crop   = LabelEncoder()

    df["Season_enc"] = le_season.fit_transform(df["Season_clean"])
    df["State_enc"]  = le_state.fit_transform(df["State_clean"])
    df["Crop_enc"]   = le_crop.fit_transform(df["Crop_clean"])

    # ── Feature matrix ──────────────────────────────────────────────────────
    feature_cols = [
        "Crop_enc", "Season_enc", "State_enc",
        "Crop_Year", "Area", "Annual_Rainfall", "Fertilizer", "Pesticide",
    ]

    X = df[feature_cols].astype(float).values
    y = df[target_col].astype(float).values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    r2 = r2_score(y_test, model.predict(X_test))
    print(f"    Yield R² : {r2:.4f}  |  Crop-yield entries : {len(crop_yield_map)}")

    meta = {
        "feature_cols"       : feature_cols,
        "conversion"         : TONNES_HA_TO_QUINTAL_ACRE,
        "crop_yield_map"     : crop_yield_map,           # lowercase key → quintal/acre
        "le_season_classes"  : list(le_season.classes_),
        "le_state_classes"   : list(le_state.classes_),
        "le_crop_classes"    : list(le_crop.classes_),   # lowercase
    }

    joblib.dump(model, os.path.join(MODELS_DIR, "yield_model.joblib"))
    joblib.dump(meta,  os.path.join(MODELS_DIR, "yield_meta.joblib"))
    print("    Saved: yield_model.joblib, yield_meta.joblib")
    return crop_yield_map


# ============================================================================
# 3. PRICE MAPPING
#    Confirmed columns: Commodity, Modal_Price
#    Group by Commodity → mean(Modal_Price) in ₹/quintal
# ============================================================================
def build_price_mapping() -> dict:
    path = os.path.join(DATA_DIR, "Agriculture_price_dataset.csv")
    print(f"\n[3/3] Loading {path}")

    df = pd.read_csv(path)
    df = df.dropna(subset=["Commodity", "Modal_Price"])
    df = df[df["Modal_Price"] > 0]

    price_map = (
        df.groupby("Commodity")["Modal_Price"].mean().round(2).to_dict()
    )
    # Normalise keys to lowercase for easy lookup
    price_map = {str(k).strip().lower(): float(v) for k, v in price_map.items()}

    joblib.dump(price_map, os.path.join(MODELS_DIR, "price_mapping.joblib"))
    print(f"    Saved: price_mapping.joblib  ({len(price_map)} commodities)")
    return price_map


# ============================================================================
# MAIN
# ============================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("  Smart Farming Advisor — Model Training")
    print("=" * 60)

    crop_classes   = train_crop_model()
    crop_yield_map = train_yield_model()
    price_map      = build_price_mapping()

    print("\n" + "=" * 60)
    print("  All models saved to backend/models/")
    print("=" * 60)
    print(f"\n  Crop classes     ({len(crop_classes)}): {crop_classes}")
    print(f"  Yield map entries : {len(crop_yield_map)}")
    print(f"  Price commodities : {list(price_map.keys())}")
    print("\n  Start the API with:  uvicorn app.main:app --reload")
