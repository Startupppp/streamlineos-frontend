"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { GlassPanels } from "./glass-panels";
import { MeshBackground } from "./mesh-background";
import { useCursor } from "./use-cursor";

export default function HeroScene() {
  const cursor = useCursor();
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} color="#bfdbfe" />
        <directionalLight position={[-5, -2, 4]} intensity={0.6} color="#06b6d4" />
        <pointLight position={[0, 0, 4]} intensity={1.4} color="#3b82f6" distance={12} />
        <MeshBackground cursor={cursor} />
        <GlassPanels cursor={cursor} />
      </Suspense>
    </Canvas>
  );
}
