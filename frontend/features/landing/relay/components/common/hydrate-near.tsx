"use client";

import { use, type ReactNode } from "react";

const LOOKAHEAD = "150% 0px 150% 0px";
const ENGAGE_EVENTS = ["pointerdown", "touchstart", "wheel", "keydown", "scroll"] as const;

let engaged = false;
const engageWaiters = new Set<() => void>();
const engage = () => {
  if (engaged) return;
  engaged = true;
  for (const type of ENGAGE_EVENTS) window.removeEventListener(type, engage, true);
  for (const wake of engageWaiters) wake();
  engageWaiters.clear();
};
const onEngaged = (wake: () => void) => {
  if (engaged) {
    wake();
    return;
  }
  if (engageWaiters.size === 0) {
    for (const type of ENGAGE_EVENTS) {
      window.addEventListener(type, engage, { capture: true, passive: true });
    }
  }
  engageWaiters.add(wake);
};

const DESKTOP = "(hover: hover) and (pointer: fine) and (min-width: 901px)";
const queue: Array<() => void> = [];
let idle: "off" | "waiting" | "running" = "off";
const pump = () => {
  idle = "running";
  const open = queue.shift();
  if (!open) {
    idle = "waiting";
    return;
  }
  open();
  if (typeof window.requestIdleCallback === "function")
    window.requestIdleCallback(pump, { timeout: 1500 });
  else window.setTimeout(pump, 50);
};
const enqueue = (open: () => void) => {
  if (idle === "off") {
    const root = document.documentElement;
    if (!("preload" in root.dataset) || !window.matchMedia(DESKTOP).matches)
      return;
    idle = "waiting";
  }
  queue.push(open);
  if (idle === "waiting") {
    idle = "running";
    if (typeof window.requestIdleCallback === "function")
      window.requestIdleCallback(pump, { timeout: 1500 });
    else window.setTimeout(pump, 50);
  }
};

const gates = new Map<string, Promise<void>>();

const gateFor = (id: string): Promise<void> => {
  const known = gates.get(id);
  if (known) return known;
  const gate = new Promise<void>((open) => {
    const el = document.getElementById(id);
    if (!el) {
      open();
      return;
    }
    let io: IntersectionObserver | null = null;
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      io?.disconnect();
      open();
    };
    const watch = (rootMargin: string) => {
      if (done) return;
      io?.disconnect();
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) release();
        },
        { rootMargin },
      );
      io.observe(el);
    };
    watch("0px");
    onEngaged(() => watch(LOOKAHEAD));
    enqueue(release);
  });
  gates.set(id, gate);
  return gate;
};

export const HydrateNear = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => {
  if (typeof window !== "undefined") use(gateFor(id));
  return children;
};
