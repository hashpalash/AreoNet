"use client";

import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

const TERRAIN_CLASSES = [
  { id: 0, name: "Rock", color: "#8B7355", traversable: false, cost: 0.9, emoji: "🪨", desc: "Hard rocky outcrops — high obstacle cost" },
  { id: 1, name: "Bush", color: "#4A7023", traversable: false, cost: 0.75, emoji: "🌿", desc: "Dense vegetation — potential entanglement risk" },
  { id: 2, name: "Log", color: "#8B4513", traversable: false, cost: 0.85, emoji: "🪵", desc: "Fallen timber — severe traversal obstacle" },
  { id: 3, name: "Sand", color: "#DEB887", traversable: true, cost: 0.2, emoji: "🏜️", desc: "Loose sand — preferred open path" },
  { id: 4, name: "Landscape", color: "#C4A862", traversable: true, cost: 0.15, emoji: "🌄", desc: "Open desert landscape — safe navigation" },
  { id: 5, name: "Sky", color: "#87CEEB", traversable: false, cost: 0.0, emoji: "☁️", desc: "Background class for horizon masking" },
  { id: 6, name: "Gravel", color: "#A9A9A9", traversable: true, cost: 0.35, emoji: "🪨", desc: "Loose gravel — moderate traction loss" },
  { id: 7, name: "Water", color: "#4169E1", traversable: false, cost: 0.95, emoji: "💧", desc: "Water bodies — avoid completely" },
  { id: 8, name: "Vegetation", color: "#228B22", traversable: true, cost: 0.5, emoji: "🌱", desc: "Low vegetation — passable with care" },
  { id: 9, name: "Obstacle", color: "#DC143C", traversable: false, cost: 1.0, emoji: "🚧", desc: "Generic obstacle — maximum cost, reroute" },
];

export default function TerrainClasses() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="terrain" className="py-24 border-t border-sand-700/20" ref={ref}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-14"
        >
          <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
            // Classification Schema
          </p>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
            10 Terrain <span className="text-sand-400">Classes</span>
          </h2>
          <p className="text-gray-400 mt-3 max-w-2xl">
            DUNEX classifies every pixel into one of 10 semantic terrain categories, 
            each mapped to a traversability cost (0 = free, 1 = impassable) for path planning.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {TERRAIN_CLASSES.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="terrain-chip hud-panel rounded-lg p-4 glow-border group cursor-default"
            >
              {/* Class ID badge */}
              <div className="flex items-start justify-between mb-3">
                <span
                  className="w-8 h-8 flex items-center justify-center rounded text-xs font-mono font-bold text-black"
                  style={{ background: c.color }}
                >
                  {c.id}
                </span>
                <span className="text-2xl">{c.emoji}</span>
              </div>

              {/* Name */}
              <div className="font-display font-semibold text-white mb-1">{c.name}</div>
              <div className="text-xs text-gray-500 mb-3 leading-relaxed">{c.desc}</div>

              {/* Cost bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-600">Traversal Cost</span>
                  <span style={{ color: c.cost > 0.7 ? "#ef4444" : c.cost > 0.4 ? "#eab308" : "#22c55e" }}>
                    {c.cost.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={inView ? { width: `${c.cost * 100}%` } : {}}
                    transition={{ delay: i * 0.06 + 0.3, duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{
                      background: c.cost > 0.7
                        ? "linear-gradient(90deg, #dc2626, #ef4444)"
                        : c.cost > 0.4
                        ? "linear-gradient(90deg, #ca8a04, #eab308)"
                        : "linear-gradient(90deg, #16a34a, #22c55e)",
                    }}
                  />
                </div>
              </div>

              {/* Traversable tag */}
              <div className="mt-2 text-xs font-mono" style={{ color: c.traversable ? "#22c55e" : "#ef4444" }}>
                {c.traversable ? "✓ TRAVERSABLE" : "✗ BLOCKED"}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Color palette */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-10 hud-panel rounded-lg p-4"
        >
          <div className="text-xs font-mono text-gray-600 uppercase tracking-widest mb-3">
            Segmentation Color Palette
          </div>
          <div className="flex gap-2 flex-wrap">
            {TERRAIN_CLASSES.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <div
                  className="w-10 h-10 rounded"
                  style={{ background: c.color, boxShadow: `0 0 8px ${c.color}40` }}
                />
                <span className="text-xs font-mono text-gray-600">{c.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
