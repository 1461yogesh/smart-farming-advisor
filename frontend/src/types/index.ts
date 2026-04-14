// ── API Request ──────────────────────────────────────────────────────────────
export interface PredictionRequest {
  N: number;
  P: number;
  K: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
  area: number;
  fertilizer: number;
  pesticide: number;
}

// ── API Response ─────────────────────────────────────────────────────────────
export interface PredictionUnits {
  yield_per_acre: string;
  total_yield: string;
  price_per_quintal: string;
  total_cost: string;
  estimated_profit: string;
}

export interface PredictionResponse {
  crop: string;
  yield_per_acre: number;
  total_yield: number;
  price_per_quintal: number;
  total_cost: number;
  estimated_profit: number;
  units: PredictionUnits;
}

// ── Form field metadata ───────────────────────────────────────────────────────
export interface FieldMeta {
  key: keyof PredictionRequest;
  label: string;
  unit: string;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

// ── UI state ──────────────────────────────────────────────────────────────────
export type AppStatus = "idle" | "loading" | "success" | "error";
