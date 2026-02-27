"use client";

import { useRef, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Text, Environment, useProgress, Html } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// ── Terrain heatmap plane ──────────────────────────────────────────────────────
function TraversabilityTerrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geo = new THREE.PlaneGeometry(20, 20, 64, 64);
  const pos = geo.attributes.position;

  // Random terrain bumps
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i); // plane is XZ after rotation
    pos.setZ(i, Math.sin(x * 0.8) * 0.3 + Math.cos(z * 0.6) * 0.4 + Math.random() * 0.15);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();

  const colors: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getZ(i);
    const t = (h + 0.8) / 1.6; // normalize
    // Green (safe) -> Yellow -> Red (danger)
    const r = Math.min(1, t * 2);
    const g = Math.min(1, (1 - t) * 2);
    colors.push(r, g, 0);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  return (
    <mesh ref={meshRef} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <meshStandardMaterial vertexColors wireframe={false} roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

// ── Rover body ─────────────────────────────────────────────────────────────────
function RoverBody({ scanning }: { scanning: boolean }) {
  const group = useRef<THREE.Group>(null);
  const cameraHead = useRef<THREE.Group>(null);
  const antennaRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (group.current) {
      // Gentle float
      group.current.position.y = Math.sin(t.current * 1.2) * 0.08;
    }
    if (cameraHead.current && scanning) {
      cameraHead.current.rotation.y = Math.sin(t.current * 2) * 0.8;
    }
    if (antennaRef.current) {
      antennaRef.current.rotation.y = t.current * 3;
    }
  });

  const steelMat = (
    <meshStandardMaterial color="#2a3040" metalness={0.8} roughness={0.2} />
  );
  const accentMat = (
    <meshStandardMaterial color="#E8A020" metalness={0.6} roughness={0.3} emissive="#E8A020" emissiveIntensity={0.3} />
  );

  return (
    <group ref={group} position={[0, 0.3, 0]}>
      {/* Chassis */}
      <mesh>
        <boxGeometry args={[2, 0.3, 1.1]} />
        {steelMat}
      </mesh>

      {/* Top deck */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[1.6, 0.12, 0.9]} />
        <meshStandardMaterial color="#1a2030" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Camera mast */}
      <mesh position={[0.3, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
        {steelMat}
      </mesh>

      {/* Camera head */}
      <group ref={cameraHead} position={[0.3, 0.9, 0]}>
        <mesh>
          <boxGeometry args={[0.25, 0.18, 0.22]} />
          <meshStandardMaterial color="#111827" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Camera lens */}
        <mesh position={[0.14, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} />
          <meshStandardMaterial color="#0a0a0f" metalness={1} roughness={0} />
        </mesh>
        {/* Lens glow */}
        {scanning && (
          <mesh position={[0.17, 0, 0]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color="#E8A020" emissive="#E8A020" emissiveIntensity={2} />
          </mesh>
        )}
      </group>

      {/* Antenna */}
      <mesh ref={antennaRef} position={[-0.5, 0.65, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        {accentMat}
      </mesh>

      {/* Solar panel left */}
      <mesh position={[0, 0.38, -0.85]}>
        <boxGeometry args={[1.2, 0.04, 0.5]} />
        <meshStandardMaterial color="#1a4060" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Solar panel right */}
      <mesh position={[0, 0.38, 0.85]}>
        <boxGeometry args={[1.2, 0.04, 0.5]} />
        <meshStandardMaterial color="#1a4060" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* 6 Wheels */}
      {[-0.75, 0, 0.75].map((x) =>
        [-0.65, 0.65].map((z) => (
          <WheelAssembly key={`${x}-${z}`} px={x} pz={z} />
        ))
      )}

      {/* Accent strips */}
      <mesh position={[0, -0.1, 0.56]}>
        <boxGeometry args={[1.9, 0.04, 0.02]} />
        {accentMat}
      </mesh>
      <mesh position={[0, -0.1, -0.56]}>
        <boxGeometry args={[1.9, 0.04, 0.02]} />
        {accentMat}
      </mesh>
    </group>
  );
}

function WheelAssembly({ px, pz }: { px: number; pz: number }) {
  const wheelRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.x += delta * 1.5;
  });

  return (
    <group position={[px, -0.22, pz]}>
      {/* Axle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
        <meshStandardMaterial color="#2a3040" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Wheel */}
      <mesh ref={wheelRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.12, 16]} />
        <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.8} />
      </mesh>
      {/* Tread accent */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.19, 0.025, 6, 16]} />
        <meshStandardMaterial color="#E8A020" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ── Scan cone ──────────────────────────────────────────────────────────────────
