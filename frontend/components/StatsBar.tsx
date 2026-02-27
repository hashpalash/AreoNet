"use client";

import { useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

const stats = [
  { value: 65, suffix: "%", label: "mIoU Best Epoch", color: "#E8A020" },
  { value: 10, suffix: "", label: "Terrain Classes", color: "#F5C842" },
  { value: 512, suffix: "²", label: "Input Resolution", color: "#E8A020" },
  { value: 100, suffix: "%", label: "CPU Optimized", color: "#F5C842" },
];

function AnimatedNumber({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const val = useMotionValue(0);
  const spring = useSpring(val, { stiffness: 60, damping: 20 });

  useEffect(() => {
    if (inView) val.set(target);
  }, [inView, target, val]);

  useEffect(() => {
    return spring.on("change", (v) => {
      if (ref.current) ref.current.textContent = Math.round(v) + suffix;
    });
  }, [spring, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}

export default function StatsBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
      className="py-12 border-y border-sand-700/20 hud-panel"
    >
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="text-center"
          >
            <div
              className="text-4xl md:text-5xl font-display font-bold mb-2"
              style={{ color: s.color, textShadow: `0 0 20px ${s.color}50` }}
            >
              <AnimatedNumber target={s.value} suffix={s.suffix} />
            </div>
            <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
