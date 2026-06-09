"use client";

import { useRef } from "react";
import { Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CursorRef } from "./use-cursor";

type PanelDef = {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  render: () => React.ReactNode;
  driftSeed: number;
};

const panelStyles =
  "h-full w-full rounded-[18px] bg-[#0a1428]/85 border border-[rgba(96,165,250,0.22)] backdrop-blur-xl text-white shadow-[0_30px_80px_-20px_rgba(6,12,40,0.7)]";

const KanbanCard = () => (
  <div className={`${panelStyles} p-5`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          Sprint 24
        </span>
      </div>
      <span className="text-[10px] text-white/40 font-mono">12 / 24</span>
    </div>
    <p className="text-[13px] font-semibold mb-1">Ship onboarding v3</p>
    <p className="text-[11px] text-white/45 mb-4 leading-relaxed">
      Wire offer-letter signing → autocreate user → trigger welcome flow.
    </p>
    <div className="space-y-2">
      {[
        { label: "Schema migration", done: true },
        { label: "Sign flow QA", done: true },
        { label: "Email templates", done: false },
        { label: "Release notes", done: false },
      ].map((t) => (
        <div key={t.label} className="flex items-center gap-2 text-[11px]">
          <div
            className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
              t.done
                ? "bg-blue-500/80 border-blue-400"
                : "border-white/15"
            }`}
          >
            {t.done && <span className="text-[8px] leading-none">✓</span>}
          </div>
          <span className={t.done ? "text-white/40 line-through" : "text-white/80"}>
            {t.label}
          </span>
        </div>
      ))}
    </div>
    <div className="mt-5 flex -space-x-2">
      {["#3b82f6", "#06b6d4", "#8b5cf6"].map((c, i) => (
        <span
          key={i}
          className="h-6 w-6 rounded-full border-2 border-[#0a1428]"
          style={{ background: c }}
        />
      ))}
    </div>
  </div>
);

const CrmFunnel = () => {
  const stages = [
    { label: "New", count: 142, pct: 100, color: "from-blue-400 to-blue-500" },
    { label: "Qualified", count: 86, pct: 78, color: "from-blue-500 to-cyan-500" },
    { label: "Proposal", count: 41, pct: 54, color: "from-cyan-500 to-teal-400" },
    { label: "Closed", count: 18, pct: 30, color: "from-teal-400 to-emerald-400" },
  ];
  return (
    <div className={`${panelStyles} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
          Pipeline · Q2
        </span>
        <span className="text-[10px] text-white/40 font-mono">$2.4M</span>
      </div>
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1 text-[11px]">
              <span className="text-white/80">{s.label}</span>
              <span className="text-white/40 font-mono">{s.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
        <span className="text-white/45">Conversion</span>
        <span className="font-mono text-emerald-400">+12.4%</span>
      </div>
    </div>
  );
};

const AttendanceChart = () => {
  const days = [42, 48, 51, 45, 49, 52, 47, 50, 48, 51, 46, 49];
  const max = Math.max(...days);
  return (
    <div className={`${panelStyles} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/80">
            Attendance
          </span>
          <p className="text-2xl font-bold mt-1">94<span className="text-base text-white/50">%</span></p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
          +2.1%
        </span>
      </div>
      <div className="flex items-end gap-1 h-20">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div
              className="w-full rounded-t bg-gradient-to-t from-blue-600/50 to-cyan-400/80"
              style={{ height: `${(d / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between text-[9px] font-mono text-white/35">
        <span>Mon</span>
        <span>Wed</span>
        <span>Fri</span>
      </div>
      <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-white/40">Present</p>
          <p className="text-white font-semibold">47</p>
        </div>
        <div>
          <p className="text-white/40">WFH</p>
          <p className="text-white font-semibold">8</p>
        </div>
        <div>
          <p className="text-white/40">Leave</p>
          <p className="text-white font-semibold">3</p>
        </div>
      </div>
    </div>
  );
};

const PANELS: PanelDef[] = [
  {
    position: [-2.3, 0.4, 0.6],
    rotation: [0.05, 0.32, -0.05],
    width: 1.95,
    height: 2.6,
    render: KanbanCard,
    driftSeed: 0.3,
  },
  {
    position: [0, -0.1, 1.2],
    rotation: [0, 0, 0],
    width: 2.1,
    height: 2.8,
    render: CrmFunnel,
    driftSeed: 1.4,
  },
  {
    position: [2.3, 0.5, 0.6],
    rotation: [0.05, -0.32, 0.05],
    width: 1.95,
    height: 2.6,
    render: AttendanceChart,
    driftSeed: 2.7,
  },
];

type Props = {
  cursor: React.RefObject<CursorRef>;
};

export function GlassPanels({ cursor }: Props) {
  const group = useRef<THREE.Group>(null);
  const panelRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    if (!group.current) return;
    const c = cursor.current;
    group.current.rotation.y += (c.x * 0.18 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-c.y * 0.12 - group.current.rotation.x) * 0.04;

    panelRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const panel = PANELS[i];
      const t = state.clock.elapsedTime + panel.driftSeed;
      mesh.position.y = panel.position[1] + Math.sin(t * 0.6) * 0.1;
      mesh.rotation.z = panel.rotation[2] + Math.sin(t * 0.4) * 0.015;
    });
  });

  return (
    <group ref={group}>
      {PANELS.map((panel, i) => (
        <group
          key={i}
          ref={(el) => {
            panelRefs.current[i] = el;
          }}
          position={panel.position}
          rotation={panel.rotation}
        >
          <RoundedBox args={[panel.width, panel.height, 0.06]} radius={0.08} smoothness={4}>
            <meshPhysicalMaterial
              color="#0a1428"
              metalness={0.2}
              roughness={0.4}
              transmission={0.15}
              transparent
              opacity={0.6}
              clearcoat={0.6}
              clearcoatRoughness={0.2}
            />
          </RoundedBox>
          <Html
            transform
            occlude={false}
            distanceFactor={2.6}
            position={[0, 0, 0.04]}
            style={{
              width: `${panel.width * 130}px`,
              height: `${panel.height * 130}px`,
              pointerEvents: "none",
            }}
          >
            {panel.render()}
          </Html>
        </group>
      ))}
    </group>
  );
}
