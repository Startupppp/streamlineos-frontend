"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useFrame } from "@/features/landing/relay/hooks/use-frame";
import { useSeen } from "@/features/landing/relay/hooks/use-seen";
import { subscribeToTicker } from "@/features/landing/relay/lib/animation/ticker";
import { readScrollY } from "@/features/landing/relay/lib/scroll-y";
import { isBotClient } from "@/features/landing/relay/utils/bot-ua";
import {
  getStableViewportHeight,
  subscribeStableViewport,
} from "@/features/landing/relay/utils/stable-viewport";
import { LOAD } from "@/features/landing/relay/home/sections/hero/timeline";

import { PATH, resolvePath } from "./stream-path";
import type { StreamColors, StreamScene, Tier } from "./stream-scene";

const COARSE = "(hover: none) and (pointer: coarse)";
const FINE = "(hover: hover) and (pointer: fine)";
const REDUCE = "(prefers-reduced-motion: reduce)";
const STILL_MS = 24000;
const NO_GAP = () => 0;
const serverHeight = () => 0;

const readTier = (): Tier =>
  window.matchMedia(COARSE).matches || window.innerWidth <= 900
    ? "low"
    : "full";

const PRELOAD_FLAGS = ["data-preload", "data-preload-closing"];

const yieldToMain = () =>
  new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === "function")
      window.requestIdleCallback(() => resolve(), { timeout: 800 });
    else window.setTimeout(resolve, 0);
  });

const usePreloaderGone = () => {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setGone(!("preload" in root.dataset || "preloadClosing" in root.dataset));
    read();
    const watch = new MutationObserver(read);
    watch.observe(root, { attributeFilter: PRELOAD_FLAGS });
    return () => watch.disconnect();
  }, []);
  return gone;
};

const useBuildGate = (live: boolean) => {
  const [early, setEarly] = useState(false);
  useEffect(() => {
    if (readTier() !== "full" || !window.matchMedia(FINE).matches) return;
    if (document.readyState === "complete") {
      setEarly(true);
      return;
    }
    const onLoad = () => setEarly(true);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return live || early;
};

const readColors = (el: Element): StreamColors => {
  const style = getComputedStyle(el);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    colMain: token("--stream-main"),
    colAlt: token("--stream-alt"),
    colCore: token("--stream-core"),
    colDeep: token("--stream-deep"),
    colSpark: token("--stream-spark"),
  };
};

export const ParticleStream = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<StreamScene | null>(null);
  const [ready, setReady] = useState(false);
  const frame = useFrame();
  const seen = useSeen(ref);
  const live = usePreloaderGone();
  const buildable = useBuildGate(live);
  const boxHeight = useSyncExternalStore(
    subscribeStableViewport,
    getStableViewportHeight,
    serverHeight,
  );

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !buildable || isBotClient()) return;
    let alive = true;
    let scene: StreamScene | null = null;
    const build = async () => {
      const { StreamScene } = await import("./stream-scene");
      if (!alive) return;
      await yieldToMain();
      if (!alive) return;
      try {
        scene = new StreamScene(canvas, readColors(canvas));
      } catch {
        return;
      }
      await yieldToMain();
      if (!alive) return;
      scene.retune(readTier());
      scene.resize(canvas.clientWidth, canvas.clientHeight);
      scene.setScroll(window.scrollY);
      await scene.prewarm(yieldToMain);
      if (!alive) return;
      sceneRef.current = scene;
      setReady(true);
    };
    void build();
    return () => {
      alive = false;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [buildable]);

  useEffect(() => {
    const canvas = ref.current;
    const scene = sceneRef.current;
    const main = canvas?.closest("main");
    if (!ready || !scene || !main) return;
    let raf = 0;
    const place = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        scene.setPath(resolvePath(PATH[frame], main));
        if (window.matchMedia(REDUCE).matches) scene.render(STILL_MS);
      });
    };
    place();
    const layout = new ResizeObserver(place);
    layout.observe(main);
    return () => {
      cancelAnimationFrame(raf);
      layout.disconnect();
    };
  }, [ready, frame]);

  useEffect(() => {
    const canvas = ref.current;
    const scene = sceneRef.current;
    if (!ready || !scene || !canvas) return;
    const reduce = window.matchMedia(REDUCE);
    const coarse = window.matchMedia(COARSE);
    const fine = window.matchMedia(FINE);
    let tier = readTier();
    let stop: (() => void) | null = null;
    let raf = 0;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;

    const still = () => {
      scene.setScroll(window.scrollY);
      scene.reveal(STILL_MS, true);
      scene.render(STILL_MS);
    };
    const sync = () => {
      const run = live && !document.hidden && !reduce.matches;
      if (run && !stop) {
        stop = subscribeToTicker((time) => {
          scene.setScroll(readScrollY());
          scene.render(time);
        }, NO_GAP);
      } else if (!run && stop) {
        stop();
        stop = null;
      }
      if (reduce.matches) still();
    };
    const onScroll = () => {
      if (!reduce.matches) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(still);
    };
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readTier();
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (next === tier && w === width && h === height) return;
        width = w;
        height = h;
        if (next !== tier) {
          tier = next;
          scene.retune(tier);
        }
        scene.resize(w, h);
        if (reduce.matches) still();
      });
    };
    const onPointer = (e: PointerEvent) => {
      if (reduce.matches || e.pointerType !== "mouse") return;
      scene.setPointer(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1,
      );
    };

    sync();
    window.addEventListener("resize", onResize);
    const unlock = subscribeStableViewport(onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (fine.matches)
      window.addEventListener("pointermove", onPointer, { passive: true });
    coarse.addEventListener("change", onResize);
    reduce.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      stop?.();
      cancelAnimationFrame(raf);
      unlock();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      coarse.removeEventListener("change", onResize);
      reduce.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ready, live]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !seen || !live || !scene) return;
    if (window.matchMedia(REDUCE).matches) return;
    const timer = window.setTimeout(
      () => scene.reveal(performance.now()),
      LOAD.stream,
    );
    return () => window.clearTimeout(timer);
  }, [ready, seen, live]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 h-lvh w-full mix-blend-screen"
      style={boxHeight > 0 ? { height: boxHeight } : undefined}
    />
  );
};
