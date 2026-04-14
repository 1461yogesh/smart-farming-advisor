import React from "react";
import { motion } from "framer-motion";
import {
  Leaf,
  TrendingUp,
  TrendingDown,
  Wheat,
  IndianRupee,
  Scale,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import type { PredictionResponse } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtNum(value: number, decimals = 2): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Crop colour accent map ────────────────────────────────────────────────────
const cropAccents: Record<string, string> = {
  rice:        "#8ec896",
  wheat:       "#cfa451",
  maize:       "#e8c87a",
  jute:        "#9cb87a",
  cotton:      "#e8e0d4",
  sugarcane:   "#a8d4a8",
  potato:      "#d4b87a",
  tomato:      "#e07b5a",
  onion:       "#c8887a",
  banana:      "#d4c84a",
  mango:       "#e8a440",
  grapes:      "#b870d4",
  apple:       "#e87870",
  orange:      "#e89840",
  coconut:     "#c8a870",
  papaya:      "#e89460",
  muskmelon:   "#e0c870",
  watermelon:  "#70c870",
  pomegranate: "#e85870",
  coffee:      "#8a5c3c",
};

function cropAccent(crop: string): string {
  return cropAccents[crop.toLowerCase()] ?? "#5fab6b";
}

// ── Metric card ───────────────────────────────────────────────────────────────
interface MetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent?: string;
  delay?: number;
}

const MetricCard: React.FC<MetricProps> = ({
  icon, label, value, unit, accent = "#5fab6b", delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    className="glass-light rounded-xl p-4 flex flex-col gap-2"
  >
    <div className="flex items-center gap-2">
      <span style={{ color: accent }} className="opacity-80">{icon}</span>
      <span className="label-tag !mb-0">{label}</span>
    </div>
    <div className="flex items-end gap-1.5">
      <span
        className="font-display text-2xl font-semibold leading-none"
        style={{ color: accent }}
      >
        {value}
      </span>
      <span className="text-xs text-earth-300/60 pb-0.5 font-body">{unit}</span>
    </div>
  </motion.div>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  result: PredictionResponse;
  onReset: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const ResultCard: React.FC<Props> = ({ result, onReset }) => {
  const isProfit = result.estimated_profit >= 0;
  const accent   = cropAccent(result.crop);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      {/* ── Crop hero ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-2xl p-6 mb-6 text-center relative overflow-hidden"
      >
        {/* Glow blob */}
        <div
          className="absolute inset-0 rounded-2xl opacity-10 blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${accent}, transparent 70%)` }}
        />

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.15, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-3"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${accent}22`, border: `2px solid ${accent}44` }}
          >
            <Leaf size={32} style={{ color: accent }} />
          </div>
        </motion.div>

        <p className="label-tag text-center !mb-1" style={{ color: accent }}>
          Recommended Crop
        </p>
        <h2
          className="font-display text-5xl font-bold gold-glow"
          style={{ color: accent }}
        >
          {capitalize(result.crop)}
        </h2>
      </motion.div>

      {/* ── Metrics grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          icon={<Wheat size={16} />}
          label="Yield per Acre"
          value={fmtNum(result.yield_per_acre)}
          unit={result.units.yield_per_acre}
          accent={accent}
          delay={0.1}
        />
        <MetricCard
          icon={<Scale size={16} />}
          label="Total Yield"
          value={fmtNum(result.total_yield)}
          unit={result.units.total_yield}
          accent={accent}
          delay={0.18}
        />
        <MetricCard
          icon={<IndianRupee size={16} />}
          label="Market Price"
          value={fmtINR(result.price_per_quintal)}
          unit={result.units.price_per_quintal}
          accent="#cfa451"
          delay={0.26}
        />
        <MetricCard
          icon={<BarChart3 size={16} />}
          label="Total Cost"
          value={fmtINR(result.total_cost)}
          unit={result.units.total_cost}
          accent="#e07b5a"
          delay={0.34}
        />
      </div>

      {/* ── Profit banner ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
        className={`rounded-2xl p-5 flex items-center justify-between mb-6 ${
          isProfit
            ? "bg-forest-900/60 border border-forest-600/30"
            : "bg-clay-900/40 border border-clay-700/30"
        }`}
      >
        <div className="flex items-center gap-3">
          {isProfit ? (
            <TrendingUp size={28} className="text-forest-400" />
          ) : (
            <TrendingDown size={28} className="text-clay-400" />
          )}
          <div>
            <p className="label-tag !mb-0.5">
              {isProfit ? "Estimated Profit" : "Estimated Loss"}
            </p>
            <p className="text-xs text-earth-300/50 font-body">
              (Total yield × price) − total cost
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`font-display text-3xl font-bold ${
              isProfit ? "text-forest-300" : "text-clay-400"
            }`}
          >
            {isProfit ? "+" : ""}
            {fmtINR(result.estimated_profit)}
          </span>
          <p className="text-xs font-body mt-0.5" style={{ color: isProfit ? "#5fab6b88" : "#c66b4788" }}>
            {result.units.estimated_profit}
          </p>
        </div>
      </motion.div>

      {/* ── Calculation breakdown ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.52 }}
        className="glass-light rounded-xl p-4 mb-6 font-body text-sm"
      >
        <p className="label-tag mb-3">Profit Formula Breakdown</p>
        <div className="space-y-1.5 text-earth-200/70">
          <div className="flex justify-between">
            <span>Total Yield × Market Price</span>
            <span className="text-parchment-300 font-medium">
              {fmtNum(result.total_yield, 2)} × {fmtINR(result.price_per_quintal)} ={" "}
              {fmtINR(result.total_yield * result.price_per_quintal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>− Total Cost</span>
            <span className="text-clay-400 font-medium">
              − {fmtINR(result.total_cost)}
            </span>
          </div>
          <div
            className={`flex justify-between border-t pt-1.5 mt-1.5 font-semibold ${
              isProfit ? "text-forest-300 border-forest-700/40" : "text-clay-400 border-clay-700/40"
            }`}
          >
            <span>= Estimated Profit</span>
            <span>
              {isProfit ? "+" : ""}{fmtINR(result.estimated_profit)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Reset button ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.62 }}
        className="flex justify-center"
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-forest-400 hover:text-forest-300 transition-colors font-body py-2 px-4 rounded-lg hover:bg-forest-900/40"
        >
          <RefreshCw size={14} />
          Run another prediction
        </button>
      </motion.div>
    </motion.div>
  );
};

export default ResultCard;
