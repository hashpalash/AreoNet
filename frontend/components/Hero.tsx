"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TYPEWRITER_STRINGS = [
  "Terrain Segmentation",
  "Obstacle Classification",
  "Traversability Mapping",
  "Path Planning Inference",
];

function useTypewriter(strings: string[], speed = 80, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = strings[idx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && display === current) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && display === "") {
      setDeleting(false);
      setIdx((i) => (i + 1) % strings.length);
    } else {
      timeout = setTimeout(
        () => setDisplay(deleting ? display.slice(0, -1) : current.slice(0, display.length + 1)),
        deleting ? speed / 2 : speed
      );
    }
    return () => clearTimeout(timeout);
  }, [display, deleting, idx, strings, speed, pause]);

  return display;
}

export default function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const typed = useTypewriter(TYPEWRITER_STRINGS);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  // Particle field with mouse parallax
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking
    const m = mouseRef.current;
    const onMouse = (e: MouseEvent) => {
      m.targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
      m.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouse);

    const particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      // Smooth mouse lerp
      m.x += (m.targetX - m.x) * 0.04;
      m.y += (m.targetY - m.y) * 0.04;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Parallax offset for particles
      const offX = m.x * 18;
      const offY = m.y * 12;

      ctx.save();
      ctx.translate(offX, offY);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -60) p.x = canvas.width + 60;
        if (p.x > canvas.width + 60) p.x = -60;
        if (p.y < -60) p.y = canvas.height + 60;
        if (p.y > canvas.height + 60) p.y = -60;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232,160,32,${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach((b) => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(232,160,32,${0.05 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-grid"
    >
      {/* Particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Corner HUD decorations */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-sand-500/30" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-sand-500/30" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-sand-500/30" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-sand-500/30" />

      {/* Radar circle */}
      <div className="absolute right-12 top-32 w-40 h-40 opacity-10 hidden lg:block">
        <div className="w-full h-full rounded-full border border-sand-400" />
        <div className="absolute inset-4 rounded-full border border-sand-400" />
        <div className="absolute inset-8 rounded-full border border-sand-400" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0%, rgba(232,160,32,0.3) 10%, transparent 10%)",
            animation: "radarSweep 4s linear infinite",
          }}
        />
      </div>

      {/* Center content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full hud-panel border border-sand-600/30 text-xs font-mono text-sand-400 mb-8 uppercase tracking-widest"
        >
          <span className="status-dot" />
          Autonomous UGV Perception Platform
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter mb-4"
        >
          <span className="text-white">DUNE</span>
          <span className="text-sand-400 text-glow">X</span>
        </motion.h1>

        {/* Typewriter sub */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl md:text-2xl font-mono text-gray-400 mb-6 h-8"
        >
          <span className="text-sand-300">&gt;&nbsp;</span>
          <span>{typed}</span>
          <span className="text-sand-400 animate-pulse">|</span>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-2xl mx-auto text-gray-400 text-base md:text-lg leading-relaxed mb-10"
        >
          SegFormer-based deep learning system enabling UGVs to understand desert terrain, 
          classify 10 obstacle types, and generate real-time traversability cost maps for 
          autonomous off-road navigation.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#demo"
            className="px-8 py-4 bg-sand-500 hover:bg-sand-400 text-black font-mono font-bold uppercase tracking-widest text-sm rounded transition-all duration-200 hover:shadow-xl hover:shadow-sand-500/30 w-full sm:w-auto text-center"
          >
            Live Inference Demo
          </a>
          <a
            href="#rover"
            className="px-8 py-4 hud-panel border border-sand-600/30 hover:border-sand-400/60 text-sand-400 font-mono text-sm uppercase tracking-widest rounded transition-all duration-200 w-full sm:w-auto text-center"
          >
            3D Rover Twin
          </a>
          <a
            href="#api"
            className="px-8 py-4 hud-panel border border-gray-700/50 hover:border-gray-500/60 text-gray-400 font-mono text-sm uppercase tracking-widest rounded transition-all duration-200 w-full sm:w-auto text-center"
          >
            API Docs
          </a>
        </motion.div>

        {/* Tech stack chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-12"
        >
          {["SegFormer", "PyTorch", "FastAPI", "Next.js", "Three.js", "Docker", "65% mIoU"].map(
            (tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-mono text-sand-300/70 border border-sand-700/30 rounded-full hud-panel"
              >
                {tag}
              </span>
            )
          )}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-mono text-gray-600 uppercase tracking-widest">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-sand-500/40 to-transparent" />
      </motion.div>
    </section>
  );
}
