import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DataTexture,
  FloatType,
  LineSegments,
  Mesh,
  NearestFilter,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import type { PagePoint } from "./stream-path";

export const CONFIG = {
  particles: 36000,
  lowShare: 0.45,
  strands: 44,
  flowPx: 90,
  scrollFlow: 1.25,
  spread: 8,
  spreadEnds: 190,
  turnHold: 0.5,
  pinchReach: 300,
  breath: 0.35,
  breathWavelength: 900,
  breathSpeed: 0.6,
  spraySpread: 2.4,
  bokehSpread: 3.2,
  dustSpread: 5.5,
  wobble: 4,
  size: 2.1,
  focal: 0.15,
  dof: 0.55,
  dofSize: 2.2,
  twinkle: 2.4,
  brightness: 0.79,
  heat: 1.2,
  altShare: 0.45,
  altStrands: 0.32,
  lineBase: 0.16,
  lineSpread: 0.9,
  lineWavelength: 1560,
  lineWaveAmp: 0.22,
  lineWaveSpeed: 0.25,
  pulseSpacing: 1130,
  pulseSpeed: 205,
  pulseGain: 1.4,
  pulseSharp: 9,
  parallax: 0.22,
  revealPx: 2600,
  revealMs: 2200,
  bloomStr: 0.68,
  bloomRadius: 0.57,
  bloomThresh: 0.07,
};

export type StreamColors = {
  colMain: string;
  colAlt: string;
  colCore: string;
  colDeep: string;
  colSpark: string;
};

export type Tier = "full" | "low";

const SAMPLES = 2048;
const SEGMENTS = 1400;
const CAM_Z = 6;
const FOV = 35;
const DAMP = 3.2;
const TURN_BASE = 12;
const TURN_HOLD = 28;
const TURN_SMOOTH = 48;
const TURN_OPEN = 1e4;
const REVEALED = 1e7;

const DPR: Record<Tier, number> = { full: 1.35, low: 1.2 };
const BLOOM_SCALE: Record<Tier, number> = { full: 1, low: 0.5 };
const HALF_H = CAM_Z * Math.tan(((FOV / 2) * Math.PI) / 180);

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CURVE_GLSL = /* glsl */ `
  uniform sampler2D uCurve;
  uniform float uHalfH, uCamZ, uPx, uLen;
  uniform vec3 uView; // half viewport width, half height (CSS px), scrollY
  vec4 curveRow(float u, float row) {
    float x = clamp(u, 0.0, 1.0) * ${SAMPLES - 1}.0;
    float i = floor(x);
    float v = (row + 0.5) / 2.0;
    vec4 a = texture2D(uCurve, vec2((i + 0.5) / ${SAMPLES}.0, v));
    vec4 b = texture2D(uCurve, vec2((min(i + 1.0, ${SAMPLES - 1}.0) + 0.5) / ${SAMPLES}.0, v));
    return mix(a, b, x - i);
  }
  // a point offset from the spine: o.x across it (design px), o.y in depth
  vec3 onSpine(float u, vec2 o) {
    vec4 p = curveRow(u, 0.0);
    vec2 n = curveRow(u, 1.0).xy;
    vec2 page = p.xy + n * o.x * uPx * uView.y;
    return vec3(
      (page.x - uView.x) / uView.y,
      (uView.y - (page.y - uView.z)) / uView.y,
      p.z + o.y * uPx
    );
  }
  uniform float uTurnHold, uBreath, uBreathWave, uBreathSpeed, uTimeS;
  // stream radius at u (design px): pinched, breathing, held under the turn
  float widthAt(float u, float pinch, float narrow, float wide) {
    float a = u * uLen;
    float swell = 1.0 + uBreath * sin(a / uBreathWave * 6.2831 - uTimeS * uBreathSpeed);
    float w = mix(wide, narrow, pinch) * swell;
    // a soft min: a hard one kinks the outer strands where it takes over
    float r = max(curveRow(u, 1.0).z * uTurnHold, 1.0);
    return w * r / pow(pow(w, 4.0) + pow(r, 4.0), 0.25);
  }
  vec3 toWorld(vec3 s) {
    float k = (uCamZ - s.z) / uCamZ;
    return vec3(s.x * uHalfH * k, s.y * uHalfH * k, s.z);
  }
`;

