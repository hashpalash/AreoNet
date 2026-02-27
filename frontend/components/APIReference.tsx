"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const ENDPOINTS = [
  {
    method: "POST",
    path: "/segment",
    desc: "Upload an image, receive segmentation mask + traversability cost map.",
    body: `# multipart/form-data
file: <image file>`,
    response: `{
  "seg_image": "data:image/png;base64,...",
  "cost_image": "data:image/png;base64,...",
  "class_distribution": [
    { "name": "Sand", "conf": 0.34, "color": "#DEB887" },
    { "name": "Rock", "conf": 0.22, "color": "#8B7355" }
    ...
  ],
  "miou_estimate": 65.2,
  "inference_ms": 420
}`,
    color: "#E8A020",
  },
  {
    method: "POST",
    path: "/costmap",
    desc: "Returns only the traversability cost grid as a 2D array (normalized 0–1).",
    body: `# multipart/form-data
file: <image file>`,
    response: `{
  "cost_grid": [[0.2, 0.9, 0.1, ...], ...],
  "shape": [512, 512],
  "resolution_m": 0.05
}`,
    color: "#10B981",
  },
  {
    method: "GET",
    path: "/health",
    desc: "Check if the inference server is alive and which model is loaded.",
    body: null,
    response: `{
  "status": "ok",
  "model": "segformer-b2-desert",
  "device": "cpu",
  "version": "1.0.0"
}`,
    color: "#3B82F6",
  },
  {
    method: "GET",
    path: "/classes",
    desc: "Returns the full 10-class schema with traversal costs.",
    body: null,
    response: `{
  "classes": [
    { "id": 0, "name": "Rock", "cost": 0.9, "color": "#8B7355" },
    { "id": 1, "name": "Bush", "cost": 0.75, "color": "#4A7023" },
    ...
  ]
}`,
    color: "#8B5CF6",
  },
];

function EndpointCard({ ep, idx }: { ep: typeof ENDPOINTS[0]; idx: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"req" | "res">("res");

  const methodColor =
    ep.method === "POST" ? "#E8A020" : ep.method === "GET" ? "#3B82F6" : "#10B981";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
      className="hud-panel rounded-xl overflow-hidden glow-border"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span
          className="px-2 py-1 text-xs font-mono font-bold rounded"
          style={{ background: `${methodColor}20`, color: methodColor }}
        >
          {ep.method}
        </span>
        <span className="font-mono text-white text-sm">{ep.path}</span>
        <span className="text-gray-500 text-sm flex-1 hidden md:block">{ep.desc}</span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-sand-700/20"
        >
          <div className="p-5 space-y-4">
            <p className="text-gray-400 text-sm">{ep.desc}</p>
            <div className="flex gap-2">
              {ep.body && (
                <button
                  onClick={() => setTab("req")}
                  className={`px-3 py-1 text-xs font-mono uppercase rounded transition-all ${
                    tab === "req" ? "bg-sand-500 text-black" : "text-gray-500 hud-panel border border-gray-700"
                  }`}
                >
                  Request
                </button>
              )}
              <button
                onClick={() => setTab("res")}
                className={`px-3 py-1 text-xs font-mono uppercase rounded transition-all ${
                  tab === "res" ? "bg-sand-500 text-black" : "text-gray-500 hud-panel border border-gray-700"
                }`}
              >
                Response
              </button>
            </div>
            <pre className="bg-dunenet-darker rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto border border-gray-800 leading-relaxed">
              {tab === "req" ? ep.body : ep.response}
            </pre>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function APIReference() {
  return (
    <section id="api" className="py-24 border-t border-sand-700/20">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
            // REST API
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
            API <span className="text-sand-400">Reference</span>
          </h2>
          <div className="flex items-center gap-6 mt-4">
            <p className="text-gray-400 text-sm">
              Base URL:{" "}
              <code className="font-mono text-sand-400 bg-dunenet-darker px-2 py-0.5 rounded">
                http://localhost:8000
              </code>
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-green-400">
              <span className="status-dot" />
              FastAPI · Auto-docs at /docs
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          {ENDPOINTS.map((ep, i) => (
            <EndpointCard key={ep.path} ep={ep} idx={i} />
          ))}
        </div>

        {/* cURL example */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 hud-panel rounded-xl p-6"
        >
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            cURL Example
          </div>
          <pre className="text-xs font-mono text-sand-300 overflow-x-auto leading-relaxed">
{`curl -X POST http://localhost:8000/segment \\
  -F "file=@desert_scene.jpg" \\
  | python -m json.tool`}
          </pre>
        </motion.div>
      </div>
    </section>
  );
}
