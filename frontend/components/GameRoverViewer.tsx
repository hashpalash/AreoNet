"use client";

import React, {
  useRef, useMemo, useState, useEffect, useCallback, Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, Text, Html, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────
const GRID = 48;
const WORLD = 20;
const CELL = WORLD / (GRID - 1);
const ROVER_H = 0.35;

// ─── Terrain Class Definitions (10 classes) ────────────────────────────────────
const TC = [
  { id: 0,  name: "Rock",       rgb: [130, 108,  78] as [number,number,number], cost: 0.9,  trav: false, hBase: 0.55, hVar: 0.5,  rough: 0.95, metal: 0.04 },
  { id: 1,  name: "Bush",       rgb: [ 55,  90,  28] as [number,number,number], cost: 0.75, trav: false, hBase: 0.35, hVar: 0.2,  rough: 0.98, metal: 0.0  },
  { id: 2,  name: "Log",        rgb: [105,  55,  18] as [number,number,number], cost: 0.85, trav: false, hBase: 0.22, hVar: 0.12, rough: 0.96, metal: 0.0  },
  { id: 3,  name: "Sand",       rgb: [205, 168, 110] as [number,number,number], cost: 0.2,  trav: true,  hBase: 0.08, hVar: 0.08, rough: 0.98, metal: 0.0  },
  { id: 4,  name: "Landscape",  rgb: [172, 145,  78] as [number,number,number], cost: 0.15, trav: true,  hBase: 0.18, hVar: 0.15, rough: 0.92, metal: 0.0  },
  { id: 5,  name: "Clear",      rgb: [185, 192, 178] as [number,number,number], cost: 0.1,  trav: true,  hBase: 0.02, hVar: 0.04, rough: 0.85, metal: 0.0  },
  { id: 6,  name: "Gravel",     rgb: [138, 135, 128] as [number,number,number], cost: 0.35, trav: true,  hBase: 0.12, hVar: 0.06, rough: 0.9,  metal: 0.05 },
  { id: 7,  name: "Water",      rgb: [ 24,  68, 155] as [number,number,number], cost: 0.95, trav: false, hBase:-0.25, hVar: 0.02, rough: 0.04, metal: 0.85 },
  { id: 8,  name: "Vegetation", rgb: [ 38, 115,  38] as [number,number,number], cost: 0.5,  trav: true,  hBase: 0.28, hVar: 0.12, rough: 0.98, metal: 0.0  },
  { id: 9,  name: "Obstacle",   rgb: [195,  18,  45] as [number,number,number], cost: 1.0,  trav: false, hBase: 0.8,  hVar: 0.4,  rough: 0.78, metal: 0.22 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface Cell { classId: number; height: number; cost: number; trav: boolean; }
type Grid = Cell[][];
type GPos = { i: number; j: number };
type CamMode = "follow" | "top" | "pivot";
// pivot camera state persists across renders
const pivotState = { yaw: 0.3, pitch: 0.4, dist: 12 };

// ─── Utilities ────────────────────────────────────────────────────────────────
const pr = (x: number, y: number): number => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

const gridToWorld = (i: number, j: number): THREE.Vector3 =>
  new THREE.Vector3(-WORLD / 2 + i * CELL, 0, -WORLD / 2 + j * CELL);

const worldToGrid = (wx: number, wz: number): GPos => ({
  i: Math.max(0, Math.min(GRID - 1, Math.round((wx + WORLD / 2) / CELL))),
  j: Math.max(0, Math.min(GRID - 1, Math.round((wz + WORLD / 2) / CELL))),
});

const getH = (hd: Float32Array, wx: number, wz: number): number => {
  const { i, j } = worldToGrid(wx, wz);
  return hd[j * GRID + i] ?? 0;
};

const lerpAngle = (a: number, b: number, t: number): number => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

// ─── A* Pathfinding ───────────────────────────────────────────────────────────
function astar(grid: Grid, start: GPos, goal: GPos): GPos[] {
  const key = (p: GPos) => p.i * GRID + p.j;
  const h = (p: GPos) => Math.hypot(p.i - goal.i, p.j - goal.j);

  type Node = { pos: GPos; g: number; f: number };
  const open: Node[] = [];
  const gMap = new Map<number, number>();
  const from = new Map<number, GPos>();

  const startKey = key(start);
  gMap.set(startKey, 0);
  open.push({ pos: start, g: 0, f: h(start) });

  const dirs: GPos[] = [
    { i: 1, j: 0 }, { i: -1, j: 0 }, { i: 0, j: 1 }, { i: 0, j: -1 },
    { i: 1, j: 1 }, { i: 1, j: -1 }, { i: -1, j: 1 }, { i: -1, j: -1 },
  ];

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.pos);

    if (cur.pos.i === goal.i && cur.pos.j === goal.j) {
      // Reconstruct path
      const path: GPos[] = [];
      let p: GPos | undefined = goal;
      while (p) {
        path.unshift(p);
        p = from.get(key(p));
      }
      return path;
    }

    for (const d of dirs) {
      const nb: GPos = { i: cur.pos.i + d.i, j: cur.pos.j + d.j };
      if (nb.i < 0 || nb.j < 0 || nb.i >= GRID || nb.j >= GRID) continue;
      const cell = grid[nb.j]?.[nb.i];
      if (!cell || !cell.trav) continue;

      const diag = d.i !== 0 && d.j !== 0;
      const moveCost = (diag ? 1.414 : 1) * (0.1 + cell.cost);
      const tg = (gMap.get(ck) ?? Infinity) + moveCost;
      const nk = key(nb);

      if (tg < (gMap.get(nk) ?? Infinity)) {
        gMap.set(nk, tg);
        from.set(nk, cur.pos);
        open.push({ pos: nb, g: tg, f: tg + h(nb) });
      }
    }
  }
  return [goal]; // fallback – direct
}

// ─── Terrain Presets ──────────────────────────────────────────────────────────
function buildGrid(fn: (i: number, j: number) => number): Grid {
  return Array.from({ length: GRID }, (_, j) =>
    Array.from({ length: GRID }, (_, i) => {
      const cid = fn(i, j);
      const t = TC[cid];
      const h = t.hBase + pr(i * 3 + cid, j * 7 + cid) * t.hVar;
      return { classId: cid, height: h, cost: t.cost, trav: t.trav };
    })
  );
}

type TerrainKey = "desert" | "rocky" | "mixed";

const TERRAIN_GENS: Record<TerrainKey, () => Grid> = {
  desert: () =>
    buildGrid((i, j) => {
      const nx = i / (GRID - 1), nz = j / (GRID - 1);
      const wave =
        0.4 * Math.sin(nx * Math.PI * 3) * Math.cos(nz * Math.PI * 2.5) +
        0.2 * Math.sin(nx * Math.PI * 9 + 1.2) +
        0.1 * Math.cos(nz * Math.PI * 7 + 0.7);
      const r = pr(i + 7, j + 13);
      if (wave > 0.38) return r > 0.6 ? 9 : 0;
      if (wave > 0.22 && r > 0.78) return 1;
      if (wave > 0.15 && r > 0.88) return 2;
      if (r > 0.96) return 9;
      return wave > 0.05 ? 3 : 4;
    }),

  rocky: () =>
    buildGrid((i, j) => {
      const nx = i / (GRID - 1), nz = j / (GRID - 1);
      const centDist = Math.abs(nx - 0.5);
      const wave =
        0.55 * Math.sin(nx * Math.PI * 5) * Math.cos(nz * Math.PI * 4) +
        0.3 * Math.sin(nz * Math.PI * 8 + 2.1);
      const r = pr(i * 2 + 3, j * 5 + 1);
      if (centDist < 0.12) return r > 0.85 ? 2 : r > 0.6 ? 6 : 3; // gravel corridor
      if (wave > 0.32) return r > 0.55 ? 9 : 0;
      if (wave > 0.10) return r > 0.82 ? 0 : 6;
      if (r > 0.88) return 1;
      return 8;
    }),

  mixed: () =>
    buildGrid((i, j) => {
      const nx = i / (GRID - 1), nz = j / (GRID - 1);
      const r = pr(i * 4 + 5, j * 9 + 2);
      const wave =
        0.35 * Math.sin(nx * Math.PI * 4) * Math.cos(nz * Math.PI * 3) +
        0.15 * Math.sin(nx * Math.PI * 10 + 1.5);

      // Water zone – bottom-right corner
      if (nx > 0.65 && nz > 0.65) {
        const wd = Math.hypot(nx - 0.82, nz - 0.82);
        if (wd < 0.2) return 7;
        if (wd < 0.28) return 6;
      }
      // Vegetation zone – top-left
      if (nx < 0.35 && nz < 0.35) return r > 0.65 ? 8 : r > 0.45 ? 1 : 4;
      // Rocky zone – top-right
      if (nx > 0.65 && nz < 0.35) {
        if (wave > 0.28) return r > 0.5 ? 9 : 0;
        return 0;
      }
      // Obstacle strip
      if (Math.abs(nx - 0.5) < 0.04 && r > 0.7) return 9;
      // Logs scattered
      if (r > 0.94) return 2;
      // Bush patches
      if (r > 0.87) return 1;
      // Clear patches
      if (nx > 0.3 && nx < 0.7 && nz > 0.3 && nz < 0.7 && r > 0.78) return 5;
      // Default corridor variants
      return wave > 0.18 ? 3 : wave > 0.08 ? 4 : 6;
    }),
};

const TERRAIN_META: Record<TerrainKey, { label: string; desc: string }> = {
  desert: { label: "Desert Wastes",   desc: "Sand dunes, rock outcrops, sparse bush" },
  rocky:  { label: "Rocky Canyon",    desc: "Narrow gravel corridor through dense rock" },
  mixed:  { label: "Mixed Biome",     desc: "All 10 terrain classes · Water · Forest" },
};

// ─── Sky Dome ─────────────────────────────────────────────────────────────────
function SkyDome() {
  const sunRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt * 0.04;
    if (sunRef.current) {
      (sunRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.92 + Math.sin(t.current * 3) * 0.04;
    }
    if (haloRef.current) {
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.18 + Math.sin(t.current * 2) * 0.06;
      haloRef.current.scale.setScalar(1 + Math.sin(t.current) * 0.04);
    }
  });
  return (
    <group>
      {/* Sky hemisphere */}
      <mesh>
        <sphereGeometry args={[55, 32, 16]} />
        <meshBasicMaterial
          color="#1a2b1a"
          side={THREE.BackSide}
        />
      </mesh>
      {/* Horizon haze band */}
      <mesh rotation={[0, 0, 0]}>
        <cylinderGeometry args={[54, 54, 6, 64, 1, true]} />
        <meshBasicMaterial color="#3d4a20" transparent opacity={0.45} side={THREE.BackSide} />
      </mesh>
      {/* Sun disc */}
      <mesh ref={sunRef} position={[18, 38, -30]}>
        <sphereGeometry args={[2.2, 16, 16]} />
        <meshBasicMaterial color="#ffe066" transparent opacity={0.95} />
      </mesh>
      {/* Sun halo */}
      <mesh ref={haloRef} position={[18, 38, -30]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#ffdd88" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

// ─── Water Surface ─────────────────────────────────────────────────────────────
function WaterTile({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * 6);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.position.y = -0.3 + Math.sin(t.current * 1.4 + x * 0.5 + z * 0.3) * 0.07;
      (ref.current.material as THREE.MeshStandardMaterial).opacity =
        0.72 + Math.sin(t.current * 2.5) * 0.1;
    }
  });
  return (
    <mesh ref={ref} position={[x, -0.3, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[CELL * 1.05, CELL * 1.05]} />
      <meshStandardMaterial
        color="#1e6080"
        transparent
        opacity={0.75}
        roughness={0.05}
        metalness={0.3}
        envMapIntensity={1}
      />
    </mesh>
  );
}

function WaterSurface({ terrain }: { terrain: Grid }) {
  const tiles = useMemo(() => {
    const out: { x: number; z: number; key: string }[] = [];
    for (let j = 0; j < GRID; j++)
      for (let i = 0; i < GRID; i++)
        if (terrain[j][i].classId === 7) {
          const w = gridToWorld(i, j);
          out.push({ x: w.x, z: w.z, key: `${i}-${j}` });
        }
    return out;
  }, [terrain]);
  return <>{tiles.map((t) => <WaterTile key={t.key} x={t.x} z={t.z} />)}</>;
}

// ─── Dust Particles ────────────────────────────────────────────────────────────
function DustCloud({ roverPosRef }: { roverPosRef: React.MutableRefObject<THREE.Vector3> }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 60;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() =>
    Array.from({ length: COUNT }, () => ({
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 1.2,
        (Math.random() - 0.5) * 3
      ),
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.6,
    })),
  []);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (!meshRef.current) return;
    const rp = roverPosRef.current;
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      p.offset.y += p.speed * dt * 0.3;
      if (p.offset.y > 1.8) p.offset.y = 0;
      dummy.position.set(
        rp.x + p.offset.x,
        rp.y + p.offset.y,
        rp.z + p.offset.z
      );
      const s = 0.04 + 0.04 * Math.sin(t.current * p.speed + p.phase);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#c8a96e" transparent opacity={0.18} />
    </instancedMesh>
  );
}

