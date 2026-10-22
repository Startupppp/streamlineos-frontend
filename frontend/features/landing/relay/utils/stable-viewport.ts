

export const isTouchViewport = (): boolean =>
  typeof window !== "undefined" &&
  (window.matchMedia("(pointer: coarse)").matches ||
    (navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent)));

const largeViewportHeight = (): number => {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const lvh = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(Math.max(lvh, window.innerHeight));
};

const ROTATION_SETTLE_MS = 300;

let width = 0;
let height = 0;
let bound = false;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const publish = (nextHeight: number) => {
  if (nextHeight === height) return;
  height = nextHeight;
  listeners.forEach((listener) => listener());
};

const onResize = () => {
  const nextWidth = window.innerWidth;
  if (isTouchViewport() && nextWidth === width) return;
  width = nextWidth;
  publish(largeViewportHeight());
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => publish(largeViewportHeight()), ROTATION_SETTLE_MS);
};

export const subscribeStableViewport = (listener: () => void): (() => void) => {
  if (!bound) {
    width = window.innerWidth;
    height = largeViewportHeight();
    window.addEventListener("resize", onResize, { passive: true });
    bound = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener("resize", onResize);
    if (settleTimer) clearTimeout(settleTimer);
    bound = false;
  };
};

export const getStableViewportHeight = (): number => height;
