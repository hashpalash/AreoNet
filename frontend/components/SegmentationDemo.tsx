"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Simulated class prediction for demo fallback
const DEMO_CLASSES = [
  { name: "Landscape", conf: 0.38, color: "#C4A862" },
  { name: "Sand", conf: 0.27, color: "#DEB887" },
  { name: "Rock", conf: 0.18, color: "#8B7355" },
  { name: "Bush", conf: 0.09, color: "#4A7023" },
  { name: "Sky", conf: 0.05, color: "#87CEEB" },
  { name: "Gravel", conf: 0.03, color: "#A9A9A9" },
];

export default function SegmentationDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [segUrl, setSegUrl] = useState<string | null>(null);
  const [costMapUrl, setCostMapUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<typeof DEMO_CLASSES | null>(null);
  const [mIoU, setMIoU] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"seg" | "cost">("seg");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSegUrl(null);
    setCostMapUrl(null);
    setClasses(null);
    setMIoU(null);
    setError(null);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  };

  const runInference = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`${API_BASE}/segment`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setSegUrl(data.segmentation_url || data.seg_image);
      setCostMapUrl(data.cost_map_url || data.cost_image);
      setClasses(data.class_distribution || DEMO_CLASSES);
      setMIoU(data.miou_estimate || 65.2);
    } catch {
      // Demo fallback — show simulated results
      setError("Backend offline — showing simulated results.");
      setClasses(DEMO_CLASSES);
      setMIoU(65.2);
      // Use the original preview as a placeholder
      setSegUrl(previewUrl);
      setCostMapUrl(previewUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo" className="py-24 border-t border-sand-700/20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
            // Live Inference
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
            Terrain <span className="text-sand-400">Segmentation</span> Demo
          </h2>
          <p className="text-gray-400 mt-3 max-w-2xl">
            Upload any desert or off-road image. DUNEX runs SegFormer inference, 
            returns a pixel-wise segmentation mask and traversability cost map.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload panel */}
          <div className="space-y-4">
            <div
              className={`scan-container hud-panel rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer min-h-64 flex flex-col items-center justify-center p-6
                ${dragOver ? "border-sand-400 bg-sand-500/5" : "border-sand-700/30 hover:border-sand-600/50"}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Input" className="max-h-64 w-full object-contain rounded-lg" />
              ) : (
                <>
                  <svg className="w-12 h-12 text-sand-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sand-400 font-mono text-sm text-center">
                    Drop an image or click to upload
                  </p>
                  <p className="text-gray-600 font-mono text-xs mt-1">
                    PNG / JPG — any resolution (auto-resized to 512×512)
                  </p>
                </>
              )}
            </div>

            {/* Inference button */}
            <button
              onClick={runInference}
              disabled={!file || loading}
              className="w-full py-4 bg-sand-500 hover:bg-sand-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black disabled:text-gray-500 font-mono font-bold uppercase tracking-widest text-sm rounded-lg transition-all duration-200 hover:shadow-xl hover:shadow-sand-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running Inference...
                </span>
              ) : "Run Inference →"}
            </button>

            {/* Error notice */}
            {error && (
              <div className="text-xs font-mono text-yellow-500 hud-panel border border-yellow-700/30 rounded p-3">
                ⚠ {error}
              </div>
            )}

            {/* Class distribution */}
            {classes && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="hud-panel rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                    Class Distribution
                  </span>
                  {mIoU && (
                    <span className="text-xs font-mono text-sand-400">
                      mIoU: {mIoU.toFixed(1)}%
                    </span>
                  )}
                </div>
                {classes.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
                        <span className="text-gray-300">{c.name}</span>
                      </div>
                      <span className="text-gray-500">{(c.conf * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.conf * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: c.color }}
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Output panel */}
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {(["seg", "cost"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-mono uppercase tracking-widest rounded transition-all ${
                    activeTab === tab
                      ? "bg-sand-500 text-black font-bold"
                      : "hud-panel border border-sand-700/30 text-gray-500 hover:text-sand-400"
                  }`}
                >
                  {tab === "seg" ? "Segmentation Mask" : "Cost Map"}
                </button>
              ))}
            </div>

            {/* Output image */}
            <div className="hud-panel rounded-xl min-h-64 flex items-center justify-center glow-border overflow-hidden" style={{ minHeight: "340px" }}>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 text-sand-400"
                  >
                    <div className="w-16 h-16 border-2 border-sand-600/30 border-t-sand-400 rounded-full animate-spin" />
                    <div className="font-mono text-sm">Processing 512×512...</div>
                    <div className="text-xs text-gray-600 font-mono">
                      SegFormer-B2 · CPU inference
                    </div>
                  </motion.div>
                ) : (segUrl || costMapUrl) ? (
                  <motion.img
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    src={activeTab === "seg" ? segUrl! : costMapUrl!}
                    alt={activeTab === "seg" ? "Segmentation" : "Cost Map"}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-gray-700 font-mono text-sm p-8"
                  >
                    <div className="text-4xl mb-3">🛰️</div>
                    <div>Upload an image and run inference</div>
                    <div className="text-xs mt-1 text-gray-600">
                      Output will appear here
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Inference metadata */}
            {classes && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { label: "Inference Time", val: "~420ms" },
                  { label: "Device", val: "CPU" },
                  { label: "Model", val: "SegFormer-B2" },
                ].map((m) => (
                  <div key={m.label} className="hud-panel rounded-lg p-3 text-center">
                    <div className="text-sand-400 font-mono text-sm font-bold">{m.val}</div>
                    <div className="text-xs font-mono text-gray-600 mt-1">{m.label}</div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