// ─── Terrain Details (rocks + bushes) ─────────────────────────────────────────
function TerrainDetails({ terrain }: { terrain: Grid }) {
  const { rocks, bushes } = useMemo(() => {
    const rk: THREE.Matrix4[] = [];
    const bsh: THREE.Matrix4[] = [];
    const m = new THREE.Object3D();
    for (let j = 1; j < GRID - 1; j += 2)
      for (let i = 1; i < GRID - 1; i += 2) {
        const c = terrain[j][i];
        if (c.classId === 0) { // Rock
          const w = gridToWorld(i, j);
          const hd: Float32Array = (window as any).__heightData;
          const hy = hd ? getH(hd, w.x, w.z) : 0;
          m.position.set(w.x + (Math.random()-0.5)*0.3, hy + 0.1, w.z + (Math.random()-0.5)*0.3);
          m.rotation.set(Math.random()*0.4, Math.random()*Math.PI*2, Math.random()*0.3);
          const s = 0.12 + Math.random() * 0.18;
          m.scale.setScalar(s);
          m.updateMatrix();
          rk.push(m.matrix.clone());
        } else if (c.classId === 1) { // Bush
          const w = gridToWorld(i, j);
          const hd: Float32Array = (window as any).__heightData;
          const hy = hd ? getH(hd, w.x, w.z) : 0;
          m.position.set(w.x, hy + 0.15, w.z);
          m.rotation.y = Math.random()*Math.PI*2;
          const s = 0.1 + Math.random()*0.14;
          m.scale.setScalar(s);
          m.updateMatrix();
          bsh.push(m.matrix.clone());
        }
      }
    return { rocks: rk, bushes: bsh };
  }, [terrain]);

  const rockMeshRef = useRef<THREE.InstancedMesh>(null);
  const bushMeshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (rockMeshRef.current) {
      rocks.forEach((mat, i) => rockMeshRef.current!.setMatrixAt(i, mat));
      rockMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [rocks]);

  useEffect(() => {
    if (bushMeshRef.current) {
      bushes.forEach((mat, i) => bushMeshRef.current!.setMatrixAt(i, mat));
      bushMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [bushes]);

  return (
    <>
      {rocks.length > 0 && (
        <instancedMesh ref={rockMeshRef} args={[undefined, undefined, rocks.length]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6e6458" roughness={0.94} metalness={0.05} />
        </instancedMesh>
      )}
      {bushes.length > 0 && (
        <instancedMesh ref={bushMeshRef} args={[undefined, undefined, bushes.length]} castShadow>
          <sphereGeometry args={[1, 5, 4]} />
          <meshStandardMaterial color="#2d4a1a" roughness={0.9} metalness={0} />
        </instancedMesh>
      )}
    </>
  );
}

// ─── Terrain Mesh ─────────────────────────────────────────────────────────────
function TerrainMesh({
  terrain, onClickTerrain,
}: {
  terrain: Grid;
  onClickTerrain: (pt: THREE.Vector3) => void;
}) {
  const { geometry, heightData } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD, WORLD, GRID - 1, GRID - 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colorArr: number[] = [];
    const hd = new Float32Array(GRID * GRID);

    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const idx = j * GRID + i;
        const cell = terrain[j][i];
        pos.setZ(idx, cell.height);
        hd[idx] = cell.height;
        const tc = TC[cell.classId];
        const rgb = tc.rgb;
        // Subtle per-vertex color jitter for a more natural look
        const jitter = () => (Math.random() - 0.5) * 0.06;
        colorArr.push(
          Math.max(0, Math.min(1, rgb[0] / 255 + jitter())),
          Math.max(0, Math.min(1, rgb[1] / 255 + jitter())),
          Math.max(0, Math.min(1, rgb[2] / 255 + jitter()))
        );
      }
    }

    geo.setAttribute("color", new THREE.Float32BufferAttribute(colorArr, 3));
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return { geometry: geo, heightData: hd };
  }, [terrain]);

  // expose heightData via a ref trick
  const hdRef = useRef(heightData);
  useEffect(() => { hdRef.current = heightData; }, [heightData]);
  // Expose via global for other components
  useEffect(() => {
    (window as any).__heightData = heightData;
    (window as any).__terrain = terrain;
  }, [heightData, terrain]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onClickTerrain(e.point);
      }}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.88}
        metalness={0.04}
        envMapIntensity={0.5}
      />
    </mesh>
  );
}

