import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sprout,
  Thermometer,
  Droplets,
  CloudRain,
  FlaskConical,
  Layers,
  Ruler,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { PredictionRequest, FieldMeta } from "../types";

// ── Field definitions ─────────────────────────────────────────────────────────
const SOIL_FIELDS: FieldMeta[] = [
  {
    key: "N",
    label: "Nitrogen (N)",
    unit: "soil value",
    placeholder: "e.g. 90",
    min: 0,
    step: 1,
    hint: "Nitrogen content of the soil",
  },
  {
    key: "P",
    label: "Phosphorus (P)",
    unit: "soil value",
    placeholder: "e.g. 42",
    min: 0,
    step: 1,
    hint: "Phosphorus content of the soil",
  },
  {
    key: "K",
    label: "Potassium (K)",
    unit: "soil value",
    placeholder: "e.g. 43",
    min: 0,
    step: 1,
    hint: "Potassium content of the soil",
  },
  {
    key: "ph",
    label: "Soil pH",
    unit: "0–14",
    placeholder: "e.g. 6.5",
    min: 0,
    max: 14,
    step: 0.01,
    hint: "pH level of the soil",
  },
];

const CLIMATE_FIELDS: FieldMeta[] = [
  {
    key: "temperature",
    label: "Temperature",
    unit: "°C",
    placeholder: "e.g. 20.9",
    step: 0.1,
    hint: "Average temperature of the region",
  },
  {
    key: "humidity",
    label: "Humidity",
    unit: "%",
    placeholder: "e.g. 82",
    min: 0,
    max: 100,
    step: 0.1,
    hint: "Relative humidity",
  },
  {
    key: "rainfall",
    label: "Rainfall",
    unit: "mm",
    placeholder: "e.g. 202.9",
    min: 0,
    step: 0.1,
    hint: "Annual/seasonal rainfall",
  },
];

const FARM_FIELDS: FieldMeta[] = [
  {
    key: "area",
    label: "Farm Area",
    unit: "acre",
    placeholder: "e.g. 2.5",
    min: 0.01,
    step: 0.01,
    hint: "Total cultivable area (must be > 0)",
  },
  {
    key: "fertilizer",
    label: "Fertilizer",
    unit: "dataset unit",
    placeholder: "e.g. 100",
    min: 0,
    step: 1,
    hint: "Amount of fertilizer applied",
  },
  {
    key: "pesticide",
    label: "Pesticide",
    unit: "dataset unit",
    placeholder: "e.g. 10",
    min: 0,
    step: 0.1,
    hint: "Amount of pesticide applied",
  },
];

// ── Section icon mapping ──────────────────────────────────────────────────────
const sectionIcons: Record<string, React.ReactNode> = {
  "Soil Nutrients": <Layers size={16} />,
  "Climate Data":  <CloudRain size={16} />,
  "Farm Details":  <Ruler size={16} />,
};

// ── Default form values ───────────────────────────────────────────────────────
const DEFAULT_VALUES: PredictionRequest = {
  N: 0,
  P: 0,
  K: 0,
  temperature: 0,
  humidity: 0,
  ph: 0,
  rainfall: 0,
  area: 1,
  fertilizer: 0,
  pesticide: 0,
};

// ── Field icons ───────────────────────────────────────────────────────────────
function fieldIcon(key: keyof PredictionRequest): React.ReactNode {
  const icons: Partial<Record<keyof PredictionRequest, React.ReactNode>> = {
    N:           <FlaskConical size={14} />,
    P:           <FlaskConical size={14} />,
    K:           <FlaskConical size={14} />,
    ph:          <Droplets size={14} />,
    temperature: <Thermometer size={14} />,
    humidity:    <Droplets size={14} />,
    rainfall:    <CloudRain size={14} />,
    area:        <Ruler size={14} />,
    fertilizer:  <Sprout size={14} />,
    pesticide:   <Sprout size={14} />,
  };
  return icons[key] ?? <FlaskConical size={14} />;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  onSubmit: (data: PredictionRequest) => void;
  isLoading: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
const InputForm: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [values, setValues] =
    useState<Record<keyof PredictionRequest, string>>({
      N: "", P: "", K: "", temperature: "", humidity: "",
      ph: "", rainfall: "", area: "", fertilizer: "", pesticide: "",
    });

  const [errors, setErrors] =
    useState<Partial<Record<keyof PredictionRequest, string>>>({});

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (key: keyof PredictionRequest, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): PredictionRequest | null => {
    const newErrors: Partial<Record<keyof PredictionRequest, string>> = {};
    const parsed: Partial<PredictionRequest> = {};

    const allFields: FieldMeta[] = [...SOIL_FIELDS, ...CLIMATE_FIELDS, ...FARM_FIELDS];

    for (const field of allFields) {
      const raw = values[field.key].trim();
      if (raw === "") {
        newErrors[field.key] = "Required";
        continue;
      }
      const num = parseFloat(raw);
      if (isNaN(num)) {
        newErrors[field.key] = "Must be a number";
        continue;
      }
      if (field.min !== undefined && num < field.min) {
        newErrors[field.key] = `Min ${field.min}`;
        continue;
      }
      if (field.max !== undefined && num > field.max) {
        newErrors[field.key] = `Max ${field.max}`;
        continue;
      }
      parsed[field.key] = num;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return null;
    }
    return parsed as PredictionRequest;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = validate();
    if (data) onSubmit(data);
  };

  // ── Render section ─────────────────────────────────────────────────────────
  const renderSection = (
    title: string,
    fields: FieldMeta[],
    idx: number
  ) => (
    <motion.div
      key={title}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Section header */}
      <div className="divider-leaf mb-5">
        <span className="flex items-center gap-1.5 text-forest-300 font-body">
          {sectionIcons[title]}
          {title}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {fields.map((field) => {
          const err = errors[field.key];
          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="label-tag flex items-center gap-1.5">
                <span className="text-forest-400">{fieldIcon(field.key)}</span>
                {field.label}
                <span className="text-parchment-400 font-normal ml-auto">{field.unit}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  className={`input-field ${err ? "!border-clay-400 !shadow-[0_0_0_3px_rgba(198,107,71,0.15)]" : ""}`}
                  placeholder={field.placeholder}
                  value={values[field.key]}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  disabled={isLoading}
                />
                {err && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-clay-400 text-xs mt-1 font-body"
                  >
                    {err}
                  </motion.p>
                )}
              </div>
              {field.hint && !err && (
                <p className="text-xs text-forest-400/60 font-body">{field.hint}</p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      {renderSection("Soil Nutrients", SOIL_FIELDS, 0)}
      {renderSection("Climate Data",  CLIMATE_FIELDS, 1)}
      {renderSection("Farm Details",  FARM_FIELDS, 2)}

      {/* Submit */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38, duration: 0.4 }}
        className="flex justify-center mt-2"
      >
        <button
          type="submit"
          className="btn-primary flex items-center gap-2 px-10"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Analysing…</span>
            </>
          ) : (
            <>
              <Sprout size={18} />
              <span>Get Recommendations</span>
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </motion.div>
    </form>
  );
};

export default InputForm;