const POINTS_VERT = /* glsl */ `
  ${CURVE_GLSL}
  attribute float aU;
  attribute float aSeed;
  attribute float aSize;
  attribute float aKind;
  attribute vec2 aOff;
  uniform float uTime, uFlow, uScrollU, uRevealPx, uFadeIn, uFadeOut, uSpread,
    uSpreadEnds, uSpray, uBokeh, uDust, uWobble, uSize, uScale, uFocal, uDof,
    uDofSize, uTwinkle, uHeat, uAltShare;
  uniform vec3 uColMain, uColAlt, uColCore, uColDeep, uColSpark;
  varying vec3 vColor;
  varying float vBlur;
  void main() {
    float ph = aSeed * 6.2831;
    // stream (0) and spray (1) ride at speed; bokeh (2) and dust (3) drift
    float speed = (aKind < 1.5 ? 1.0 : 0.3) * (0.65 + 0.7 * fract(aSeed * 7.13));
    float u = fract(aU + uTime * uFlow * speed + uScrollU);
    float pinch = curveRow(u, 0.0).w;
    float spread = widthAt(u, pinch, uSpread, uSpreadEnds);
    if (aKind > 2.5) spread *= uDust;
    else if (aKind > 1.5) spread *= uBokeh;
    else if (aKind > 0.5) spread *= uSpray;
    vec2 o = aOff * spread
      + vec2(sin(uTime * 0.7 + ph), cos(uTime * 0.6 + ph * 1.3)) * uWobble;
    vec3 s = onSpine(u, o);
    s.z += position.z; // bokeh sits toward the camera, dust away from it
    float a = u * uLen;
    float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen, uLen - uFadeOut, a)
      * smoothstep(uRevealPx, uRevealPx - 220.0, a);
    float heat = pinch * (aKind < 1.5 ? 1.0 : 0.3);
    // a share of the motes carry the second hue
    vec3 hue = fract(aSeed * 3.77) < uAltShare ? uColAlt : uColMain;
    vec3 base = mix(uColDeep, hue, 0.55 + 0.45 * fract(aSeed * 5.31));
    vec4 mv = modelViewMatrix * vec4(toWorld(s), 1.0);
    float depth = -mv.z;
    float blur = clamp(abs(depth - (uCamZ - uFocal)) * uDof, 0.0, 1.0);
    if (aKind > 1.5 && aKind < 2.5) blur = max(blur, 0.8);
    vBlur = blur;
    float tw = 0.55 + 0.45 * sin(uTime * uTwinkle + ph);
    vec3 c = mix(base, uColCore, clamp(heat * 0.85, 0.0, 1.0)) * (1.0 + heat * uHeat);
    if (fract(aSeed * 13.7) < 0.05) c = uColSpark * 1.3;
    // a blurred mote spreads the same light over a bigger disc
    float spreadOut = 1.0 + blur * uDofSize;
    vColor = c * fade * tw / (spreadOut * spreadOut);
    gl_PointSize = uSize * aSize * uScale * (uCamZ / depth) * spreadOut;
    gl_Position = projectionMatrix * mv;
  }
`;

const POINTS_FRAG = /* glsl */ `
  uniform float uBright;
  varying vec3 vColor;
  varying float vBlur;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    // sharp glint in focus, soft rimmed disc out of it
    float glint = exp(-r * r * 6.0);
    float disc = smoothstep(1.0, 0.6, r) * 0.5
      + smoothstep(0.5, 0.92, r) * (1.0 - smoothstep(0.9, 1.0, r)) * 0.55;
    gl_FragColor = vec4(vColor * mix(glint, disc, vBlur) * uBright, 1.0);
  }
`;