// ─── Path Line ────────────────────────────────────────────────────────────────
function PathLine({ path }: { path: GPos[] }) {
  const pts = useMemo(() => {
    if (path.length < 2) return null;
    const hd: Float32Array = (window as any).__heightData;
    if (!hd) return null;
    return path.map((p) => {
      const w = gridToWorld(p.i, p.j);
      return new THREE.Vector3(w.x, hd[p.j * GRID + p.i] + 0.12, w.z);
    });
  }, [path]);

  if (!pts || pts.length < 2) return null;
  return (
    <Line points={pts} color="#E8A020" lineWidth={2} dashed dashSize={0.18} gapSize={0.1} />
  );
}

// ─── Target Marker ────────────────────────────────────────────────────────────
function TargetMarker({ target }: { target: GPos | null }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    if (ringRef.current) {
      ringRef.current.rotation.y = t.current * 2;
      const s = 1 + 0.25 * Math.sin(t.current * 4);
      ringRef.current.scale.set(s, s, s);
    }
  });

  if (!target) return null;
  const hd: Float32Array = (window as any).__heightData;
  const h = hd ? hd[target.j * GRID + target.i] : 0;
  const w = gridToWorld(target.i, target.j);

  return (
    <group position={[w.x, h + 0.08, w.z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 32]} />
        <meshBasicMaterial color="#E8A020" transparent opacity={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.2, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Wheel ────────────────────────────────────────────────────────────────────
function Wheel({ px, pz, speed }: { px: number; pz: number; speed: number }) {
  const wheelRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (wheelRef.current) wheelRef.current.rotation.x += dt * speed * 3.8;
  });
  return (
    <group position={[px, -0.22, pz]}>
      {/* Axle */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.16, 8]} />
        <meshStandardMaterial color="#1e2535" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Tyre */}
      <group ref={wheelRef} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.21, 0.21, 0.12, 20]} />
          <meshStandardMaterial color="#0e1218" metalness={0.1} roughness={0.92} />
        </mesh>
        {/* Tread rings */}
        {[-0.038, 0, 0.038].map((dy) => (
          <mesh key={dy} position={[dy, 0, 0]}>
            <torusGeometry args={[0.21, 0.018, 4, 20]} />
            <meshStandardMaterial color="#1a1f28" metalness={0.1} roughness={0.95} />
          </mesh>
        ))}
      </group>
      {/* Hub */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.13, 6]} />
        <meshStandardMaterial color="#E8A020" metalness={0.7} roughness={0.2}
          emissive="#E8A020" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

