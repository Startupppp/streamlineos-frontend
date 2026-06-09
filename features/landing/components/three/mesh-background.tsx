"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CursorRef } from "./use-cursor";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform vec2  uResolution;
  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  varying vec2 vUv;

  // 2D simplex noise (Ashima)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * snoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 m = uMouse * 0.25;

    float t = uTime * 0.08;
    vec2 p = uv * 2.4 + vec2(t, -t * 0.6);
    p += m;

    float n  = fbm(p);
    float n2 = fbm(p * 1.7 + vec2(n, -n));
    float mix1 = smoothstep(-0.6, 0.8, n);
    float mix2 = smoothstep(-0.4, 0.9, n2);

    vec3 col = mix(uColorA, uColorB, mix1);
    col = mix(col, uColorC, mix2 * 0.65);

    // Center vignette darken
    float vig = smoothstep(0.95, 0.2, length(uv - 0.5));
    col *= 0.55 + 0.45 * vig;

    // Subtle scan-line shimmer
    float shimmer = 0.04 * sin((uv.y + t) * 220.0);
    col += shimmer * vec3(0.18, 0.35, 0.55);

    gl_FragColor = vec4(col, 1.0);
  }
`;

type Props = {
  cursor: React.RefObject<CursorRef>;
};

export function MeshBackground({ cursor }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uColorA: { value: new THREE.Color("#03060f") },
      uColorB: { value: new THREE.Color("#1e40af") },
      uColorC: { value: new THREE.Color("#06b6d4") },
    }),
    [],
  );

  useFrame((state) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    u.uTime.value = state.clock.elapsedTime;
    const c = cursor.current;
    u.uMouse.value.x += (c.x - u.uMouse.value.x) * 0.04;
    u.uMouse.value.y += (c.y - u.uMouse.value.y) * 0.04;
  });

  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[viewport.width * 1.8, viewport.height * 1.8, 1, 1]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthWrite={false}
      />
    </mesh>
  );
}
