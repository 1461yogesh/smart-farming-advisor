import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sprout, AlertTriangle, Wifi, Github } from "lucide-react";
import type { PredictionRequest, PredictionResponse, AppStatus } from "./types";
import { predictCrop, API_BASE } from "./api/predict";
import InputForm from "./components/InputForm";
import ResultCard from "./components/ResultCard";

// ── Decorative leaf SVG ───────────────────────────────────────────────────────
const LeafDecor: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 80 80"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 70C10 70 20 20 70 10C70 10 60 60 10 70Z"
      fill="currentColor"
      fillOpacity="0.12"
    />
    <path
      d="M10 70L70 10"
      stroke="currentColor"
      strokeWidth="1"
      strokeOpacity="0.2"
    />
  </svg>
);

// ── App ───────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [status, setStatus]   = useState<AppStatus>("idle");
  const [result, setResult]   = useState<PredictionResponse | null>(null);
  const [errMsg, setErrMsg]   = useState<string>("");

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (data: PredictionRequest) => {
    setStatus("loading");
    setResult(null);
    setErrMsg("");

    try {
      const res = await predictCrop(data);
      setResult(res);
      setStatus("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setErrMsg(message);
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setResult(null);
    setErrMsg("");
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Background blobs ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #5fab6b 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #cfa451 0%, transparent 70%)" }}
        />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 pt-10 pb-6 px-4 text-center"
      >
        {/* Leaf decorations */}
        <LeafDecor className="absolute top-4 left-8 w-20 h-20 text-forest-500 rotate-12" />
        <LeafDecor className="absolute top-4 right-8 w-20 h-20 text-forest-500 -rotate-12 scale-x-[-1]" />

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 180 }}
          className="flex justify-center mb-4"
        >
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-forest-800/60 border border-forest-600/30 flex items-center justify-center shadow-lg shadow-forest-900/50">
              <Sprout size={28} className="text-forest-300" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-pulse-slow"
              style={{ boxShadow: "0 0 24px rgba(95,171,107,0.3)" }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
        >
          <h1 className="font-display text-4xl md:text-5xl font-bold text-glow text-earth-50 mb-2">
            Smart Farming Advisor
          </h1>
          <p className="text-earth-300/70 font-body text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Enter your soil and climate data to receive AI-powered crop recommendations,
            yield estimates, and profit forecasts.
          </p>
        </motion.div>

        {/* API indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-1.5 mt-3 text-xs text-forest-500/60 font-body"
        >
          <Wifi size={11} />
          <span>API: {API_BASE}</span>
        </motion.div>
      </motion.header>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-16">
        <AnimatePresence mode="wait">
          {/* ── Form / Loading / Error state ─────────────────────────────── */}
          {(status === "idle" || status === "loading" || status === "error") && (
            <motion.div
              key="form-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="glass rounded-2xl p-6 md:p-8"
            >
              {/* Error banner */}
              <AnimatePresence>
                {status === "error" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6"
                  >
                    <div className="bg-clay-900/60 border border-clay-700/50 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle size={18} className="text-clay-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-clay-300 font-body text-sm font-medium mb-0.5">
                          Prediction failed
                        </p>
                        <p className="text-clay-400/80 font-body text-xs leading-relaxed">
                          {errMsg || "An error occurred. Please check that the backend is running and try again."}
                        </p>
                        <p className="text-clay-500/60 font-body text-xs mt-1">
                          Backend: {API_BASE} · Set VITE_API_BASE_URL in .env to change.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <InputForm
                onSubmit={handleSubmit}
                isLoading={status === "loading"}
              />
            </motion.div>
          )}

          {/* ── Results state ────────────────────────────────────────────── */}
          {status === "success" && result && (
            <motion.div
              key="result-panel"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <ResultCard result={result} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="py-6 text-center text-xs text-earth-500/40 font-body"
      >
        <div className="flex items-center justify-center gap-3">
          <span>Smart Farming Advisor</span>
          <span>·</span>
          <span>RandomForest · scikit-learn · FastAPI</span>
          <span>·</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-earth-400/60 transition-colors"
          >
            <Github size={11} />
            Source
          </a>
        </div>
      </motion.footer>
    </div>
  );
};

export default App;