// ─── Rover Body ───────────────────────────────────────────────────────────────
function RoverBody({ speed, scanning }: { speed: number; scanning: boolean }) {
  const bodyRef    = useRef<THREE.Group>(null);
  const camHead    = useRef<THREE.Group>(null);
  const antRef     = useRef<THREE.Mesh>(null);
  const glowRef    = useRef<THREE.Mesh>(null);
  const plRef      = useRef<THREE.PointLight>(null);
  const t          = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    // Gentle bob
    if (bodyRef.current)
      bodyRef.current.position.y = Math.sin(t.current * 2.2) * 0.018;
    // Camera scanning sweep
    if (camHead.current && scanning)
      camHead.current.rotation.y = Math.sin(t.current * 1.8) * 0.95;
    // Antenna spin
    if (antRef.current) antRef.current.rotation.y = t.current * 2.5;
    // Ground glow pulse
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.12 + Math.sin(t.current * 3) * 0.06;
    }
    if (plRef.current)
      plRef.current.intensity = 0.5 + Math.sin(t.current * 3) * 0.2;
  });

  return (
    <group ref={bodyRef}>
      {/* Ground glow disc */}
      <mesh ref={glowRef} position={[0, -0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#E8A020" transparent opacity={0.15} />
      </mesh>
      <pointLight ref={plRef} position={[0, -0.2, 0]} color="#E8A020" intensity={0.5} distance={3} />

      {/* Chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2, 0.3, 1.1]} />
        <meshStandardMaterial color="#1e2535" metalness={0.85} roughness={0.22} />
      </mesh>
      {/* Top deck */}
      <mesh position={[0, 0.26, 0]} castShadow>
        <boxGeometry args={[1.6, 0.11, 0.88]} />
        <meshStandardMaterial color="#141c2a" metalness={0.75} roughness={0.28} />
      </mesh>
      {/* Armour ridge */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.4, 0.05, 0.55]} />
        <meshStandardMaterial color="#2a3550" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Mast */}
      <mesh position={[0.35, 0.55, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.72, 8]} />
        <meshStandardMaterial color="#2a3040" metalness={0.88} roughness={0.2} />
      </mesh>
      {/* Camera head */}
      <group ref={camHead} position={[0.35, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.26, 0.19, 0.24]} />
          <meshStandardMaterial color="#0d1218" metalness={0.92} roughness={0.1} />
        </mesh>
        {/* Lens ring */}
        <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.05, 0.012, 8, 16]} />
          <meshStandardMaterial color="#E8A020" metalness={0.7} roughness={0.2} />
        </mesh>
        {/* Lens glass */}
        <mesh position={[0.155, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.01, 16]} />
          <meshStandardMaterial color="#08111e" metalness={1} roughness={0} />
        </mesh>
        {scanning && (
          <pointLight position={[0.18, 0, 0]} color="#E8A020" intensity={0.8} distance={2.5} />
        )}
        {scanning && (
          <mesh position={[0.17, 0, 0]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial
              color="#E8A020" emissive="#E8A020" emissiveIntensity={3}
            />
          </mesh>
        )}
      </group>
      {/* Antenna */}
      <mesh ref={antRef} position={[-0.52, 0.68, 0]}>
        <cylinderGeometry args={[0.018, 0.014, 0.62, 6]} />
        <meshStandardMaterial color="#E8A020" metalness={0.7} roughness={0.2}
          emissive="#E8A020" emissiveIntensity={0.4} />
      </mesh>
      {/* Antenna tip */}
      <mesh position={[-0.52, 1.0, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={2} />
      </mesh>
      {/* Solar panels */}
      {[-0.88, 0.88].map((z) => (
        <group key={z} position={[0, 0.39, z]}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.035, 0.52]} />
            <meshStandardMaterial color="#112840" metalness={0.6} roughness={0.45} />
          </mesh>
          {/* Panel cell grid lines */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[1.18, 0.005, 0.5]} />
            <meshStandardMaterial color="#1a4a6e" metalness={0.4} roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Accent strips */}
      {[-0.58, 0.58].map((z) => (
        <mesh key={z} position={[0, -0.08, z]}>
          <boxGeometry args={[1.92, 0.035, 0.018]} />
          <meshStandardMaterial color="#E8A020" metalness={0.65} roughness={0.25}
            emissive="#E8A020" emissiveIntensity={0.35} />
        </mesh>
      ))}
      {/* Front bumper bar */}
      <mesh position={[1.03, -0.06, 0]}>
        <boxGeometry args={[0.06, 0.22, 1.14]} />
        <meshStandardMaterial color="#E8A020" metalness={0.7} roughness={0.2}
          emissive="#E8A020" emissiveIntensity={0.2} />
      </mesh>
      {/* Wheels (3 axles × 2 sides) */}
      {[-0.75, 0, 0.75].flatMap((x) =>
        [-0.65, 0.65].map((z) => (
          <Wheel key={`${x}-${z}`} px={x} pz={z} speed={speed} />
        ))
      )}
    </group>
  );
}

// ─── Scan Cone ────────────────────────────────────────────────────────────────
function ScanCone({ active }: { active: boolean }) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (outerRef.current) {
      (outerRef.current.material as THREE.MeshBasicMaterial).opacity =
        active ? 0.05 + Math.sin(t.current * 3) * 0.03 : 0;
    }
    if (innerRef.current) {
      (innerRef.current.material as THREE.MeshBasicMaterial).opacity =
        active ? 0.09 + Math.sin(t.current * 4 + 1) * 0.04 : 0;
    }
  });
  return (
    <group position={[0.35, 0.95, 0]} rotation={[0, 0, -Math.PI / 2]}>
      <mesh ref={outerRef}>
        <coneGeometry args={[3.2, 6, 32, 1, true]} />
        <meshBasicMaterial color="#E8A020" transparent opacity={0.05} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={innerRef}>
        <coneGeometry args={[1.4, 6, 24, 1, true]} />
        <meshBasicMaterial color="#ffcc44" transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ─── Terrain Zone Labels ──────────────────────────────────────────────────────
function ZoneLabels({ terrain }: { terrain: Grid }) {
  // Find representative cells per class
  const zones = useMemo((): Array<{ name: string; color: string; pos: [number, number, number] }> => {
    const seen = new Set<number>();
    const result: Array<{ name: string; color: string; pos: [number, number, number] }> = [];
    const hd: Float32Array = (window as any).__heightData;
    for (let j = 2; j < GRID - 2; j += 6) {
      for (let i = 2; i < GRID - 2; i += 6) {
        const c = terrain[j][i];
        if (seen.has(c.classId)) continue;
        seen.add(c.classId);
        const tc = TC[c.classId];
        const w = gridToWorld(i, j);
        const h = hd ? hd[j * GRID + i] : 0;
        result.push({
          name: tc.name,
          color: `rgb(${tc.rgb[0]},${tc.rgb[1]},${tc.rgb[2]})`,
          pos: [w.x, h + 0.55, w.z],
        });
        if (seen.size === 10) break;
      }
      if (seen.size === 10) break;
    }
    return result;
  }, [terrain]);

  return (
    <>
      {zones.map(({ name, color, pos }) => (
        <group key={name} position={pos}>
          <mesh rotation={[0, 0, 0]}>
            <boxGeometry args={[0.7, 0.22, 0.02]} />
            <meshBasicMaterial color={color} transparent opacity={0.85} />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.09}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {name.toUpperCase()}
          </Text>
        </group>
      ))}
    </>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-yellow-400 font-mono text-sm text-center">
        Loading scene… {Math.round(progress)}%
      </div>
    </Html>
  );
}