const LINES_VERT = /* glsl */ `
  ${CURVE_GLSL}
  attribute float aU;
  attribute vec4 aStrand; // x normal offset, y depth offset, z phase, w end
  uniform float uTime, uRevealPx, uFadeIn, uFadeOut, uSpread, uSpreadEnds,
    uLineSpread, uLineWavelength, uLineWaveAmp, uLineWaveSpeed, uPulseGain,
    uLineBase, uHeat, uAltStrands;
  uniform vec3 uColMain, uColAlt, uColCore, uColDeep;
  varying vec3 vColor;
  varying vec3 vPulse;
  varying float vA;
  varying float vPhase;
  void main() {
    float u = aU;
    float a = u * uLen;
    float pinch = curveRow(u, 0.0).w;
    float spread = widthAt(u, pinch, uSpread, uSpreadEnds) * uLineSpread;
    float wave = sin(a / uLineWavelength * 6.2831 + aStrand.z + uTime * uLineWaveSpeed) * uLineWaveAmp;
    vec3 s = onSpine(u, vec2(aStrand.x + wave, aStrand.y) * spread);
    float fade = smoothstep(0.0, uFadeIn, a) * smoothstep(uLen * aStrand.w, uLen * aStrand.w - uFadeOut, a)
      * smoothstep(uRevealPx, uRevealPx - 260.0, a);
    // a share of the strands run in the second hue
    vec3 hue = fract(aStrand.z * 1.618) < uAltStrands ? uColAlt : uColMain;
    vec3 c = mix(mix(uColDeep, hue, 0.75), uColCore, pinch * 0.6);
    vColor = c * fade * uLineBase * (1.0 + pinch * uHeat);
    vPulse = c * fade * uPulseGain;
    // the pulse is placed per fragment from the arc length — per vertex it
    // hopped from vertex to vertex
    vA = a;
    vPhase = aStrand.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(toWorld(s), 1.0);
  }
`;

