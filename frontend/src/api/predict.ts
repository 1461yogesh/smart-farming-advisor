import type { PredictionRequest, PredictionResponse } from "../types";

// Safe env access — does NOT crash if import.meta.env is unavailable
function getApiBase(): string {
  try {
    const env = import.meta?.env?.VITE_API_BASE_URL;
    if (typeof env === "string" && env.length > 0) return env;
  } catch {
    // import.meta.env unavailable (e.g., non-Vite environment)
  }
  return "http://127.0.0.1:8000";
}

export const API_BASE = getApiBase();

export async function predictCrop(
  payload: PredictionRequest
): Promise<PredictionResponse> {
  const url = `${API_BASE}/predict`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore JSON parse errors on error bodies
    }
    throw new Error(detail);
  }

  return response.json() as Promise<PredictionResponse>;
}
