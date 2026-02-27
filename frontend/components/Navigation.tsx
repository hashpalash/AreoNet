"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Rover", href: "#rover" },
  { label: "Terrain", href: "#terrain" },
  { label: "Demo", href: "#demo" },
  { label: "Architecture", href: "#arch" },
  { label: "API", href: "#api" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? "hud-panel border-b border-sand-600/20 py-3" : "py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-8 h-8 relative">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <polygon
                points="16,2 30,28 2,28"
                stroke="#E8A020"
                strokeWidth="2"
                fill="none"
                className="group-hover:fill-sand-600/10 transition-colors"
              />
              <line x1="16" y1="10" x2="16" y2="22" stroke="#E8A020" strokeWidth="1.5" />
              <circle cx="16" cy="7" r="2" fill="#E8A020" />
            </svg>
          </div>
          <span className="text-white font-display font-bold text-lg tracking-wider">
            DUNE
            <span className="text-sand-400">X</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-mono text-gray-400 hover:text-sand-400 transition-colors uppercase tracking-widest"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Status + CTA */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-green-400">
            <span className="status-dot" />
            LIVE
          </div>
          <a
            href="#demo"
            className="px-4 py-2 bg-sand-500 hover:bg-sand-400 text-black font-mono text-xs font-bold uppercase tracking-widest rounded transition-all duration-200 hover:shadow-lg hover:shadow-sand-500/30"
          >
            Run Inference
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-gray-400 hover:text-sand-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden hud-panel border-t border-sand-600/20 px-6 py-4 flex flex-col gap-4"
          >
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-sm font-mono text-gray-400 hover:text-sand-400 transition-colors uppercase tracking-widest"
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