const LINES_FRAG = /* glsl */ `
  uniform float uBright, uPulseSpacing, uPulseShift, uPulseSharp;
  varying vec3 vColor;
  varying vec3 vPulse;
  varying float vA;
  varying float vPhase;
  void main() {
    float p = fract((vA - uPulseShift) / uPulseSpacing + vPhase) - 0.5;
    float pulse = exp(-p * p * uPulseSharp * uPulseSharp);
    gl_FragColor = vec4((vColor + vPulse * pulse) * uBright, 1.0);
  }
`;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export class StreamScene {
  private readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly output: OutputPass;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  private readonly curveData = new Float32Array(SAMPLES * 2 * 4);
  private readonly curve = new DataTexture(
    this.curveData,
    SAMPLES,
    2,
    RGBAFormat,
    FloatType,
  );
  private readonly shared = {
    uCurve: { value: this.curve },
    uHalfH: { value: HALF_H },
    uCamZ: { value: CAM_Z },
    uPx: { value: 1 },
    uLen: { value: 1 },
    uView: { value: new Vector3(1, 1, 0) },
    uTime: { value: 0 },
    uTimeS: { value: 0 },
    uTurnHold: { value: CONFIG.turnHold },
    uBreath: { value: CONFIG.breath },
    uBreathWave: { value: CONFIG.breathWavelength },
    uBreathSpeed: { value: CONFIG.breathSpeed },
    uRevealPx: { value: 0 },
    uFadeIn: { value: 120 },
    uFadeOut: { value: 400 },
    uSpread: { value: CONFIG.spread },
    uSpreadEnds: { value: CONFIG.spreadEnds },
    uHeat: { value: CONFIG.heat },
    uBright: { value: CONFIG.brightness },
    uColMain: { value: new Color() },
    uColAlt: { value: new Color() },
    uAltShare: { value: CONFIG.altShare },
    uColCore: { value: new Color() },
    uColDeep: { value: new Color() },
    uColSpark: { value: new Color() },
  };
  private readonly points: Points;
  private readonly lines: LineSegments;
  private readonly pointsMat: ShaderMaterial;
  private readonly linesMat: ShaderMaterial;
  private path: readonly PagePoint[] = [];
  private tier: Tier = "full";
  private width = 1;
  private height = 1;
  private unit = 1;
  private scrollY = 0;
  private lastScroll = Number.NaN;
  private scrollPx = 0;
  private revealStart = -1;
  private pointer = new Vector2();
  private look = new Vector2();
  private lastTime = -1;

  constructor(canvas: HTMLCanvasElement, colors: StreamColors) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 1);
    this.camera.position.set(0, 0, CAM_Z);

    this.curve.magFilter = NearestFilter;
    this.curve.minFilter = NearestFilter;

    this.setColors(colors);

    this.pointsMat = new ShaderMaterial({
      uniforms: {
        ...this.shared,
        uFlow: { value: 0 },
        uScrollU: { value: 0 },
        uSpray: { value: CONFIG.spraySpread },
        uBokeh: { value: CONFIG.bokehSpread },
        uDust: { value: CONFIG.dustSpread },
        uWobble: { value: CONFIG.wobble },
        uSize: { value: CONFIG.size },
        uScale: { value: 1 },
        uFocal: { value: CONFIG.focal },
        uDof: { value: CONFIG.dof },
        uDofSize: { value: CONFIG.dofSize },
        uTwinkle: { value: CONFIG.twinkle },
      },
      vertexShader: POINTS_VERT,
      fragmentShader: POINTS_FRAG,
      blending: AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.linesMat = new ShaderMaterial({
      uniforms: {
        ...this.shared,
        uPulseShift: { value: 0 },
        uPulseSharp: { value: CONFIG.pulseSharp },
        uAltStrands: { value: CONFIG.altStrands },
        uLineSpread: { value: CONFIG.lineSpread },
        uLineWavelength: { value: CONFIG.lineWavelength },
        uLineWaveAmp: { value: CONFIG.lineWaveAmp },
        uLineWaveSpeed: { value: CONFIG.lineWaveSpeed },
        uPulseSpacing: { value: CONFIG.pulseSpacing },
        uPulseGain: { value: CONFIG.pulseGain },
        uLineBase: { value: CONFIG.lineBase },
      },
      vertexShader: LINES_VERT,
      fragmentShader: LINES_FRAG,
      blending: AdditiveBlending,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.points = new Points(this.buildPoints(), this.pointsMat);
    this.lines = new LineSegments(this.buildLines(), this.linesMat);
    this.points.frustumCulled = false;
    this.lines.frustumCulled = false;
    this.scene.add(this.lines, this.points);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new Vector2(1, 1),
      CONFIG.bloomStr,
      CONFIG.bloomRadius,
      CONFIG.bloomThresh,
    );
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
  }

  private buildPoints() {
    const total = CONFIG.particles;
    const rand = rng(0x5eed1e);
    const gauss = () => rand() + rand() + rand() + rand() - 2;
    const pos = new Float32Array(total * 3);
    const u = new Float32Array(total);
    const seed = new Float32Array(total);
    const size = new Float32Array(total);
    const kind = new Float32Array(total);
    const off = new Float32Array(total * 2);
    for (let i = 0; i < total; i++) {
      const pick = rand();
      const k = pick < 0.79 ? 0 : pick < 0.93 ? 1 : pick < 0.96 ? 2 : 3;
      kind[i] = k;
      u[i] = rand();
      seed[i] = rand();
      off[i * 2] = gauss() * 0.5;
      off[i * 2 + 1] = gauss() * 0.5;
      if (k === 0) size[i] = 0.35 + Math.pow(rand(), 4) * 2.4;
      else if (k === 1) size[i] = 0.3 + rand() * 0.6;
      else if (k === 2) {
        size[i] = 1.2 + rand() * 1.6;
        pos[i * 3 + 2] = 1.0 + rand() * 1.4;
      } else {
        size[i] = 0.25 + rand() * 0.4;
        pos[i * 3 + 2] = -1.2 + rand() * 1.0;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aU", new BufferAttribute(u, 1));
    g.setAttribute("aSeed", new BufferAttribute(seed, 1));
    g.setAttribute("aSize", new BufferAttribute(size, 1));
    g.setAttribute("aKind", new BufferAttribute(kind, 1));
    g.setAttribute("aOff", new BufferAttribute(off, 2));
    return g;
  }

  private buildLines() {
    const n = CONFIG.strands;
    const verts = n * (SEGMENTS + 1);
    const rand = rng(0xf11a);
    const u = new Float32Array(verts);
    const strand = new Float32Array(verts * 4);
    const index = new Uint32Array(n * SEGMENTS * 2);
    let w = 0;
    for (let s = 0; s < n; s++) {
      const nx = (rand() - 0.5) * 2;
      const nz = (rand() - 0.5) * 1.2;
      const phase = rand() * 6.2831;
      const end = 0.93 + rand() * 0.07;
      for (let i = 0; i <= SEGMENTS; i++) {
        const v = s * (SEGMENTS + 1) + i;
        u[v] = i / SEGMENTS;
        strand.set([nx, nz, phase, end], v * 4);
        if (i < SEGMENTS) {
          index[w++] = v;
          index[w++] = v + 1;
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(verts * 3), 3),
    );
    g.setAttribute("aU", new BufferAttribute(u, 1));
    g.setAttribute("aStrand", new BufferAttribute(strand, 4));
    g.setIndex(new BufferAttribute(index, 1));
    return g;
  }

  private bakeCurve() {
    if (this.path.length < 2) return;
    const curve = new CatmullRomCurve3(
      this.path.map(({ x, y, z }) => new Vector3(x, y, z)),
      false,
      "centripetal",
    );
    const length = Math.max(1, curve.getLength());
    const tangent = new Vector3();
    const samples: Vector3[] = [];
    const angles: number[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const p = curve.getPointAt(i / (SAMPLES - 1));
      samples.push(p);
      curve.getTangentAt(i / (SAMPLES - 1), tangent);
      angles.push(Math.atan2(tangent.y, tangent.x));
    }
    const step = length / (SAMPLES - 1);
    const at = (i: number) => Math.min(SAMPLES - 1, Math.max(0, i));
    const radius = angles.map((_, i) => {
      let turn = Math.abs(angles[at(i + TURN_BASE)] - angles[at(i - TURN_BASE)]);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;
      const r = (2 * TURN_BASE * step) / Math.max(1e-4, turn);
      return Math.min(TURN_OPEN, r / this.unit);
    });
    const slideMin = (values: number[], reach: number) =>
      values.map((_, i) => {
        let m = Infinity;
        for (let j = i - reach; j <= i + reach; j++) {
          const v = values[at(j)];
          if (v < m) m = v;
        }
        return m;
      });
    const slideMean = (values: number[], reach: number) =>
      values.map((_, i) => {
        let sum = 0;
        for (let j = i - reach; j <= i + reach; j++) sum += values[at(j)];
        return sum / (2 * reach + 1);
      });
    const held = slideMean(
      slideMean(slideMin(radius, TURN_HOLD), TURN_SMOOTH),
      TURN_SMOOTH,
    );
    angles.forEach((angle, i) => {
      this.curveData.set(
        [-Math.sin(angle), Math.cos(angle), held[i], 0],
        (SAMPLES + i) * 4,
      );
    });
    const peaks = this.path
      .filter(({ pinch }) => pinch > 0)
      .map(({ x, y, pinch }) => {
        let best = 0;
        let bestD = Infinity;
        samples.forEach((p, i) => {
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        });
        return { at: best / (SAMPLES - 1), pinch };
      });
    const reach = CONFIG.pinchReach * this.unit;
    samples.forEach((p, i) => {
      const at = i / (SAMPLES - 1);
      let pinch = 0;
      for (const peak of peaks) {
        const d = ((at - peak.at) * length) / reach;
        pinch = Math.max(pinch, peak.pinch * Math.exp(-d * d));
      }
      this.curveData.set([p.x, p.y, p.z, pinch], i * 4);
    });
    this.curve.needsUpdate = true;
    this.shared.uLen.value = length;
    this.shared.uFadeOut.value = Math.min(length / 4, 400 * this.unit);
    this.pointsMat.uniforms.uFlow.value = (CONFIG.flowPx * this.unit) / length;
  }

  setColors(colors: StreamColors) {
    this.shared.uColMain.value.set(colors.colMain);
    this.shared.uColAlt.value.set(colors.colAlt);
    this.shared.uColCore.value.set(colors.colCore);
    this.shared.uColDeep.value.set(colors.colDeep);
    this.shared.uColSpark.value.set(colors.colSpark);
  }

  setPath(path: readonly PagePoint[]) {
    this.path = path;
    this.bakeCurve();
  }

  retune(tier: Tier) {
    this.tier = tier;
    const share = tier === "low" ? CONFIG.lowShare : 1;
    this.points.geometry.setDrawRange(0, Math.floor(CONFIG.particles * share));
    const strands = Math.ceil(CONFIG.strands * (tier === "low" ? 0.6 : 1));
    this.lines.geometry.setDrawRange(0, strands * SEGMENTS * 2);
    this.resize(this.width, this.height);
  }

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR[this.tier]);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.width, this.height);
    const bloomScale = BLOOM_SCALE[this.tier];
    if (bloomScale !== 1)
      this.bloom.setSize(
        Math.ceil(this.width * dpr * bloomScale),
        Math.ceil(this.height * dpr * bloomScale),
      );
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.unit =
      parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    this.pointsMat.uniforms.uScale.value = this.unit * dpr;
    this.shared.uPx.value = this.unit / (this.height / 2);
    this.shared.uFadeIn.value = 120 * this.unit;
    const lines = this.linesMat.uniforms;
    lines.uLineWavelength.value = CONFIG.lineWavelength * this.unit;
    lines.uPulseSpacing.value = CONFIG.pulseSpacing * this.unit;
    this.shared.uBreathWave.value = CONFIG.breathWavelength * this.unit;
    this.bakeCurve();
  }

  setScroll(y: number) {
    if (!Number.isNaN(this.lastScroll)) {
      this.scrollPx += Math.abs(y - this.lastScroll) * CONFIG.scrollFlow;
    }
    this.lastScroll = y;
    this.scrollY = y;
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y);
  }

  reveal(now: number, instant = false) {
    this.revealStart = instant ? now - CONFIG.revealMs : now;
  }

  async prewarm(yieldToMain: () => Promise<void>) {
    await this.renderer.compileAsync(this.scene, this.camera);
    const passes = new Scene();
    const quad = new PlaneGeometry(2, 2);
    const materials = [
      this.bloom.materialHighPassFilter,
      ...this.bloom.separableBlurMaterials,
      this.bloom.compositeMaterial,
      this.bloom.blendMaterial,
      this.output.material,
      this.composer.copyPass.material,
    ];
    for (const material of materials) passes.add(new Mesh(quad, material));
    await this.renderer.compileAsync(passes, this.camera);
    quad.dispose();
    await yieldToMain();
    this.renderer.render(this.scene, this.camera);
    await yieldToMain();
    this.render(performance.now());
  }

  render(now: number) {
    const dt =
      this.lastTime < 0
        ? 0
        : Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    const k = 1 - Math.exp(-DAMP * dt);
    this.look.lerp(this.pointer, k);
    this.camera.position.set(
      -this.look.x * CONFIG.parallax,
      this.look.y * CONFIG.parallax,
      CAM_Z,
    );
    this.camera.lookAt(0, 0, 0);

    const t =
      this.revealStart < 0
        ? 0
        : Math.min(1, (now - this.revealStart) / CONFIG.revealMs);
    this.shared.uRevealPx.value =
      t >= 1 ? REVEALED : easeOut(t) * CONFIG.revealPx * this.unit;
    this.shared.uTime.value = now / 1000;
    this.shared.uTimeS.value = (now / 1000) % 1000;
    this.shared.uView.value.set(this.width / 2, this.height / 2, this.scrollY);
    const length = this.shared.uLen.value;
    this.pointsMat.uniforms.uScrollU.value = (this.scrollPx / length) % 1;
    const spacing = CONFIG.pulseSpacing * this.unit;
    this.linesMat.uniforms.uPulseShift.value =
      ((now / 1000) * CONFIG.pulseSpeed * this.unit + this.scrollPx) % spacing;
    this.composer.render(dt);
  }

  dispose() {
    this.points.geometry.dispose();
    this.lines.geometry.dispose();
    this.pointsMat.dispose();
    this.linesMat.dispose();
    this.curve.dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
