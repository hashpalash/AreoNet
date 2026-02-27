"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

const ARCH_STEPS = [
  {
    step: "01",
    title: "Image Capture",
    icon: "📷",
    desc: "512×512 RGB frame from UGV front camera. Pre-processed: normalization, mean subtraction.",
    tech: ["Camera", "OpenCV", "NumPy"],
    color: "#E8A020",
  },
  {
    step: "02",
    title: "SegFormer Inference",
    icon: "🧠",
    desc: "Hierarchical Transformer encoder (Mix Transformer B2) + lightweight MLP decoder. Trained on custom desert dataset.",
    tech: ["HuggingFace", "PyTorch", "SegFormer-B2"],
    color: "#F59E0B",
  },
  {
    step: "03",
    title: "Semantic Mask",
    icon: "🗺️",
    desc: "10-class per-pixel prediction map. Each pixel assigned a semantic label and confidence score.",
    tech: ["Softmax", "ArgMax", "Colorize"],
    color: "#10B981",
  },
  {
    step: "04",
    title: "Traversability Mapping",
    icon: "📊",
    desc: "Semantic mask converted to cost grid. Each class mapped to a traversal cost 0–1 using domain-expert weights.",
    tech: ["Cost Matrix", "Gaussian Blur", "Grid Map"],
    color: "#3B82F6",
  },
  {
    step: "05",
    title: "Path Planning",
    icon: "🛤️",
    desc: "Cost map fed into A* or Dijkstra planner on the UGV compute unit. Optimal path computed avoiding high-cost zones.",
    tech: ["A* Search", "ROS", "Nav2"],
    color: "#8B5CF6",
  },
  {
    step: "06",
    title: "FastAPI + Frontend",
    icon: "🖥️",
    desc: "REST API exposes /segment and /costmap endpoints. Next.js frontend visualizes results in real-time.",
    tech: ["FastAPI", "Next.js", "Three.js"],
    color: "#EC4899",
  },
];

export default function Architecture() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="arch" className="py-24 border-t border-sand-700/20" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="mb-14"
        >
          <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
            // Pipeline
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
            System <span className="text-sand-400">Architecture</span>
          </h2>
          <p className="text-gray-400 mt-3 max-w-2xl">
            End-to-end perception pipeline from raw image capture to autonomous path planning.
          </p>
        </motion.div>

        {/* Pipeline steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sand-600/30 to-transparent" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARCH_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="hud-panel rounded-xl p-6 glow-border group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg"
                    style={{ background: `${s.color}15`, border: `1px solid ${s.color}30` }}
                  >
                    {s.icon}
                  </div>
                  <span className="font-mono text-xs text-gray-700">{s.step}</span>
                </div>

                <h3 className="font-display font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>

                <div className="flex flex-wrap gap-2">
                  {s.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 text-xs font-mono rounded"
                      style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Model details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.7 }}
          className="mt-12 hud-panel rounded-xl p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            { label: "Model Architecture", value: "SegFormer-B2", sub: "Mix Transformer encoder" },
            { label: "Training Dataset", value: "Custom Desert", sub: "10-class desert terrain" },
            { label: "Best Epoch mIoU", value: "65.2%", sub: "Validated on held-out set" },
            { label: "Deployment", value: "Docker + CPU", sub: "ARM/x86 compatible" },
          ].map((item) => (
            <div key={item.label} className="text-center border-r border-sand-700/20 last:border-0 px-4">
              <div className="text-2xl font-display font-bold text-sand-400 mb-1">{item.value}</div>
              <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-1">{item.label}</div>
              <div className="text-xs text-gray-700">{item.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