// ─── Game Controller (inside Canvas) ─────────────────────────────────────────
interface GameControllerProps {
  terrain: Grid;
  target: GPos | null;
  camMode: CamMode;
  roverSpeed: number;
  scanning: boolean;
  showLabels: boolean;
  onTargetUpdate: (t: GPos) => void;
  onHudUpdate: (h: HudState) => void;
}

interface HudState {
  x: string; z: string; heading: string; speed: string; terrain: string; wpt: string;
}

function GameController({
  terrain, target, camMode, roverSpeed, scanning, showLabels,
  onTargetUpdate, onHudUpdate,
}: GameControllerProps) {
  const worldPos   = useRef(new THREE.Vector3(0, 0.35, 0));
  const heading    = useRef(0);
  const wpIdx      = useRef(0);
  const curGrid    = useRef<GPos>({ i: GRID >> 1, j: GRID >> 1 });
  const curSpeed   = useRef(0);
  const frameN     = useRef(0);
  const roverGroup = useRef<THREE.Group>(null);
  // Path lives entirely inside the controller for zero-latency updates
  const pathRef    = useRef<GPos[]>([]);
  const [vizPath, setVizPath] = useState<GPos[]>([]);
  const { camera, gl } = useThree();

  // Pivot drag
  useEffect(() => {
    if (camMode !== "pivot") return;
    const canvas = gl.domElement;
    let dragging = false;
    let lastX = 0; let lastY = 0;
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const up   = () => { dragging = false; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      pivotState.yaw   -= (e.clientX - lastX) * 0.005;
      pivotState.pitch  = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, pivotState.pitch + (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    };
    const wheel = (e: WheelEvent) => { pivotState.dist = Math.max(4, Math.min(35, pivotState.dist + e.deltaY * 0.01)); };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerup",   up);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("wheel",       wheel, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup",   up);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("wheel",       wheel);
    };
  }, [camMode, gl]);

  const handleTerrainClick = useCallback(
    (pt: THREE.Vector3) => {
      const tgt = worldToGrid(pt.x, pt.z);
      onTargetUpdate(tgt);
      const newPath = astar(terrain, curGrid.current, tgt);
      pathRef.current = newPath;   // instant — no React wait
      wpIdx.current   = 0;
      setVizPath(newPath);         // update PathLine visually
    },
    [terrain, onTargetUpdate]
  );

  useFrame((state, dt) => {
    frameN.current++;
    const p = pathRef.current;

    // Move rover
    if (p.length > 0 && wpIdx.current < p.length) {
      const wp = p[wpIdx.current];
      const ww = gridToWorld(wp.i, wp.j);
      const hd: Float32Array = (window as any).__heightData;

      const dx = ww.x - worldPos.current.x;
      const dz = ww.z - worldPos.current.z;
      const dist = Math.hypot(dx, dz);

      if (dist < CELL * 0.6) {
        curGrid.current = wp;
        wpIdx.current++;
        curSpeed.current = roverSpeed;
      } else {
        const s = roverSpeed * dt;
        const nx = worldPos.current.x + (dx / dist) * s;
        const nz = worldPos.current.z + (dz / dist) * s;
        const ny = (hd ? getH(hd, nx, nz) : 0) + ROVER_H;
        worldPos.current.set(nx, ny, nz);
        heading.current = lerpAngle(heading.current, Math.atan2(dx, dz), dt * 5);
        curSpeed.current = roverSpeed;
        // update grid pos
        curGrid.current = worldToGrid(nx, nz);
      }
    } else {
      curSpeed.current = 0;
    }

    // Apply to group
    if (roverGroup.current) {
      roverGroup.current.position.copy(worldPos.current);
      roverGroup.current.rotation.y = heading.current;
    }

    // Camera follow
    if (camMode === "follow") {
      const behind = new THREE.Vector3(
        worldPos.current.x - Math.sin(heading.current) * 6,
        worldPos.current.y + 3.5,
        worldPos.current.z - Math.cos(heading.current) * 6
      );
      camera.position.lerp(behind, dt * 3);
      camera.lookAt(worldPos.current);
    } else if (camMode === "top") {
      camera.position.lerp(
        new THREE.Vector3(worldPos.current.x, 18, worldPos.current.z),
        dt * 3
      );
      camera.lookAt(worldPos.current);
    } else if (camMode === "pivot") {
      const { yaw, pitch, dist } = pivotState;
      const px = worldPos.current.x + dist * Math.sin(yaw) * Math.cos(pitch);
      const py = worldPos.current.y + dist * Math.sin(pitch);
      const pz = worldPos.current.z + dist * Math.cos(yaw) * Math.cos(pitch);
      camera.position.lerp(new THREE.Vector3(px, py, pz), dt * 8);
      camera.lookAt(worldPos.current);
    }

    // HUD update every 8 frames
    if (frameN.current % 8 === 0) {
      const hd: Float32Array = (window as any).__heightData;
      const t = (window as any).__terrain as Grid | undefined;
      const cg = curGrid.current;
      const className = t?.[cg.j]?.[cg.i] !== undefined
        ? TC[t[cg.j][cg.i].classId].name
        : "Unknown";

      onHudUpdate({
        x: worldPos.current.x.toFixed(1),
        z: worldPos.current.z.toFixed(1),
        heading: ((heading.current * 180) / Math.PI).toFixed(0),
        speed: curSpeed.current.toFixed(1),
        terrain: className,
        wpt: `${wpIdx.current}/${p.length}`,
      });
    }
  });

  return (
    <>
      <SkyDome />
      <WaterSurface terrain={terrain} />
      <TerrainMesh terrain={terrain} onClickTerrain={handleTerrainClick} />
      <TerrainDetails terrain={terrain} />
      <PathLine path={vizPath} />
      <TargetMarker target={target} />
      <group ref={roverGroup}>
        <RoverBody speed={curSpeed.current} scanning={scanning} />
        <ScanCone active={scanning} />
        <DustCloud roverPosRef={worldPos} />
      </group>
      {showLabels && <ZoneLabels terrain={terrain} />}
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function GameRoverViewer() {
  const [terrainKey, setTerrainKey] = useState<TerrainKey>("mixed");
  const [terrain, setTerrain] = useState<Grid>(() => TERRAIN_GENS.mixed());
  const [target, setTarget] = useState<GPos | null>(null);
  const [camMode, setCamMode] = useState<CamMode>("follow");
  const [roverSpeed, setRoverSpeed] = useState(3);
  const [scanning, setScanning] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [hud, setHud] = useState<HudState>({
    x: "0.0", z: "0.0", heading: "0", speed: "0.0", terrain: "Sand", wpt: "0/0",
  });

  // Rebuild terrain when preset changes
  const switchTerrain = (k: TerrainKey) => {
    setTerrainKey(k);
    const g = TERRAIN_GENS[k]();
    setTerrain(g);
    setTarget(null);
  };

  const legend = TC.map((t) => ({
    name: t.name,
    color: `rgb(${t.rgb[0]},${t.rgb[1]},${t.rgb[2]})`,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <p className="text-xs font-mono text-sand-500 uppercase tracking-widest mb-2">
              // Interactive Rover Sim
            </p>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
              Terrain <span className="text-sand-400">Navigation</span>
            </h2>
            <p className="text-gray-400 mt-2 max-w-xl text-sm">
              Click anywhere on the terrain to send the rover · Real-time A* re-routing ·
              All 10 terrain classes with PBR materials.
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            {(["desert", "rocky", "mixed"] as TerrainKey[]).map((k) => (
              <button
                key={k}
                onClick={() => switchTerrain(k)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded border transition-all ${
                  terrainKey === k
                    ? "bg-sand-600/20 border-sand-400/70 text-sand-300"
                    : "border-sand-700/30 text-sand-500 hover:border-sand-500/60"
                }`}
              >
                {TERRAIN_META[k].label}
              </button>
            ))}
          </div>
        </div>

        {/* Camera + options row */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {(["follow", "top", "pivot"] as CamMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setCamMode(m)}
              className={`px-3 py-1 text-xs font-mono uppercase rounded border transition-all ${
                camMode === m
                  ? "bg-blue-900/30 border-blue-400/60 text-blue-300"
                  : "border-gray-700/40 text-gray-500 hover:border-gray-500"
              }`}
            >
              {m === "follow" ? "🚗 Follow" : m === "top" ? "🛰 Top-Down" : "🖥 Pivot"}
            </button>
          ))}
          <button
            onClick={() => setScanning((s) => !s)}
            className="px-3 py-1 text-xs font-mono uppercase rounded border border-sand-700/30 text-sand-500 hover:border-sand-400 transition-all"
          >
            {scanning ? "🔴 SCAN ON" : "⚫ SCAN OFF"}
          </button>
          <button
            onClick={() => setShowLabels((s) => !s)}
            className="px-3 py-1 text-xs font-mono uppercase rounded border border-sand-700/30 text-sand-500 hover:border-sand-400 transition-all"
          >
            {showLabels ? "🏷 HIDE LABELS" : "🏷 SHOW LABELS"}
          </button>

          {/* Speed slider */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs font-mono text-gray-500">SPEED</span>
            <input
              type="range" min={0.5} max={8} step={0.5}
              value={roverSpeed}
              onChange={(e) => setRoverSpeed(+e.target.value)}
              className="w-24 accent-yellow-500"
            />
            <span className="text-xs font-mono text-sand-400">{roverSpeed.toFixed(1)} m/s</span>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="rounded-xl overflow-hidden border border-sand-700/20 relative"
          style={{ height: "580px", background: "#060810" }}
        >
          {/* HUD Top-Left */}
          <div className="absolute top-3 left-3 z-10 font-mono text-[11px] text-sand-400/80 space-y-0.5 pointer-events-none bg-black/40 px-2 py-1.5 rounded">
            <div>🛰 POS  X:{hud.x}  Z:{hud.z}</div>
            <div>🧭 HDG  {hud.heading}°</div>
            <div>⚡ SPD  {hud.speed} m/s</div>
            <div>🌍 SURF {hud.terrain}</div>
            <div>📍 WPT  {hud.wpt}</div>
          </div>
          {/* HUD Top-Right */}
          <div className="absolute top-3 right-3 z-10 font-mono text-[11px] text-gray-500 text-right pointer-events-none bg-black/40 px-2 py-1.5 rounded">
            <div>CLICK TERRAIN → SET TARGET</div>
            {camMode === "pivot" && <div className="text-blue-400/70">DRAG → LOOK · SCROLL → ZOOM</div>}
            <div>{TERRAIN_META[terrainKey].desc}</div>
          </div>
          {/* Crosshair hint */}
          {!target && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 font-mono text-xs text-sand-500/70 pointer-events-none">
              ↓ Click the terrain to send the rover
            </div>
          )}

          <Canvas
            camera={{ position: [8, 7, 10], fov: 50 }}
            shadows={{ type: THREE.PCFSoftShadowMap }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          >
            <ambientLight intensity={0.3} color="#c8d8c0" />
            <directionalLight
              position={[18, 22, -12]}
              intensity={1.4}
              color="#ffe8c8"
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={0.5}
              shadow-camera-far={80}
              shadow-camera-left={-25}
              shadow-camera-right={25}
              shadow-camera-top={25}
              shadow-camera-bottom={-25}
            />
            <directionalLight position={[-10, 8, 12]} intensity={0.35} color="#8ab8d0" />
            <hemisphereLight args={["#3a5230", "#1a120a", 0.5]} />
            <fog attach="fog" args={["#1a2a18", 28, 58]} />

            <Suspense fallback={<Loader />}>
              <GameController
                terrain={terrain}
                target={target}
                camMode={camMode}
                roverSpeed={roverSpeed}
                scanning={scanning}
                showLabels={showLabels}
                onTargetUpdate={setTarget}
                onHudUpdate={setHud}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {legend.map(({ name, color }) => (
            <div key={name} className="flex items-center gap-1.5 text-[11px] font-mono text-gray-500">
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
              {name}
            </div>
          ))}
        </div>

        {/* Terrain description card */}
        <div className="mt-4 text-center text-xs font-mono text-gray-600">
          Terrain: <span className="text-sand-500">{TERRAIN_META[terrainKey].label}</span>
          &nbsp;·&nbsp; A* pathfinding · Real-time target re-routing · Height-aware navigation
        </div>
      </motion.div>
    </div>
  );
}