function ScanCone({ scanning }: { scanning: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.material.opacity = scanning ? 0.05 + Math.sin(t.current * 3) * 0.03 : 0;
    }
  });

  return (
    <mesh ref={ref} position={[0.55, 0.9, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <coneGeometry args={[2.5, 5, 32, 1, true]} />
      <meshBasicMaterial color="#E8A020" transparent opacity={0.06} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Segmentation overlay labels ────────────────────────────────────────────────
const LABELS = [
  { pos: [-3, 0.2, -2] as [number, number, number], label: "ROCK", color: "#8B7355" },
  { pos: [4, 0.3, 1] as [number, number, number], label: "BUSH", color: "#4A7023" },
  { pos: [-4, 0.4, 3] as [number, number, number], label: "SAND", color: "#DEB887" },
  { pos: [3, 0.2, -3] as [number, number, number], label: "GRAVEL", color: "#A9A9A9" },
  { pos: [0, 0.4, 4] as [number, number, number], label: "LOG", color: "#8B4513" },
];

function ClassLabels({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <>
      {LABELS.map((l) => (
        <group key={l.label} position={l.pos}>
          <mesh>
            <boxGeometry args={[0.6, 0.25, 0.02]} />
            <meshBasicMaterial color={l.color} transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.1}
            color="white"
            font="/fonts/JetBrainsMono-Bold.woff"
            anchorX="center"
            anchorY="middle"
          >
            {l.label}
          </Text>
        </group>
      ))}
    </>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-sand-400 font-mono text-sm text-center">
        <div className="mb-2">Loading Scene...</div>
        <div className="w-32 h-1 bg-gray-800 rounded">
          <div className="h-full bg-sand-500 rounded transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </Html>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RoverViewer() {
  const [scanning, setScanning] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showTerrain, setShowTerrain] = useState(true);

  return (
    <div className="max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
              // Digital Twin
            </p>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
              3D Rover <span className="text-sand-400">Simulation</span>
            </h2>
            <p className="text-gray-400 mt-2 max-w-lg">
              Real-time terrain visualization with live segmentation overlay. 
              The rover scans and classifies the environment in-simulation.
            </p>
          </div>
          {/* Controls */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: scanning ? "Stop Scan" : "Start Scan", action: () => setScanning(!scanning) },
              { label: showLabels ? "Hide Labels" : "Show Labels", action: () => setShowLabels(!showLabels) },
              { label: showTerrain ? "Wire Mode" : "Solid Mode", action: () => setShowTerrain(!showTerrain) },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                className="px-4 py-2 text-xs font-mono uppercase tracking-widest hud-panel border border-sand-600/30 hover:border-sand-400/60 text-sand-400 hover:text-sand-300 rounded transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="hud-panel rounded-xl overflow-hidden glow-border" style={{ height: "560px" }}>
          {/* HUD overlays */}
          <div className="absolute top-3 left-3 z-10 font-mono text-xs text-sand-400/80 space-y-1 pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="status-dot" /> INFERENCE: {scanning ? "ACTIVE" : "IDLE"}
            </div>
            <div>FPS: 60 | RESOLUTION: 512×512</div>
            <div>MODEL: SegFormer-B2 | mIoU: 65.2%</div>
          </div>
          <div className="absolute top-3 right-3 z-10 font-mono text-xs text-sand-400/80 text-right pointer-events-none">
            <div>ORBIT: DRAG TO ROTATE</div>
            <div>ZOOM: SCROLL</div>
          </div>

          <Canvas
            camera={{ position: [6, 5, 8], fov: 45 }}
            style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #0D1117 100%)" }}
            shadows
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} color="#E8A020" intensity={0.5} />

            <Suspense fallback={<Loader />}>
              <Environment preset="night" />
              {showTerrain && <TraversabilityTerrain />}
              <RoverBody scanning={scanning} />
              <ScanCone scanning={scanning} />
              <ClassLabels visible={showLabels} />
              <Grid
                args={[20, 20]}
                cellColor="rgba(232,160,32,0.08)"
                sectionColor="rgba(232,160,32,0.15)"
                fadeDistance={25}
                position={[0, -0.5, 0]}
              />
            </Suspense>

            <OrbitControls
              enablePan={false}
              minDistance={4}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2.1}
              autoRotate
              autoRotateSpeed={0.8}
            />
          </Canvas>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {[
            { color: "#22c55e", label: "Safe (low cost)" },
            { color: "#eab308", label: "Caution" },
            { color: "#ef4444", label: "Obstacle (high cost)" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs font-mono text-gray-500">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
