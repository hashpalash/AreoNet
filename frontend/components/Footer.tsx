"use client";

import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="border-t border-sand-700/20 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row items-center justify-between gap-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <polygon points="16,2 30,28 2,28" stroke="#E8A020" strokeWidth="2" fill="none" />
              <line x1="16" y1="10" x2="16" y2="22" stroke="#E8A020" strokeWidth="1.5" />
              <circle cx="16" cy="7" r="2" fill="#E8A020" />
            </svg>
            <span className="font-display font-bold text-white tracking-wider">
              DUNE<span className="text-sand-400">X</span>
            </span>
          </div>

          {/* Center text */}
          <div className="text-center text-xs font-mono text-gray-700">
            <div>Autonomous UGV Perception Platform</div>
            <div className="mt-1">
              SegFormer · FastAPI · Next.js · Three.js · Docker
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs font-mono text-gray-600">
            <a href="#demo" className="hover:text-sand-400 transition-colors">Demo</a>
            <a href="#api" className="hover:text-sand-400 transition-colors">API</a>
            <a href="#arch" className="hover:text-sand-400 transition-colors">Docs</a>
            <div className="flex items-center gap-1 text-green-600">
              <span className="status-dot" style={{ width: 6, height: 6 }} />
              ONLINE
            </div>
          </div>
        </motion.div>

        <div className="mt-8 pt-6 border-t border-gray-900 text-center text-xs font-mono text-gray-800">
          Built with PyTorch, HuggingFace Transformers, FastAPI, Next.js 14, React Three Fiber
        </div>
      </div>
    </footer>
  );
}
